import re
from typing import List, Dict, Any

def detect_priority(text: str) -> Dict[str, Any]:
    """Détecte une priorité indicative à partir du vocabulaire administratif."""
    if not text:
        return {"priorite": "basse", "score": 0.0, "signaux": []}

    lower = text.lower()
    urgent_kw = [
        "urgent", "urgence", "immédiat", "immediat", "asap", "délai critique",
        "sous 24h", "sous 48h", "prioritaire", "très urgent",
    ]
    medium_kw = ["rappel", "relance", "échéance", "echeance", "dans les meilleurs délais"]

    hits_u = [k for k in urgent_kw if k in lower]
    hits_m = [k for k in medium_kw if k in lower]

    if hits_u:
        return {"priorite": "haute", "score": min(100.0, 60 + 10 * len(hits_u)), "signaux": hits_u}
    if hits_m:
        return {"priorite": "moyenne", "score": min(90.0, 40 + 10 * len(hits_m)), "signaux": hits_m}
    return {"priorite": "basse", "score": 25.0, "signaux": []}


def suggest_actions(text: str, top_direction: str | None = None) -> List[Dict[str, Any]]:
    """Propose des actions métier — toujours à valider par l'agent."""
    actions: List[Dict[str, Any]] = []
    lower = (text or "").lower()
    priority = detect_priority(text)

    if priority["priorite"] == "haute":
        actions.append({
            "code": "traiter_urgent",
            "label": "Traiter en priorité",
            "description": "Des termes d'urgence ont été détectés. Vérifier le délai avant transmission.",
            "confiance": priority["score"],
        })

    if top_direction:
        actions.append({
            "code": "transmettre_direction",
            "label": f"Transmettre vers {top_direction}",
            "description": "Direction proposée d'après le contenu. Confirmer avant envoi.",
            "confiance": 75.0,
        })

    if any(k in lower for k in ["facture", "paiement", "budget", "devis"]):
        actions.append({
            "code": "classer_financier",
            "label": "Classer comme dossier financier",
            "description": "Vocabulaire financier détecté (DAF probable).",
            "confiance": 70.0,
        })

    if any(k in lower for k in ["contrat", "convention", "litige", "juridique"]):
        actions.append({
            "code": "avis_juridique",
            "label": "Solliciter un avis juridique",
            "description": "Termes juridiques détectés — validation humaine recommandée.",
            "confiance": 68.0,
        })

    actions.append({
        "code": "completer_objet",
        "label": "Préremplir l'objet à partir du résumé",
        "description": "Utiliser le résumé IA comme base d'objet (éditable).",
        "confiance": 60.0,
    })

    if not actions:
        actions.append({
            "code": "lire_manuel",
            "label": "Lecture manuelle recommandée",
            "description": "Peu de signaux automatiques — l'agent doit qualifier le courrier.",
            "confiance": 40.0,
        })

    return actions


def draft_reply(objet: str, resume: str, destinataire: str | None = None) -> Dict[str, Any]:
    """Brouillon de réponse administratif — modèle local, non génératif cloud."""
    dest = destinataire or "Madame, Monsieur,"
    body = (
        f"{dest}\n\n"
        f"Nous accusons réception de votre correspondance"
        f"{f' relative à « {objet} »' if objet else ''}.\n\n"
        f"{'Éléments relevés : ' + resume if resume else 'Nous procédons à l’instruction de votre demande.'}\n\n"
        "Nous vous tiendrons informé(e) de la suite donnée dans les meilleurs délais.\n\n"
        "Veuillez agréer, Madame, Monsieur, l’expression de nos salutations distinguées."
    )
    return {
        "sujetPropose": f"RE: {objet}" if objet else "Accusé de réception",
        "corpsPropose": body,
        "avertissement": "Brouillon assisté local — à relire et valider avant envoi.",
        "confiance": 55.0,
    }


def extract_objet_candidate(text: str, resume: str) -> str:
    """Propose un objet court à partir du résumé (accroche) ou des premières lignes."""
    source = (resume or text or "").strip()
    if not source:
        return ""
    # Ignorer les titres de section du résumé formaté
    for line in source.splitlines():
        line = line.strip()
        if not line or line.lower() in {"synthèse", "synthese", "points clés", "points cles", "repères", "reperes"}:
            continue
        if line.startswith("•") or line.startswith("-"):
            line = line.lstrip("•- ").strip()
        first = re.split(r"[.\n]", line)[0].strip()
        if len(first) < 8:
            continue
        if len(first) > 120:
            first = first[:117] + "…"
        return first
    return ""
