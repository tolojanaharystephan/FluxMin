"""
Qualité du texte OCR — évite résumé / objet basés sur du bruit (logos, fragments).
Le texte natif PDF/Office n'est PAS soumis au même seuil que l'OCR image.
"""
from __future__ import annotations

import re
from typing import Optional

PLACEHOLDER_PREFIX = "[Image jointe :"

# Méthodes d'extraction natives (pas de bruit OCR image)
NATIVE_METHODS = frozenset(
    {
        "pdf_text",
        "text",
        "rtf",
        "docx",
        "xlsx",
        "xls",
        "pptx",
        "odt",
        "ods",
        "odp",
        "doc_legacy",
        "ppt_legacy",
    }
)

# Mots fréquents FR/admin — bonus de crédibilité
_TRUST_WORDS = {
    "demande", "courrier", "direction", "ministre", "ministere", "référence",
    "reference", "objet", "madame", "monsieur", "bonjour", "veuillez",
    "transmission", "convention", "budget", "urgent", "priorite", "priorité",
    "formation", "diplome", "diplôme", "informatique", "serveur", "licence",
    "accord", "securite", "sécurité", "partenariat", "patrimoine", "facture",
    "montant", "date", "annexe", "piece", "pièce", "jointe", "dossier",
    "nationale", "ecole", "école", "universite", "université", "memoire",
    "mémoire", "developpeur", "développeur", "profile", "profil", "competence",
    "compétence", "formations", "langues", "canevas", "stage", "jury",
    "sommaire", "remerciements", "chapitre", "partie",
}


def is_placeholder_text(text: str) -> bool:
    t = (text or "").strip()
    return t.startswith(PLACEHOLDER_PREFIX) or "aucun texte lisible" in t.lower()


def _normalize_for_quality(text: str) -> str:
    """Retire leaders de sommaire (....) et bruit typographique avant scoring."""
    cleaned = (text or "").strip()
    cleaned = re.sub(r"[.\u2022·•…]{2,}", " ", cleaned)
    cleaned = re.sub(r"[\\|_~<>={}[\]^`]+", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def ocr_quality_score(text: str) -> float:
    """
    Score 0–100. < 45 ⇒ texte inexploitable pour un résumé métier (OCR image).
    """
    cleaned = (text or "").strip()
    if not cleaned or is_placeholder_text(cleaned):
        return 0.0

    cleaned = _normalize_for_quality(cleaned)

    words = re.findall(r"[A-Za-zÀ-ÿ]{2,}", cleaned)
    if len(words) < 4:
        return 15.0

    long_words = [w for w in words if len(w) >= 4]
    if len(long_words) < 3:
        return 20.0

    letters = sum(1 for c in cleaned if c.isalpha())
    symbols = sum(1 for c in cleaned if not c.isalnum() and not c.isspace())
    if letters < 20:
        return 25.0

    letter_ratio = letters / max(len(cleaned), 1)
    if letter_ratio < 0.45:
        return 30.0

    avg_len = sum(len(w) for w in words) / len(words)
    if avg_len < 3.2:
        return 28.0

    short_ratio = sum(1 for w in words if len(w) <= 2) / len(words)
    if short_ratio > 0.45:
        return 32.0

    score = 50.0
    score += min(25.0, len(long_words) * 2.5)
    score += min(15.0, (avg_len - 3.0) * 5)
    trust_hits = sum(1 for w in words if w.lower() in _TRUST_WORDS)
    score += min(20.0, trust_hits * 5)
    score -= min(20.0, symbols * 0.4)

    return max(0.0, min(100.0, score))


def is_usable_ocr_text(text: str, min_score: float = 45.0) -> bool:
    if is_placeholder_text(text):
        return False
    return ocr_quality_score(text) >= min_score


def is_usable_document_text(
    text: str,
    methode: Optional[str] = None,
    min_score: float = 45.0,
) -> bool:
    """
    Décide si le texte mérite un résumé (LLM ou local).
    - Extraction native PDF/Office : seuil lexical léger (pas de filtre OCR image).
    - OCR image / pdf_ocr : score qualité OCR.
    """
    if is_placeholder_text(text):
        return False
    cleaned = (text or "").strip()
    if len(cleaned) < 20:
        return False

    methode = (methode or "").lower()
    if methode in NATIVE_METHODS:
        norm = _normalize_for_quality(cleaned)
        words = re.findall(r"[A-Za-zÀ-ÿ]{3,}", norm)
        return len(words) >= 8

    return ocr_quality_score(cleaned) >= min_score


def unusable_summary() -> dict:
    accroche = "Aucun texte administratif exploitable dans ce fichier."
    points = [
        "Le contenu extrait est vide, illisible, ou trop bruité pour un résumé fiable.",
        "Préférez un PDF textuel, un fichier Word/Excel, ou une photo nette d'un document écrit.",
        "Vous pouvez tout de même vous appuyer sur l'objet et le corps du courrier.",
    ]
    affichage = (
        "Synthèse\n"
        f"{accroche}\n\n"
        "Points clés\n"
        + "\n".join(f"• {p}" for p in points)
    )
    return {
        "accroche": accroche,
        "pointsCles": points,
        "entites": {"references": [], "dates": [], "montants": [], "emails": []},
        "texteAffichage": affichage,
        "texteCourt": accroche,
    }
