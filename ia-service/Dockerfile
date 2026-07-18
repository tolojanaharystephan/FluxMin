FROM python:3.10-slim

WORKDIR /app

# OCR + PDF : Tesseract dans l'image = même service pour tous les utilisateurs (pas de PATH hôte)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-fra \
    tesseract-ocr-eng \
    poppler-utils \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

ENV TESSERACT_CMD=/usr/bin/tesseract
# Tessdata path varie selon version Debian — laissé à Tesseract si non défini
ENV TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
