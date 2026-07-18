from __future__ import annotations

from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Optional
from app.models.analysis import (
    AnalysisResult,
    TextAnalyzeRequest,
    DraftRequest,
    DraftResult,
    BundleAnalyzeRequest,
    BundleAnalysisResult,
)
from app.services.document_extract_service import extract_document, SUPPORTED_EXTENSIONS
from app.services.nlp_service import clean_extracted_text
from app.services.ocr_quality import (
    is_usable_document_text,
    is_placeholder_text,
    ocr_quality_score,
    unusable_summary,
)
from app.services.llm_service import summarize_with_llm, llm_status, llm_configured
from app.services.routing_service import get_routing_recommendations
from app.services.assist_service import (
    detect_priority,
    suggest_actions,
    draft_reply,
)
from app.services.correspondence_service import analyze_correspondences
from app.services.ocr_engine import ocr_backend_status

router = APIRouter()


def _build_analysis(
    extracted_text: str,
    langue: str,
    score_confiance: float,
    pages_payload: dict,
    methode: Optional[str] = None,
) -> dict:
    cleaned = clean_extracted_text(extracted_text)
    pages = pages_payload or {"pages": [{"page": 1, "text": cleaned}], "texteBrut": cleaned}
    if cleaned and pages.get("texteBrut") != cleaned:
        pages = {**pages, "texteBrut": cleaned}

    unusable = is_placeholder_text(cleaned) or not is_usable_document_text(
        cleaned, methode=methode, min_score=45.0
    )
    quality = ocr_quality_score(cleaned)
    resume_source = "llm"

    if unusable:
        resume = unusable_summary()
        recommendations = []
        priority = {"priorite": "basse", "score": 0.0}
        actions = [
            {
                "code": "lire_manuel",
                "label": "Lecture manuelle du document",
                "description": "Aucun texte fiable extrait — qualifier le courrier à partir de l'objet/corps ou d'une autre PJ.",
                "confiance": 40.0,
            }
        ]
        objet = None
        score_confiance = min(float(score_confiance or 30), 30.0)
        avertissement = (
            "Aucun texte exploitable détecté dans ce fichier. "
            "Ne pas utiliser ce résumé comme objet — validation humaine obligatoire."
        )
        resume_source = "none"
    elif not llm_configured():
        resume = {
            "accroche": "Aucun fournisseur LLM configuré.",
            "pointsCles": [
                "Ajoutez au moins une clé API dans ia-service/.env (Groq, OpenAI, OpenRouter…).",
                "Le résumé local NLP est désactivé — analyse LLM uniquement.",
            ],
            "entites": {"references": [], "dates": [], "montants": [], "emails": []},
            "texteAffichage": (
                "Synthèse\nAucun fournisseur LLM configuré.\n\n"
                "Points clés\n"
                "• Ajoutez au moins une clé API dans ia-service/.env (Groq, OpenAI, OpenRouter…).\n"
                "• Le résumé local NLP est désactivé — analyse LLM uniquement."
            ),
            "texteCourt": "Aucun fournisseur LLM configuré.",
        }
        recommendations = []
        priority = {"priorite": "basse", "score": 0.0}
        actions = []
        objet = None
        score_confiance = 20.0
        avertissement = "LLM requis : aucune clé configurée."
        resume_source = "none"
    else:
        llm_resume = summarize_with_llm(cleaned)
        if llm_resume is None:
            resume = {
                "accroche": "Tous les fournisseurs LLM ont échoué.",
                "pointsCles": [
                    "Saturation, quota ou erreur réseau sur toute la cascade.",
                    "Réessayez dans quelques instants — pas de fallback NLP local.",
                ],
                "entites": {"references": [], "dates": [], "montants": [], "emails": []},
                "texteAffichage": (
                    "Synthèse\nTous les fournisseurs LLM ont échoué.\n\n"
                    "Points clés\n"
                    "• Saturation, quota ou erreur réseau sur toute la cascade.\n"
                    "• Réessayez dans quelques instants — pas de fallback NLP local."
                ),
                "texteCourt": "Tous les fournisseurs LLM ont échoué.",
            }
            recommendations = []
            priority = {"priorite": "basse", "score": 0.0}
            actions = [
                {
                    "code": "lire_manuel",
                    "label": "Lecture manuelle du document",
                    "description": "Cascade LLM indisponible — traiter manuellement.",
                    "confiance": 30.0,
                }
            ]
            objet = None
            score_confiance = 25.0
            avertissement = (
                "Cascade LLM épuisée (pas de résumé local). "
                "Validation humaine obligatoire."
            )
            resume_source = "none"
        else:
            resume = llm_resume
            resume_source = "llm"
            if llm_resume.get("exploitable") is False:
                recommendations = []
                priority = {"priorite": "basse", "score": 0.0}
                actions = [
                    {
                        "code": "lire_manuel",
                        "label": "Lecture manuelle du document",
                        "description": "Le LLM n'a pas trouvé de contenu fiable dans le texte extrait.",
                        "confiance": 40.0,
                    }
                ]
                objet = None
                score_confiance = 30.0
                avertissement = (
                    "LLM : texte non exploitable pour un résumé factuel. "
                    "Validation humaine obligatoire."
                )
                result = {
                    "langue": langue,
                    "scoreConfiance": score_confiance,
                    "prioriteDetecte": priority["priorite"],
                    "prioriteScore": priority["score"],
                    "ocrResult": {
                        "texteExtrait": {
                            "pages": [{"page": 1, "text": resume["accroche"]}],
                            "texteBrut": resume["accroche"],
                        },
                        "resumeAI": resume["texteAffichage"],
                        "resumeStructure": resume,
                    },
                    "recommandations": recommendations,
                    "actionsProposees": actions,
                    "objetPropose": None,
                    "avertissement": avertissement,
                    "resumeSource": resume_source,
                    "llm": llm_status(),
                }
                if methode:
                    result["methodeExtraction"] = methode
                return result

            recommendations = get_routing_recommendations(cleaned)
            priority = detect_priority(cleaned)
            top_dir = recommendations[0]["directionPropose"] if recommendations else None
            actions = suggest_actions(cleaned, top_dir)
            objet = resume.get("objetPropose") or None
            score_confiance = min(92.0, max(55.0, 50.0 + quality / 2))
            avertissement = (
                "Résumé LLM ancré sur le texte extrait (faits vérifiés contre la source). "
                "Validation humaine obligatoire avant usage."
            )
    result = {
        "langue": langue,
        "scoreConfiance": round(score_confiance, 1),
        "prioriteDetecte": priority["priorite"],
        "prioriteScore": priority["score"],
        "ocrResult": {
            "texteExtrait": pages if not unusable else {
                "pages": [{"page": 1, "text": resume["accroche"]}],
                "texteBrut": resume["accroche"],
            },
            "resumeAI": resume["texteAffichage"],
            "resumeStructure": resume,
        },
        "recommandations": recommendations,
        "actionsProposees": actions,
        "objetPropose": objet or None,
        "avertissement": avertissement,
        "resumeSource": resume_source,
        "llm": llm_status(),
    }
    if methode:
        result["methodeExtraction"] = methode
    return result

@router.get("/ocr-status")
def ocr_status():
    return {**ocr_backend_status(), "llm": llm_status()}


@router.post("/", response_model=AnalysisResult)
async def analyze_document(file: UploadFile = File(...)):
    """
    Analyse multi-formats (aligné sur les PJ courrier) :
    PDF/images (OCR), texte, Office, OpenDocument → résumé + routage + actions.
    """
    filename = file.filename or "document"
    ext = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Format « {ext or 'inconnu'} » non supporté. "
                f"Formats acceptés : {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
            ),
        )

    try:
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Fichier vide.")

        extracted = extract_document(file_bytes, filename)
        return _build_analysis(
            extracted["texteExtrait"]["texteBrut"],
            extracted["langue"],
            extracted["scoreConfiance"],
            extracted["texteExtrait"],
            extracted.get("methodeExtraction"),
        )
    except HTTPException:
        raise
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur interne lors du traitement du document : {str(err)}",
        )


@router.post("/text", response_model=AnalysisResult)
async def analyze_text(payload: TextAnalyzeRequest):
    """Analyse un texte déjà disponible (sans OCR)."""
    text = (payload.texte or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Le champ texte est requis.")

    pages = {"pages": [{"page": 1, "text": text}], "texteBrut": text}
    result = _build_analysis(text, "fr", 88.0, pages, "text")
    if payload.objet:
        result["objetPropose"] = payload.objet
    return result


@router.post("/bundle", response_model=BundleAnalysisResult)
async def analyze_bundle(payload: BundleAnalyzeRequest):
    """Analyse croisée de plusieurs documents (textes déjà extraits)."""
    docs = payload.documents or []
    if not docs:
        raise HTTPException(status_code=400, detail="Au moins un document est requis.")

    pieces = [{"nomFichier": d.nomFichier, "texte": d.texte} for d in docs]
    corr = analyze_correspondences(pieces)

    combined = "\n\n".join(
        f"=== {d.nomFichier} ===\n{d.texte}" for d in docs if (d.texte or "").strip()
    )
    base = _build_analysis(
        combined or " ",
        "fr",
        min(95.0, 70.0 + corr["coherenceScore"] * 0.2),
        {"pages": [{"page": 1, "text": combined}], "texteBrut": combined},
        "bundle",
    )
    # Remplacer le résumé par la synthèse dossier
    dossier = corr["resumeDossier"]
    base["ocrResult"]["resumeAI"] = dossier["texteAffichage"]
    base["ocrResult"]["resumeStructure"] = {
        "accroche": dossier.get("accroche") or "",
        "pointsCles": dossier.get("pointsCles") or [],
        "entites": corr.get("entitesGlobales") or {},
        "texteAffichage": dossier.get("texteAffichage") or "",
        "texteCourt": dossier.get("accroche") or "",
    }
    if payload.objetCourrier:
        base["objetPropose"] = payload.objetCourrier

    # Action dédiée
    actions = list(base.get("actionsProposees") or [])
    actions.insert(
        0,
        {
            "code": "verifier_correspondances",
            "label": "Vérifier les correspondances entre PJ",
            "description": f"Cohérence dossier estimée à {corr['coherenceScore']}%. Relire les alertes avant transmission.",
            "confiance": corr["coherenceScore"],
        },
    )
    base["actionsProposees"] = actions

    return {
        **base,
        "nbPieces": corr["nbPieces"],
        "coherenceScore": corr["coherenceScore"],
        "relations": corr["relations"],
        "alertes": corr["alertes"],
        "entitesGlobales": corr["entitesGlobales"],
        "pieces": [
            {
                "nomFichier": p["nomFichier"],
                "resume": p["resume"],
            }
            for p in corr["pieces"]
        ],
        "avertissement": "Analyse multi-pièces indicative — validation humaine obligatoire.",
    }


@router.post("/draft", response_model=DraftResult)
async def generate_draft(payload: DraftRequest):
    """Brouillon de réponse assisté (modèle local / gabarit)."""
    return draft_reply(
        objet=payload.objet or "",
        resume=payload.resume or "",
        destinataire=payload.destinataire,
    )
