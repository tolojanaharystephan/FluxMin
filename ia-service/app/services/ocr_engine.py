"""
Chemins OCR portables : priorité au Tesseract embarqué dans le projet
(ia-service/vendor/tesseract), puis PATH / install système, puis RapidOCR.
"""
from __future__ import annotations

import os
import shutil
import sys
from functools import lru_cache
from pathlib import Path
from typing import List, Optional, Tuple

import pytesseract
from PIL import Image, ImageEnhance, ImageOps
from app.core.config import settings

# ia-service/ (racine du microservice)
IA_SERVICE_ROOT = Path(__file__).resolve().parents[2]
VENDOR_TESSERACT_DIR = IA_SERVICE_ROOT / "vendor" / "tesseract"


def _project_tesseract_candidates() -> List[Path]:
    """Chemins relatifs au projet — indépendants de la machine."""
    base = VENDOR_TESSERACT_DIR
    names = ("tesseract.exe", "tesseract")
    candidates: List[Path] = []
    for name in names:
        candidates.append(base / name)
        candidates.append(base / "bin" / name)
    return candidates


def _system_tesseract_candidates() -> List[Path]:
    if sys.platform.startswith("win"):
        return [
            Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe"),
            Path(r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"),
            Path(os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe")),
        ]
    return [
        Path("/usr/bin/tesseract"),
        Path("/usr/local/bin/tesseract"),
    ]


def _resolve_env_cmd(raw: str) -> Optional[Path]:
    raw = (raw or "").strip().strip('"').strip("'")
    if not raw or raw.lower() in {"auto", "tesseract"}:
        return None

    p = Path(raw)
    if p.is_file():
        return p.resolve()

    rel = (IA_SERVICE_ROOT / raw).resolve()
    if rel.is_file():
        return rel

    cwd_rel = (Path.cwd() / raw).resolve()
    if cwd_rel.is_file():
        return cwd_rel

    return None


def _apply_tessdata_prefix(exe: Path) -> None:
    """Configure TESSDATA_PREFIX pour le Tesseract embarqué."""
    if os.environ.get("TESSDATA_PREFIX"):
        return
    for parent in (exe.parent, exe.parent.parent):
        tessdata = parent / "tessdata"
        if tessdata.is_dir():
            # Tesseract 5 (Windows UB-Mannheim) : chemin du dossier tessdata
            os.environ["TESSDATA_PREFIX"] = str(tessdata)
            return


def resolve_tesseract_cmd() -> Optional[str]:
    env_path = _resolve_env_cmd(settings.TESSERACT_CMD)
    if env_path:
        _apply_tessdata_prefix(env_path)
        return str(env_path)

    for cand in _project_tesseract_candidates():
        if cand.is_file():
            _apply_tessdata_prefix(cand)
            return str(cand.resolve())

    which = shutil.which("tesseract")
    if which:
        return which

    for cand in _system_tesseract_candidates():
        if cand.is_file():
            return str(cand)

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
    source = None
    if tess:
        try:
            resolved = Path(tess).resolve()
            vendor = VENDOR_TESSERACT_DIR.resolve()
            if resolved == vendor / "tesseract.exe" or vendor in resolved.parents:
                source = "project_vendor"
            elif shutil.which("tesseract") and Path(shutil.which("tesseract")).resolve() == resolved:
                source = "path"
            else:
                source = "system_or_env"
        except Exception:
            source = "unknown"
    return {
        "tesseract": bool(tess),
        "tesseractPath": tess,
        "tesseractSource": source,
        "vendorDir": str(VENDOR_TESSERACT_DIR),
        "rapidocr": rapidocr_available(),
    }


def _is_meaningful_text(text: str) -> bool:
    """Filtre le bruit OCR (symboles seuls, logos, fragments)."""
    from app.services.ocr_quality import is_usable_ocr_text

    return is_usable_ocr_text(text, min_score=45.0)

def _variants(img: Image.Image) -> List[Image.Image]:
    """Variantes de prétraitement pour améliorer la détection."""
    base = ImageOps.exif_transpose(img.convert("RGB"))
    w, h = base.size
    target = 1400
    if max(w, h) < target:
        scale = target / max(w, h)
        base = base.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

    gray = base.convert("L")
    auto = ImageOps.autocontrast(gray)
    return [
        base,
        auto,
        ImageEnhance.Contrast(auto).enhance(1.6),
    ]


def _tesseract_pass(img: Image.Image) -> str:
    configs = [
        "--oem 3 --psm 6",
        "--oem 3 --psm 11",
    ]
    best = ""
    for variant in _variants(img):
        for conf in configs:
            for lang in ("fra+eng", "eng"):
                try:
                    text = pytesseract.image_to_string(variant, lang=lang, config=conf)
                except Exception:
                    continue
                cleaned = (text or "").strip()
                if _is_meaningful_text(cleaned) and len(cleaned) > len(best):
                    best = cleaned
                if len(best) >= 60:
                    return best
    return best


def _rapidocr_pass(img: Image.Image) -> str:
    if not rapidocr_available():
        return ""
    import numpy as np

    engine = get_rapidocr_engine()
    best = ""
    for variant in _variants(img)[:4]:
        arr = np.array(variant.convert("RGB"))
        try:
            result, _ = engine(arr)
        except Exception:
            continue
        if not result:
            continue
        lines = [row[1] for row in result if len(row) > 1 and row[1]]
        text = "\n".join(lines).strip()
        if _is_meaningful_text(text) and len(text) > len(best):
            best = text
        if len(best) >= 40:
            break
    return best


def run_ocr_on_image(img: Image.Image) -> Tuple[str, str]:
    """
    OCR robuste : Tesseract (multi-PSM + prétraitement) puis RapidOCR si vide/bruit.
    Retourne (texte, moteur).
    """
    configure_tesseract()
    last_err: Optional[Exception] = None

    if configure_tesseract():
        try:
            text = _tesseract_pass(img)
            if _is_meaningful_text(text):
                return text, "tesseract"
        except Exception as err:
            last_err = err

    try:
        text = _rapidocr_pass(img)
        if _is_meaningful_text(text):
            return text, "rapidocr"
    except Exception as err:
        last_err = err

    if last_err and not configure_tesseract() and not rapidocr_available():
        raise RuntimeError(
            f"OCR indisponible ({last_err}). "
            "Placez Tesseract dans ia-service/vendor/tesseract/ "
            "ou pip install rapidocr-onnxruntime."
        )

    return "", "none"