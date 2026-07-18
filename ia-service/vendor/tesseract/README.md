# FluxMin — emplacement Tesseract embarqué (portable)

Ce dossier doit contenir l’exécutable Tesseract **relatif au projet** :

```
ia-service/vendor/tesseract/
  tesseract.exe          # Windows
  tessdata/              # fra.traineddata, eng.traineddata, …
  … (DLL / libs fournies par l’installateur)
```

## Installation locale (Windows)

Depuis la racine du repo :

```powershell
powershell -ExecutionPolicy Bypass -File .\ia-service\scripts\setup-tesseract.ps1
```

Le script copie une install UB-Mannheim existante, ou télécharge l’installateur portable dans ce dossier.

## Linux / macOS

```bash
./ia-service/scripts/setup-tesseract.sh
```

## Déploiement multi-utilisateurs

Préférer **Docker** : l’image `ia-service` installe déjà `tesseract-ocr` + `tesseract-ocr-fra`.
Tous les utilisateurs passent par le même conteneur — pas de PATH machine.

```bash
docker compose up -d --build ia-service
```

## Résolution du chemin (dynamique)

Ordre dans `ocr_engine.py` :

1. `TESSERACT_CMD` (absolu ou relatif à `ia-service/`)
2. `vendor/tesseract/tesseract(.exe)`
3. `tesseract` dans le PATH
4. Install système classique
5. Fallback **RapidOCR** (pip, sans binaire système)
