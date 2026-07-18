"""
Client LLM multi-fournisseurs pour résumé / infos clés.
Véracité : grounding sur le texte source + validation post-réponse + fallback local.
Failover : cascade auto entre OpenAI / OpenRouter / Claude / xAI / Gemini / Mistral.
"""
from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.services.llm_providers import (
    chat_json_with_failover,
    configured_providers,
    providers_status,
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Tu es un assistant d'analyse de courriers administratifs / ministériels.

Règles STRICTES de véracité (obligatoires) :
1. Utilise UNIQUEMENT le texte fourni par l'utilisateur.
2. N'invente JAMAIS de référence, date, montant, nom, direction ou fait absent du texte.
3. Si une information n'apparaît pas clairement, ne l'inclus pas.
4. Les points clés doivent être des faits reformulés fidèlement (pas de spéculation).
5. Si le texte est du bruit OCR, un logo, ou illisible : exploitable=false.
6. Réponds UNIQUEMENT en JSON valide, sans markdown.

Schéma JSON :
{
  "exploitable": boolean,
  "accroche": "une phrase claire résumant le document (vide si non exploitable)",
  "pointsCles": ["fait 1", "fait 2", "fait 3"],
  "objetPropose": "objet de courrier court ou null",
  "entites": {
    "references": [],
    "dates": [],
    "montants": [],
    "emails": []
  },
  "citations": ["court extrait verbatim du texte justifiant un point"]
}
"""

# Dernier provider utilisé (pour UI / debug)
_LAST_LLM_META: Dict[str, Any] = {}


def llm_configured() -> bool:
    return bool(settings.LLM_ENABLED) and len(configured_providers()) > 0


def llm_status() -> dict:
    status = providers_status()
    if _LAST_LLM_META:
        status["last"] = {
            k: _LAST_LLM_META[k]
            for k in ("id", "name", "model", "ok")
            if k in _LAST_LLM_META
        }
    return status


def _normalize(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"[^\wàâäéèêëïîôùûüç\s\-./@]", "", s, flags=re.I)
    return s.strip()


def _grounded(claim: str, source: str, min_token_overlap: float = 0.45) -> bool:
    """Vérifie qu'une affirmation est ancrée dans le texte source."""
    claim_n = _normalize(claim)
    source_n = _normalize(source)
    if not claim_n or len(claim_n) < 8:
        return False
    if claim_n in source_n:
        return True
    tokens = [t for t in re.findall(r"[a-zàâäéèêëïîôùûüç0-9]{4,}", claim_n) if t]
    if not tokens:
        return False
    hits = sum(1 for t in tokens if t in source_n)
    return (hits / len(tokens)) >= min_token_overlap


def _validate_llm_payload(payload: dict, source: str) -> Dict[str, Any]:
    """Filtre les éléments non ancrés dans le texte (anti-hallucination)."""
    if not payload.get("exploitable"):
        return {
            "exploitable": False,
            "accroche": "",
            "pointsCles": [],
            "objetPropose": None,
            "entites": {"references": [], "dates": [], "montants": [], "emails": []},
            "citations": [],
            "source": "llm",
            "verifie": True,
        }

    points_in = payload.get("pointsCles") or []
    points = [p.strip() for p in points_in if isinstance(p, str) and _grounded(p, source)]
    if not points and points_in:
        points = [
            p.strip()
            for p in points_in
            if isinstance(p, str) and _grounded(p, source, min_token_overlap=0.3)
        ]

    entites_in = payload.get("entites") or {}
    entites: Dict[str, List[str]] = {}
    for key in ("references", "dates", "montants", "emails"):
        vals = entites_in.get(key) or []
        kept = []
        for v in vals:
            if not isinstance(v, str):
                continue
            if _normalize(v) and _normalize(v) in _normalize(source):
                kept.append(v.strip())
        entites[key] = kept[:6]

    accroche = (payload.get("accroche") or "").strip()
    if accroche and not _grounded(accroche, source, min_token_overlap=0.35):
        if not _grounded(accroche, source, min_token_overlap=0.25):
            accroche = points[0] if points else ""

    objet = payload.get("objetPropose")
    if isinstance(objet, str):
        objet = objet.strip() or None
        if objet and not _grounded(objet, source, min_token_overlap=0.3):
            objet = None
    else:
        objet = None

    citations = [
        c.strip()
        for c in (payload.get("citations") or [])
        if isinstance(c, str) and _normalize(c) in _normalize(source)
    ][:5]

    if not accroche and not points:
        return {
            "exploitable": False,
            "accroche": "",
            "pointsCles": [],
            "objetPropose": None,
            "entites": entites,
            "citations": citations,
            "source": "llm",
            "verifie": True,
        }

    return {
        "exploitable": True,
        "accroche": accroche,
        "pointsCles": points[:5],
        "objetPropose": objet,
        "entites": entites,
        "citations": citations,
        "source": "llm",
        "verifie": True,
    }


def _format_resume(data: dict, provider_meta: Optional[dict] = None) -> dict:
    """Aligné sur build_structured_summary / unusable_summary."""
    if not data.get("exploitable"):
        from app.services.ocr_quality import unusable_summary

        out = unusable_summary()
        out["source"] = "llm"
        out["verifie"] = True
        out["exploitable"] = False
        out["objetPropose"] = None
        if provider_meta:
            out["provider"] = provider_meta.get("id")
            out["model"] = provider_meta.get("model")
        return out

    accroche = data.get("accroche") or ""
    points = data.get("pointsCles") or []
    entites = data.get("entites") or {}
    lines = ["Synthèse", accroche, ""]
    if points:
        lines.append("Points clés")
        for p in points:
            lines.append(f"• {p}")
        lines.append("")
    meta_lines: List[str] = []
    if entites.get("references"):
        meta_lines.append("Réf. : " + ", ".join(entites["references"][:3]))
    if entites.get("dates"):
        meta_lines.append("Dates : " + ", ".join(entites["dates"][:3]))
    if entites.get("montants"):
        meta_lines.append("Montants : " + ", ".join(entites["montants"][:3]))
    if meta_lines:
        lines.append("Repères")
        for m in meta_lines:
            lines.append(f"• {m}")
    citations = data.get("citations") or []
    if citations:
        lines.append("")
        lines.append("Extraits sources")
        for c in citations[:3]:
            lines.append(f"« {c[:160]} »")

    out = {
        "accroche": accroche,
        "pointsCles": points,
        "entites": entites,
        "texteAffichage": "\n".join(lines).strip(),
        "texteCourt": accroche,
        "objetPropose": data.get("objetPropose"),
        "citations": citations,
        "source": "llm",
        "verifie": True,
        "exploitable": True,
    }
    if provider_meta:
        out["provider"] = provider_meta.get("id")
        out["model"] = provider_meta.get("model")
    return out


def summarize_with_llm(text: str, timeout: float | None = None) -> Optional[dict]:
    """
    Cascade multi-LLM → résumé structuré vérifié, ou None (fallback local).
    """
    global _LAST_LLM_META

    if not llm_configured():
        return None

    source = (text or "").strip()
    if len(source) < 20:
        return None

    max_chars = int(settings.LLM_MAX_CHARS or 12000)
    if len(source) > max_chars:
        source = source[:max_chars] + "\n…[texte tronqué]"

    user = (
        "Analyse le document suivant et produis le JSON demandé.\n\n"
        "--- TEXTE SOURCE ---\n"
        f"{source}\n"
        "--- FIN ---"
    )

    payload, meta = chat_json_with_failover(
        SYSTEM_PROMPT,
        user,
        task="summarize",
        timeout=timeout,
    )
    _LAST_LLM_META = meta or {}

    if payload is None:
        logger.warning("Cascade LLM épuisée — fallback local : %s", meta)
        return None

    validated = _validate_llm_payload(payload, source)
    return _format_resume(validated, meta)
