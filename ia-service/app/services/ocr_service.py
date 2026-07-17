import io
from typing import Dict, Any, List

from PIL import Image
from pdf2image import convert_from_bytes

from app.services.ocr_engine import run_ocr_on_image


def _prepare_image(img: Image.Image) -> Image.Image:
    if getattr(img, "n_frames", 1) > 1:
        img.seek(0)
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    # Agrandir les petites images (captures / scans légers) pour améliorer OCR
    w, h = img.size
    if max(w, h) < 900:
        scale = 900 / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    return img


def perform_ocr(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    OCR image ou PDF (page par page).
    Utilise Tesseract si présent, sinon RapidOCR.
    """
    full_text = ""
    pages_data: List[Dict[str, Any]] = []
    engines: List[str] = []

    try:
        lower = (filename or "").lower()
        if lower.endswith(".pdf"):
            try:
                images = convert_from_bytes(file_bytes)
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
        if not cleaned:
            raise RuntimeError(
                "Aucun texte détecté dans l'image/PDF. "
                "Vérifiez la netteté du document ou fournissez un fichier texte/Office."
            )

        # Confiance indicative selon moteur
        primary = engines[0] if engines else "unknown"
        score = 90.0 if primary == "tesseract" else 82.0

        return {
            "texteExtrait": {
                "pages": pages_data,
                "texteBrut": cleaned,
            },
            "langue": "fr",
            "scoreConfiance": score,
            "moteurOcr": primary,
        }
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"Erreur lors de l'exécution de l'OCR : {e}") from e
