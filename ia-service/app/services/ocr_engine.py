"""
Configuration OCR : Tesseract (système) avec détection Windows,
fallback RapidOCR (pip) si Tesseract absent.
"""
from __future__ import annotations

import os
import shutil
from functools import lru_cache
from typing import Optional, Tuple

import pytesseract
from app.core.config import settings

_WINDOWS_CANDIDATES = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
    os.path.expandvars(r"%USERPROFILE%\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
]


def resolve_tesseract_cmd() -> Optional[str]:
    """Retourne le chemin exécutable Tesseract si disponible."""
    env_cmd = (settings.TESSERACT_CMD or "").strip()
    if env_cmd and env_cmd.lower() != "tesseract" and os.path.isfile(env_cmd):
        return env_cmd

    which = shutil.which("tesseract")
    if which:
        return which

    for path in _WINDOWS_CANDIDATES:
        if path and os.path.isfile(path):
            return path
    return None


@lru_cache(maxsize=1)
def configure_tesseract() -> Optional[str]:
    cmd = resolve_tesseract_cmd()
    if cmd:
        pytesseract.pytesseract.tesseract_cmd = cmd
    return cmd


@lru_cache(maxsize=1)
def rapidocr_available() -> bool:
    try:
        from rapidocr_onnxruntime import RapidOCR  # noqa: F401

        return True
    except Exception:
        return False


@lru_cache(maxsize=1)
def get_rapidocr_engine():
    from rapidocr_onnxruntime import RapidOCR

    return RapidOCR()


def ocr_backend_status() -> dict:
    tess = configure_tesseract()
    return {
        "tesseract": bool(tess),
        "tesseractPath": tess,
        "rapidocr": rapidocr_available(),
    }


def run_ocr_on_image(img) -> Tuple[str, str]:
    """
    OCR sur une image PIL.
    Retourne (texte, moteur) où moteur ∈ {tesseract, rapidocr}.
    """
    import numpy as np

    tess = configure_tesseract()
    last_err: Optional[Exception] = None

    if tess:
        try:
            try:
                text = pytesseract.image_to_string(img, lang="fra+eng")
            except pytesseract.TesseractError:
                text = pytesseract.image_to_string(img, lang="eng")
            return (text or "").strip(), "tesseract"
        except Exception as err:
            last_err = err

    if rapidocr_available():
        engine = get_rapidocr_engine()
        arr = np.array(img.convert("RGB"))
        result, _ = engine(arr)
        if not result:
            return "", "rapidocr"
        lines = [row[1] for row in result if len(row) > 1 and row[1]]
        return "\n".join(lines).strip(), "rapidocr"

    hint = (
        "Installez Tesseract OCR (https://github.com/UB-Mannheim/tesseract/wiki) "
        "ou définissez TESSERACT_CMD, puis redémarrez ia-service. "
        "Alternative : pip install rapidocr-onnxruntime."
    )
    if last_err:
        raise RuntimeError(f"OCR indisponible ({last_err}). {hint}")
    raise RuntimeError(f"Aucun moteur OCR disponible. {hint}")
