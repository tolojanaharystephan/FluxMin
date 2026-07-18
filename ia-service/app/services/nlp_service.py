"""
Résumé IA lisible : accroche courte + points clés (pas un pavé OCR).
"""
from __future__ import annotations

import re
from typing import Any, Dict, List

STOP_WORDS = {
    "le", "la", "les", "de", "du", "des", "un", "une", "et", "en", "est", "que",
    "qui", "dans", "pour", "par", "sur", "avec", "au", "aux", "ce", "ces", "cette",
    "mais", "ou", "où", "donc", "or", "ni", "car", "se", "sa", "son", "ses",
    "leur", "leurs", "nous", "vous", "il", "elle", "ils", "elles", "je", "tu",
    "page", "the", "and", "for", "with", "from", "that", "this",
}

REF_PATTERNS = [
    re.compile(r"\b(?:réf(?:érence)?|ref|n[°o]|no)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-/._]{2,})", re.I),
    re.compile(r"\b([A-Z]{2,5}[-_/]\d{2,}[-_/]\d{2,})\b"),
]
DATE_PATTERN = re.compile(
    r"\b(\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}|\d{1,2}\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+\d{2,4})\b",
    re.I,
)
AMOUNT_PATTERN = re.compile(
    r"\b(\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?\s*(?:€|EUR|Ariary|Ar|MGA|\$))\b",
    re.I,
)
EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b", re.I)


def clean_extracted_text(text: str) -> str:
    """Nettoie le bruit OCR / marqueurs de page pour la lecture humaine."""
    if not text:
        return ""
    t = text.replace("\r\n", "\n").replace("\r", "\n")
    t = re.sub(r"(?m)^\s*---\s*PAGE\s+\d+\s*---\s*$", "\n", t)
    # Leaders de sommaire PDF (................) — faussent le score qualité
    t = re.sub(r"[.\u2022·•…]{3,}", " ", t)
    t = re.sub(r"[ \t]+\n", "\n", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    # Relier les césures OCR typiques "mot-\nmot"
    t = re.sub(r"(\w)-\n(\w)", r"\1\2", t)
    # Espaces multiples
    t = re.sub(r"[ \t]{2,}", " ", t)
    return t.strip()


def _split_sentences(text: str) -> List[str]:
    # Phrases + lignes significatives (OCR produit souvent des lignes sans point)
    chunks: List[str] = []
    for block in re.split(r"\n+", text):
        block = block.strip(" •-\t")
        if not block:
            continue
        parts = re.split(r"(?<=[.!?])\s+", block)
        for p in parts:
            p = re.sub(r"\s+", " ", p).strip()
            if len(p) >= 25 or (len(p) >= 12 and any(c.isalpha() for c in p)):
                chunks.append(p)
    # Dédupliquer
    seen = set()
    out: List[str] = []
    for c in chunks:
        key = c.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(c)
    return out


def _score_sentence(sentence: str, word_frequencies: Dict[str, float]) -> float:
    words = re.findall(r"\b[a-zA-Zà-ÿÀ-Ÿ]{3,}\b", sentence.lower())
    if not words:
        return 0.0
    score = sum(word_frequencies.get(w, 0.0) for w in words)
    # Bonus longueur raisonnable
    n = len(sentence)
    if 40 <= n <= 220:
        score *= 1.15
    elif n > 320:
        score *= 0.7
    return score


def extract_entities(text: str) -> Dict[str, List[str]]:
    refs = [m.group(1).strip() for m in REF_PATTERNS[0].finditer(text)]
    refs += [m.group(1).strip() for m in REF_PATTERNS[1].finditer(text)]
    dates = [m.group(1).strip() for m in DATE_PATTERN.finditer(text)]
    amounts = [m.group(1).strip() for m in AMOUNT_PATTERN.finditer(text)]
    emails = EMAIL_PATTERN.findall(text)

    def uniq(items: List[str], limit: int = 6) -> List[str]:
        seen = set()
        out: List[str] = []
        for i in items:
            k = i.lower()
            if k in seen:
                continue
            seen.add(k)
            out.append(i)
            if len(out) >= limit:
                break
        return out

    return {
        "references": uniq(refs),
        "dates": uniq(dates),
        "montants": uniq(amounts),
        "emails": uniq(emails, 4),
    }


def build_structured_summary(text: str, num_points: int = 4) -> Dict[str, Any]:
    """
    Produit un résumé actionnable pour l'agent :
    - accroche (1 phrase)
    - pointsCles (puces)
    - entites
    - texteAffichage (prêt UI, bien formaté)
    """
    cleaned = clean_extracted_text(text)
    if not cleaned:
        empty = {
            "accroche": "Aucun texte exploitable pour un résumé.",
            "pointsCles": [],
            "entites": {"references": [], "dates": [], "montants": [], "emails": []},
            "texteAffichage": "Aucun texte exploitable pour un résumé.",
            "texteCourt": "",
        }
        return empty

    sentences = _split_sentences(cleaned)
    words = re.findall(r"\b[a-zA-Zà-ÿÀ-Ÿ]{3,}\b", cleaned.lower())
    freq: Dict[str, float] = {}
    for w in words:
        if w not in STOP_WORDS:
            freq[w] = freq.get(w, 0.0) + 1.0
    if freq:
        mx = max(freq.values())
        freq = {k: v / mx for k, v in freq.items()}

    ranked = sorted(
        ((i, _score_sentence(s, freq)) for i, s in enumerate(sentences)),
        key=lambda x: x[1],
        reverse=True,
    )
    top_idx = sorted([i for i, sc in ranked[: max(num_points, 1)] if sc > 0 or True][:num_points])
    points = [sentences[i] for i in top_idx if i < len(sentences)]

    # Accroche = meilleure phrase courte, sinon première
    accroche = points[0] if points else cleaned[:180].rsplit(" ", 1)[0] + "…"
    if len(accroche) > 200:
        accroche = accroche[:197].rsplit(" ", 1)[0] + "…"

    # Points sans redondance avec l'accroche
    points_cles: List[str] = []
    for p in points:
        compact = p if len(p) <= 180 else p[:177].rsplit(" ", 1)[0] + "…"
        if compact.lower() == accroche.lower() and points_cles:
            continue
        points_cles.append(compact)
        if len(points_cles) >= num_points:
            break

    if len(points_cles) <= 1 and len(sentences) > 1:
        for s in sentences[1:num_points]:
            compact = s if len(s) <= 180 else s[:177].rsplit(" ", 1)[0] + "…"
            if compact not in points_cles:
                points_cles.append(compact)

    entites = extract_entities(cleaned)

    lines = ["Synthèse", accroche, ""]
    if points_cles:
        lines.append("Points clés")
        for p in points_cles:
            lines.append(f"• {p}")
        lines.append("")

    meta_bits: List[str] = []
    if entites["references"]:
        meta_bits.append("Réf. : " + ", ".join(entites["references"][:3]))
    if entites["dates"]:
        meta_bits.append("Dates : " + ", ".join(entites["dates"][:3]))
    if entites["montants"]:
        meta_bits.append("Montants : " + ", ".join(entites["montants"][:3]))
    if meta_bits:
        lines.append("Repères")
        for m in meta_bits:
            lines.append(f"• {m}")

    texte_affichage = "\n".join(lines).strip()

    return {
        "accroche": accroche,
        "pointsCles": points_cles,
        "entites": entites,
        "texteAffichage": texte_affichage,
        "texteCourt": accroche,
    }


def generate_summary(text: str, num_sentences: int = 3) -> str:
    """Compat : renvoie le texte d'affichage formaté."""
    return build_structured_summary(text, num_points=max(3, num_sentences))["texteAffichage"]
