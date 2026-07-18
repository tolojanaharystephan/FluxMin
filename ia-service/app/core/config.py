from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


_IA_ROOT = Path(__file__).resolve().parents[2]
# Chemin relatif portable (résolu dynamiquement dans ocr_engine)
_DEFAULT_TESSERACT = "vendor/tesseract/tesseract.exe"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_IA_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "GEC/GED AI Service"
    API_V1_STR: str = "/api/v1"

    # "auto" | chemin relatif à ia-service/ | chemin absolu
    # Exemple Windows embarqué : vendor/tesseract/tesseract.exe
    # Exemple Linux/Docker     : /usr/bin/tesseract  ou  auto
    TESSERACT_CMD: str = "auto"


settings = Settings()
