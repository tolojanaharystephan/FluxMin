import json
import os
import urllib.request

import psycopg2

base = "http://localhost:3001/api"
conn = psycopg2.connect(
    os.getenv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/fluxmin")
)
cur = conn.cursor()
cur.execute(
    """
    select c.id, c.reference, c.objet, p.id, p.nom_fichier, p.chemin_minio
    from courriers c
    left join pieces_jointes p on p.courrier_id = c.id
    order by c.id
    """
)
rows = cur.fetchall()
print("COURRIERS+PJ:")
for r in rows:
    print(r)

# pick first with PJ named convention or any with PJ
target = next((r for r in rows if r[3] and r[4] and "convention" in (r[4] or "")), None)
if not target:
    target = next((r for r in rows if r[3]), None)
print("TARGET", target)

login_email = "admin@fluxmin.gouv.fr"
req = urllib.request.Request(
    base + "/auth/login",
    data=json.dumps({"email": login_email, "motDePasse": "fluxmin2026"}).encode(),
    headers={"Content-Type": "application/json"},
)
login = json.loads(urllib.request.urlopen(req).read())
token = login.get("access_token") or login.get("accessToken")

# auditeur/admin may not analyze - use agent that owns the courrier
cur.execute(
    """
    select u.email from utilisateurs u
    join courriers c on c.emetteur_id = u.id
    where c.id = %s
    """,
    (target[0],),
)
email = cur.fetchone()[0]
print("login as", email)
req = urllib.request.Request(
    base + "/auth/login",
    data=json.dumps({"email": email, "motDePasse": "fluxmin2026"}).encode(),
    headers={"Content-Type": "application/json"},
)
login = json.loads(urllib.request.urlopen(req).read())
token = login.get("access_token") or login.get("accessToken")

cid = target[0]
r = urllib.request.Request(
    base + f"/ai/analyze/courriers/{cid}/pieces-jointes",
    data=b"{}",
    method="POST",
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
)
try:
    res = json.loads(urllib.request.urlopen(r, timeout=180).read())
    print("OK", res.get("nbPieces"), res.get("analysis", {}).get("coherenceScore"))
    print((res.get("analysis") or {}).get("ocrResult", {}).get("resumeAI", "")[:500])
    for p in res.get("pieces") or []:
        print(" piece", p.get("nomFichier"), p.get("ok"), p.get("error"))
except urllib.error.HTTPError as e:
    print("ERR", e.read().decode())
