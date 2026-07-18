"""Génère les PDF de démo attendus par le seed (texte extractible)."""
from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1] / "uploads"

DOCS = {
    "convention_partenariat_culturel.pdf": [
        "CONVENTION DE PARTENARIAT CULTUREL",
        "Reference: MCC-CONV-2026-014",
        "Entre MCC et MINJUS.",
        "Objet: preservation du patrimoine culturel commun.",
        "Destinataire: Direction du Patrimoine Culturel MCC.",
        "Emetteur: Direction du Courrier MINJUS.",
        "Montant previsionnel: 12500 EUR.",
        "Date: 15 mars 2026.",
        "Demande de validation et transmission.",
    ],
    "fiche_technique_serveurs.pdf": [
        "FICHE TECHNIQUE SERVEURS",
        "Reference: MFA-DSI-2026-001",
        "Demande urgente de renouvellement de licence DSI.",
        "Priorite haute - Direction des Systemes d Information.",
    ],
    "accord_securite_interministeriel.pdf": [
        "ACCORD DE SECURITE INTERMINISTERIELLE",
        "Reference: MINJUS-SEC-2026-002",
        "Transmission des dossiers de securite MINJUS / MFA.",
        "Priorite haute - validation Direction Courrier.",
    ],
}


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    for name, lines in DOCS.items():
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        pdf.set_font("Helvetica", size=12)
        for line in lines:
            pdf.cell(0, 8, text=line, new_x="LMARGIN", new_y="NEXT")
        out = ROOT / name
        pdf.output(str(out))
        print(f"OK {out} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
