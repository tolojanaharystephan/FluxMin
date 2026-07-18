const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const c = new Client({
    connectionString:
      process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/fluxmin',
  });
  await c.connect();
  const r = await c.query(`
    select c.id, c.reference, c.objet, p.nom_fichier, p.chemin_minio
    from courriers c
    left join pieces_jointes p on p.courrier_id = c.id
    order by c.id
  `);
  console.log(JSON.stringify(r.rows, null, 2));

  for (const row of r.rows) {
    if (!row.chemin_minio) continue;
    const abs = path.resolve(process.cwd(), row.chemin_minio);
    console.log('FILE', row.nom_fichier, 'exists=', fs.existsSync(abs), abs);
  }

  // Analyze via HTTP
  const fetch = global.fetch;
  const withPj = r.rows.find((x) => x.id === 25 && x.nom_fichier) || r.rows.find((x) => x.nom_fichier);
  if (!withPj) {
    console.log('No PJ in DB');
    await c.end();
    return;
  }
  const em = await c.query(
    `select u.email from utilisateurs u join courriers c on c.emetteur_id=u.id where c.id=$1`,
    [withPj.id],
  );
  const email = em.rows[0].email;
  console.log('login', email);
  const login = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, motDePasse: 'fluxmin2026' }),
  }).then((x) => x.json());
  const token = login.access_token || login.accessToken;
  const res = await fetch(
    `http://localhost:3001/api/ai/analyze/courriers/${withPj.id}/pieces-jointes`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: '{}',
    },
  );
  const text = await res.text();
  console.log('STATUS', res.status);
  console.log(text.slice(0, 1200));
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
