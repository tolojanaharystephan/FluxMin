"""
Analyse croisée de plusieurs pièces jointes : correspondances, cohérence, alertes.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Set

from app.services.nlp_service import clean_extracted_text, extract_entities, STOP_WORDS
from app.services.llm_service import summarize_with_llm

def _tokens(text: str) -> Set[str]:
    words = re.findall(r"\b[a-zA-Zà-ÿÀ-Ÿ]{4,}\b", (text or "").lower())
    return {w for w in words if w not in STOP_WORDS}

def _jaccard(a: Set[str], b: Set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0

def _resume_for_piece(texte: str, analysis: Any) -> Dict[str, Any]:
    """Résumé LLM uniquement (réutilise l'analyse PJ si déjà présente)."""
    struct = None
    if isinstance(analysis, dict):
        struct = (analysis.get("ocrResult") or {}).get("resumeStructure")
    if isinstance(struct, dict) and struct.get("accroche"):
        return struct
    llm = summarize_with_llm(texte) if texte else None
    if llm:
        return llm
    entites = extract_entities(texte)
    return {
        "accroche": "Résumé LLM indisponible pour cette pièce.",
        "pointsCles": [],
        "entites": entites,
        "texteAffichage": "Résumé LLM indisponible pour cette pièce.",
        "texteCourt": "Résumé LLM indisponible pour cette pièce.",
    }

def analyze_correspondences(pieces: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    pieces: [{ nomFichier, texte, analysis? }]
    """
    normalized: List[Dict[str, Any]] = []
    for p in pieces:
        texte = clean_extracted_text(p.get("texte") or "")
        resume = _resume_for_piece(texte, p.get("analysis"))
        entites = resume.get("entites") or extract_entities(texte)
        normalized.append(
            {
                "nomFichier": p.get("nomFichier") or "document",
                "texte": texte,
                "tokens": _tokens(texte),
                "resume": resume,
                "entites": entites,
                "analysis": p.get("analysis"),
            }
        )

    relations: List[Dict[str, Any]] = []
    for i in range(len(normalized)):
        for j in range(i + 1, len(normalized)):
            a, b = normalized[i], normalized[j]
            score = round(_jaccard(a["tokens"], b["tokens"]) * 100, 1)
            shared_refs = sorted(
                set(a["entites"]["references"]) & set(b["entites"]["references"])
            )
            shared_dates = sorted(set(a["entites"]["dates"]) & set(b["entites"]["dates"]))
            shared_amounts = sorted(
                set(a["entites"]["montants"]) & set(b["entites"]["montants"])
            )
            shared_emails = sorted(set(a["entites"]["emails"]) & set(b["entites"]["emails"]))
            shared_kw = sorted(list(a["tokens"] & b["tokens"]))[:8]

            label = "faible"
            if score >= 35 or shared_refs or shared_amounts:
                label = "forte"
            elif score >= 18 or shared_dates or shared_emails or len(shared_kw) >= 3:
                label = "moyenne"

            relations.append(
                {
                    "fichierA": a["nomFichier"],
                    "fichierB": b["nomFichier"],
                    "scoreSimilarite": score,
                    "niveau": label,
                    "referencesCommunes": shared_refs,
                    "datesCommunes": shared_dates,
                    "montantsCommuns": shared_amounts,
                    "emailsCommuns": shared_emails,
                    "motsClesCommuns": shared_kw,
                }
            )

    all_refs: List[str] = []
    all_dates: List[str] = []
    all_amounts: List[str] = []
    for n in normalized:
        all_refs.extend(n["entites"]["references"])
        all_dates.extend(n["entites"]["dates"])
        all_amounts.extend(n["entites"]["montants"])

    alertes: List[str] = []
    if len(normalized) >= 2:
        strong = [r for r in relations if r["niveau"] == "forte"]
        weak = [r for r in relations if r["niveau"] == "faible" and r["scoreSimilarite"] < 8]
        if not strong and weak and len(weak) == len(relations):
            alertes.append(
                "Peu de correspondance entre les pièces : vérifier qu'elles concernent le même dossier."
            )
        if strong:
            alertes.append(
                f"{len(strong)} paire(s) de documents semblent liées (références ou contenu proches)."
            )

        # Montants divergents sans référence commune
        amounts_sets = [set(n["entites"]["montants"]) for n in normalized if n["entites"]["montants"]]
        if len(amounts_sets) >= 2:
            union = set().union(*amounts_sets)
            inter = set.intersection(*amounts_sets) if amounts_sets else set()
            if union and not inter and not any(r["montantsCommuns"] for r in relations):
                alertes.append(
                    "Montants différents détectés sans montant commun — contrôle manuel recommandé."
                )

    empty_docs = [n["nomFichier"] for n in normalized if len(n["texte"]) < 20]
    for name in empty_docs:
        alertes.append(f"Texte quasi vide pour « {name} » — OCR ou format à vérifier.")

    if not relations:
        coherence = 100.0 if len(normalized) <= 1 else 50.0
    else:
        coherence = round(sum(r["scoreSimilarite"] for r in relations) / len(relations), 1)
        if any(r["referencesCommunes"] for r in relations):
            coherence = min(100.0, coherence + 15)

    accroches = [n["resume"]["accroche"] for n in normalized if n["resume"]["accroche"]]
    points: List[str] = []
    for n in normalized:
        for p in n["resume"]["pointsCles"][:2]:
            points.append(f"{n['nomFichier']} — {p}")
        if len(points) >= 6:
            break

    dossier_lines = [
        "Synthèse du dossier (toutes PJ)",
        accroches[0] if accroches else "Analyse multi-pièces.",
        "",
        "Par document",
    ]
    for n in normalized:
        dossier_lines.append(f"• {n['nomFichier']} : {n['resume']['accroche']}")
    if relations:
        dossier_lines.append("")
        dossier_lines.append("Correspondances")
        for r in sorted(relations, key=lambda x: -x["scoreSimilarite"])[:5]:
            detail = r["niveau"]
            if r["referencesCommunes"]:
                detail += f", réf. {', '.join(r['referencesCommunes'][:2])}"
            dossier_lines.append(
                f"• {r['fichierA']} ↔ {r['fichierB']} ({r['scoreSimilarite']}%, {detail})"
            )

    return {
        "nbPieces": len(normalized),
        "coherenceScore": coherence,
        "relations": relations,
        "alertes": alertes,
        "entitesGlobales": {
            "references": sorted(set(all_refs))[:10],
            "dates": sorted(set(all_dates))[:10],
            "montants": sorted(set(all_amounts))[:10],
        },
        "pieces": [
            {
                "nomFichier": n["nomFichier"],
                "resume": n["resume"],
                "analysis": n.get("analysis"),
            }
            for n in normalized
        ],
        "resumeDossier": {
            "accroche": accroches[0] if accroches else "",
            "pointsCles": points[:6],
            "texteAffichage": "\n".join(dossier_lines).strip(),
        },
    }
