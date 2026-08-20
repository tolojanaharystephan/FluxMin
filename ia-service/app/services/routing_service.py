import re
from typing import List, Dict, Any

DIRECTIONS_KEYWORDS = {
    "Direction des Affaires Financières (DAF)": {
        "budget": 10,
        "facture": 10,
        "paiement": 10,
        "credit": 8,
        "depense": 8,
        "recette": 8,
        "comptabilite": 9,
        "financier": 8,
        "achat": 6,
        "subvention": 7,
        "tva": 9,
        "remboursement": 8,
        "audit": 6,
        "fond": 5,
        "devis": 8,
    },
    "Direction des Ressources Humaines (DRH)": {
        "recrutement": 10,
        "conge": 10,
        "personnel": 8,
        "salaire": 10,
        "contrat de travail": 10,
        "formation": 7,
        "carriere": 8,
        "embauche": 9,
        "stagiaire": 8,
        "retraite": 8,
        "absence": 7,
        "remuneration": 9,
        "syndicat": 6,
        "candidature": 8,
    },
    "Direction des Affaires Juridiques (DAJ)": {
        "litige": 10,
        "convention": 9,
        "loi": 8,
        "decret": 8,
        "reglement": 7,
        "tribunal": 10,
        "avocat": 9,
        "contentieux": 10,
        "juridique": 8,
        "arrete": 8,
        "proces": 10,
        "contrat": 7,
        "clause": 9,
        "conforme": 6,
    },
    "Direction des Systèmes d'Information (DSI)": {
        "informatique": 9,
        "reseau": 8,
        "serveur": 9,
        "logiciel": 8,
        "cyber": 10,
        "securite informatique": 10,
        "application": 7,
        "base de donnees": 8,
        "si": 5,
        "digital": 6,
        "numerique": 6,
        "messagerie": 7,
        "vpn": 8,
    },
}

def get_routing_recommendations(text: str) -> List[Dict[str, Any]]:
    if not text or len(text.strip()) == 0:
        return [
            {
                "directionPropose": "Secrétariat Général (SG)",
                "score": 100.0,
                "justification": "Aucun contenu textuel détecté. Acheminement automatique vers le Secrétariat Général."
            }
        ]

    normalized_text = text.lower()
    recommendations = []
    
    for direction, keywords in DIRECTIONS_KEYWORDS.items():
        score = 0
        detected_keywords = []
        
        for kw, weight in keywords.items():
            # \b évite les correspondances partielles
            pattern = rf'\b{re.escape(kw)}s?\b'
            matches = re.findall(pattern, normalized_text)
            if matches:
                count = len(matches)
                score += weight * count
                detected_keywords.append(f"'{kw}' ({count}x)")
        
        if score > 0:
            normalized_score = min(round((score / 35.0) * 100.0, 2), 100.0)
            
            if normalized_score > 10.0:
                justification = f"Recommandé en raison de la détection des termes : {', '.join(detected_keywords)}."
                recommendations.append({
                    "directionPropose": direction,
                    "score": normalized_score,
                    "justification": justification
                })

    recommendations.sort(key=lambda x: x["score"], reverse=True)

    if not recommendations:
        recommendations.append({
            "directionPropose": "Secrétariat Général (SG)",
            "score": 80.0,
            "justification": "Aucun mot-clé thématique spécifique détecté. Orientation vers le Secrétariat Général par défaut."
        })
    elif recommendations[0]["score"] < 60.0:
        recommendations.append({
            "directionPropose": "Secrétariat Général (SG)",
            "score": 50.0,
            "justification": "Pertinence sémantique générale, le Secrétariat Général peut assurer le dispatching."
        })

    return recommendations
