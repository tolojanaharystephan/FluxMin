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
    """
    Résout TESSERACT_CMD :
    - absolu si fourni
    - relatif à ia-service/ (ex: vendor/tesseract/tesseract.exe)
    """
    raw = (raw or "").strip().strip('"').strip("'")
    if not raw or raw.lower() in {"auto", "tesseract"}:
        return None

    p = Path(raw)
    if p.is_file():
        return p.resolve()

    # Relatif au microservice
    rel = (IA_SERVICE_ROOT / raw).resolve()
    if rel.is_file():
        return rel

    # Relatif au cwd (docker / démarrage depuis ia-service)
    cwd_rel = (Path.cwd() / raw).resolve()
    if cwd_rel.is_file():
        return cwd_rel

    return None


def _apply_tessdata_prefix(exe: Path) -> None:
    """Pointe TESSDATA_PREFIX vers tessdata voisin de l'exécutable projet."""
    if os.environ.get("TESSDATA_PREFIX"):
        return
    for parent in (exe.parent, exe.parent.parent):
        tessdata = parent / "tessdata"
        if tessdata.is_dir():
            # Tesseract attend souvent le parent de tessdata, ou tessdata selon version
            os.environ["TESSDATA_PREFIX"] = str(tessdata)
            return


def resolve_tesseract_cmd() -> Optional[str]:
    """Retourne le chemin exécutable Tesseract (projet > env > PATH > système)."""
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
            if VENDOR_TESSERACT_DIR.resolve() in resolved.parents or resolved.parent == VENDOR_TESSERACT_DIR.resolve():
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
        "Placez Tesseract dans ia-service/vendor/tesseract/ "
        "(script scripts/setup-tesseract.ps1 ou setup-tesseract.sh), "
        "ou utilisez Docker (tesseract inclus dans l'image). "
        "Fallback : pip install rapidocr-onnxruntime."
    )
    if last_err:
        raise RuntimeError(f"OCR indisponible ({last_err}). {hint}")
    raise RuntimeError(f"Aucun moteur OCR disponible. {hint}")
