import io
from typing import Dict, Any, List

from PIL import Image, ImageOps
from pdf2image import convert_from_bytes

from app.services.ocr_engine import run_ocr_on_image
from app.services.ocr_quality import PLACEHOLDER_PREFIX, is_usable_ocr_text

EMPTY_IMAGE_PLACEHOLDER = (
    f"{PLACEHOLDER_PREFIX} aucun texte lisible détecté automatiquement "
    "(logo, photo floue ou scan de trop faible qualité). "
    "Compléter manuellement ou fournir un PDF/Office textuel.]"
)


def _prepare_image(img: Image.Image) -> Image.Image:
    img = ImageOps.exif_transpose(img)
    if getattr(img, "n_frames", 1) > 1:
        img.seek(0)
    if img.mode in ("RGBA", "P"):
        # Fond blanc sous transparence (évite OCR noir sur noir)
        background = Image.new("RGB", img.size, (255, 255, 255))
        rgba = img.convert("RGBA")
        background.paste(rgba, mask=rgba.split()[3])
        img = background
    elif img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    return img


def perform_ocr(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    OCR image ou PDF (page par page).
    Ne lève plus d'erreur fatale si aucun texte : placeholder + score bas.
    """
    full_text = ""
    pages_data: List[Dict[str, Any]] = []
    engines: List[str] = []

    try:
        lower = (filename or "").lower()
        if lower.endswith(".pdf"):
            try:
                images = convert_from_bytes(file_bytes, dpi=250)
            except Exception as pdf_err:
                raise RuntimeError(
                    f"Erreur conversion PDF : {pdf_err}. "
                    "Installez Poppler et assurez-vous qu'il est dans le PATH."
                )

            for idx, img in enumerate(images):
                page_num = idx + 1
                prepared = _prepare_image(img)
                text, engine = run_ocr_on_image(prepared)
                engines.append(engine)
                pages_data.append({"page": page_num, "text": text})
                full_text += f"\n--- PAGE {page_num} ---\n{text}"
        else:
            img = Image.open(io.BytesIO(file_bytes))
            prepared = _prepare_image(img)
            text, engine = run_ocr_on_image(prepared)
            engines.append(engine)
            pages_data.append({"page": 1, "text": text})
            full_text = text

        cleaned = full_text.strip()
        # Bruit OCR (logo) traité comme vide
        if cleaned and not is_usable_ocr_text(cleaned, min_score=45.0):
            cleaned = ""
        empty = not cleaned
        if empty:
            cleaned = EMPTY_IMAGE_PLACEHOLDER
            pages_data = [{"page": 1, "text": cleaned}]

        primary = engines[0] if engines else "unknown"
        if empty:
            score = 25.0
            primary = "none"
        elif primary == "tesseract":
            score = 90.0
        elif primary == "rapidocr":
            score = 82.0
        else:
            score = 60.0

        return {
            "texteExtrait": {
                "pages": pages_data,
                "texteBrut": cleaned,
            },
            "langue": "fr",
            "scoreConfiance": score,
            "moteurOcr": primary,
            "texteVide": empty,
        }
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"Erreur lors de l'exécution de l'OCR : {e}") from e
