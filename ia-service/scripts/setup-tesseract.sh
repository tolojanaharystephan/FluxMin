#!/usr/bin/env bash
# FluxMin — prépare vendor/tesseract sur Linux (lien ou copie depuis le système)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IA_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET="$IA_ROOT/vendor/tesseract"

mkdir -p "$TARGET/bin" "$TARGET/tessdata"

if command -v tesseract >/dev/null 2>&1; then
  TESS="$(command -v tesseract)"
  echo "Tesseract systeme : $TESS"
  ln -sfn "$TESS" "$TARGET/tesseract"
  ln -sfn "$TESS" "$TARGET/bin/tesseract"
  # tessdata courant
  for td in /usr/share/tesseract-ocr/*/tessdata /usr/share/tessdata; do
    if [[ -d "$td" ]]; then
      ln -sfn "$td" "$TARGET/tessdata-system"
      # copie des langues si absentes
      for lang in fra eng osd; do
        if [[ -f "$td/${lang}.traineddata" && ! -f "$TARGET/tessdata/${lang}.traineddata" ]]; then
          cp -n "$td/${lang}.traineddata" "$TARGET/tessdata/" || true
        fi
      done
      break
    fi
  done
  echo "OK — lien portable : $TARGET/tesseract"
  "$TARGET/tesseract" --version | head -n 2
else
  echo "tesseract non installe. Sur Debian/Ubuntu :"
  echo "  sudo apt-get update && sudo apt-get install -y tesseract-ocr tesseract-ocr-fra"
  echo "Puis relancez ce script."
  echo "En production : docker compose up -d --build ia-service (Tesseract inclus)."
  exit 1
fi

echo ""
echo "Utilisez TESSERACT_CMD=auto ou vendor/tesseract/tesseract"
