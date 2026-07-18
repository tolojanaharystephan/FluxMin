from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


_IA_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_IA_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "GEC/GED AI Service"
    API_V1_STR: str = "/api/v1"

    # Tesseract — "auto" | chemin relatif ia-service/ | absolu
    TESSERACT_CMD: str = "auto"

    # LLM global
    LLM_ENABLED: bool = True
    # max = meilleur modèle d'abord ; economy = moins cher d'abord ; balanced = max
    LLM_STRATEGY: str = "max"
    # Ordre forcé optionnel, ex: groq,openai,anthropic,openrouter,gemini,xai,mistral
    LLM_PROVIDER_ORDER: str = ""
    LLM_TIMEOUT_SECONDS: float = 45.0
    LLM_MAX_CHARS: int = 12000

    # Compat mono-provider (legacy)
    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = "https://api.openai.com/v1"
    LLM_MODEL: str = "gpt-4o-mini"

    # GroqCloud (OpenAI-compatible) — https://console.groq.com/keys
    GROQ_API_KEY: str = ""
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = "gpt-4o-mini"

    # OpenRouter
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL: str = "openai/gpt-4o-mini"

    # Anthropic (Claude)
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_BASE_URL: str = "https://api.anthropic.com"
    ANTHROPIC_MODEL: str = "claude-3-5-haiku-latest"

    # xAI (Grok)
    XAI_API_KEY: str = ""
    XAI_BASE_URL: str = "https://api.x.ai/v1"
    XAI_MODEL: str = "grok-2-1212"

    # Google Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # Mistral
    MISTRAL_API_KEY: str = ""
    MISTRAL_BASE_URL: str = "https://api.mistral.ai/v1"
    MISTRAL_MODEL: str = "mistral-small-latest"


settings = Settings()
