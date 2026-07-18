from pydantic import BaseModel, ConfigDict, Field
from typing import List, Dict, Any, Optional


class ResumeStructureSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    accroche: str = ""
    pointsCles: List[str] = Field(default_factory=list)
    entites: Dict[str, List[str]] = Field(default_factory=dict)
    texteAffichage: str = ""
    texteCourt: str = ""
    objetPropose: Optional[str] = None
    citations: List[str] = Field(default_factory=list)
    source: Optional[str] = None
    verifie: Optional[bool] = None
    exploitable: Optional[bool] = None


class OCRResultSchema(BaseModel):
    texteExtrait: Dict[str, Any]
    resumeAI: str
    resumeStructure: Optional[ResumeStructureSchema] = None


class RecommendationSchema(BaseModel):
    directionPropose: str
    score: float
    justification: str


class ActionSuggestionSchema(BaseModel):
    code: str
    label: str
    description: str
    confiance: float


class AnalysisResult(BaseModel):
    langue: str
    scoreConfiance: float
    prioriteDetecte: str
    prioriteScore: float = 0.0
    ocrResult: OCRResultSchema
    recommandations: List[RecommendationSchema]
    actionsProposees: List[ActionSuggestionSchema] = Field(default_factory=list)
    objetPropose: Optional[str] = None
    avertissement: str = (
        "Suggestions générées localement — validation humaine obligatoire."
    )
    methodeExtraction: Optional[str] = None
    resumeSource: Optional[str] = None  # "llm" | "local"
    llm: Optional[Dict[str, Any]] = None


class TextAnalyzeRequest(BaseModel):
    texte: str
    objet: Optional[str] = None


class DraftRequest(BaseModel):
    objet: Optional[str] = None
    resume: Optional[str] = None
    destinataire: Optional[str] = None


class DraftResult(BaseModel):
    sujetPropose: str
    corpsPropose: str
    avertissement: str
    confiance: float


class BundleDocument(BaseModel):
    nomFichier: str
    texte: str


class BundleAnalyzeRequest(BaseModel):
    documents: List[BundleDocument]
    objetCourrier: Optional[str] = None


class CorrespondenceRelation(BaseModel):
    fichierA: str
    fichierB: str
    scoreSimilarite: float
    niveau: str
    referencesCommunes: List[str] = Field(default_factory=list)
    datesCommunes: List[str] = Field(default_factory=list)
    montantsCommuns: List[str] = Field(default_factory=list)
    emailsCommuns: List[str] = Field(default_factory=list)
    motsClesCommuns: List[str] = Field(default_factory=list)


class BundleAnalysisResult(BaseModel):
    langue: str = "fr"
    scoreConfiance: float
    prioriteDetecte: str
    prioriteScore: float = 0.0
    ocrResult: OCRResultSchema
    recommandations: List[RecommendationSchema] = Field(default_factory=list)
    actionsProposees: List[ActionSuggestionSchema] = Field(default_factory=list)
    objetPropose: Optional[str] = None
    avertissement: str = (
        "Analyse multi-pièces indicative — validation humaine obligatoire."
    )
    nbPieces: int = 0
    coherenceScore: float = 0.0
    relations: List[CorrespondenceRelation] = Field(default_factory=list)
    alertes: List[str] = Field(default_factory=list)
    entitesGlobales: Dict[str, List[str]] = Field(default_factory=dict)
    pieces: List[Dict[str, Any]] = Field(default_factory=list)
