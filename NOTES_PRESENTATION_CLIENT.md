# FluxMin — Notes de présentation (client / jury)

> **Document isolé** pour consultation hors code.  
> **Sources :** décisions et réponses de session (17–18 juillet 2026) + `PROJECT_RULES.md`.  
> **Usage :** pitch, démo, questions jury / client.

---

## 1. Contexte & vision

**FluxMin** est une plateforme web de **gestion et d’automatisation intelligente des courriers ministériels** (inter- et intra-ministériels).

**Objectifs :**
- Remplacer / suppléer les circuits papier et e-mails non tracés
- Digitaliser, fluidifier et **sécuriser** les flux entre directions et ministères
- Viser un **gain de productivité** (cible : 50–70 % sur le traitement courant)
- Solution **interministérielle** respectant l’autonomie de chaque entité

**Acteurs :** ministères, directions, agents, responsables, agents courrier, auditeurs.  
**Super Admin** = rôle **plateforme** (sans direction, sans messagerie opérationnelle).

**Règle produit :** un module se termine entièrement (backend + frontend + parcours testé, **sans mock**) avant le suivant.

**Flux métier :**
- **Interne :** Direction A → Direction B (même ministère)
- **Externe :** Ministère A → direction d’un autre ministère (à la création / envoi)
- **Transmission :** toute direction **détentrice** peut transmettre, **uniquement en interne** (même ministère). L’ancien modèle « seule la Direction Courrier transmet » a été abandonné.

---

## 2. Décisions produit (Q&A)

| Date | Question | Réponse / décision |
|------|----------|-------------------|
| 17 juil. | Envoi de fichier en discussion : rien ne se passe | Bug chemins Windows + UX : fichier en file d’attente. **Corrigé** ; envoi **immédiat** à la sélection du trombone. |
| 17 juil. | Par quelle étape continuer ? Module complet, pas à moitié | **Ne pas commencer par l’IA.** Ordre M1→M8. Règle : pas de stub. |
| 17 juil. | Pourquoi super admin = agent courrier MFA ? | Bug seed/affichage. **Corrigé** : super admin sans direction ; agent MFA séparé. |
| 17 juil. | Super admin ne doit pas avoir menus messagerie | **Oui.** Menus inbox/envoyés/brouillons/archives et Suggestions IA retirés ; accès URL bloqué. |
| 17 juil. | Audit / anomalies encore mock — indispensable ? | Pas tout de suite ; priorité fichiers (M2), audit en **M4**. |
| 17 juil. | Aligner docs + design Dribbble SaaS | Maintenir `PROJECT_RULES.md` / `TESTS.md` ; UI SaaS moderne, **sans clichés purple/glow** ; accent **teal**. |
| 17 juil. | Upload txt, PPT, Excel ; interne = même ministère | Formats élargis ; destinations internes filtrées au ministère émetteur. |
| 17 juil. | Externe : ne pas voir son ministère en destination | Ministère émetteur exclu de la liste. |
| 17 juil. | Toutes directions peuvent transmettre, en interne seulement | **Règle métier adoptée.** |
| 17 juil. | UI plus colorée (icônes) | Icônes colorées + thème teal. |
| 17 juil. | Auditeur : clignotement dashboard/inbox | Boucle redirect. **Fix :** landing `/audit/search`. |
| 17 juil. | Rapport téléchargeable seulement en JSON | Export **PDF** (+ CSV/JSON) puis **XLSX**. |
| 17 juil. | Notification au destinataire (message discussion) | Notif persistante + badge + WebSocket ; ciblage émetteur ↔ direction destinataire. |
| 17 juil. | Pas de services tiers pour la sécurité ? | **Accord.** Pas SendGrid / Mailgun / Firebase / OpenAI. Email = SMTP interne optionnel ; IA locale ; MinIO self-host (M7). |
| 17 juil. | Que signifie finaliser notifs in-app ? | Toast, JWT WS, filtres, marquage lu. `message_discussion` = type de notif (icône bulle). |
| 17 juil. | Rôle de l’IA avant M6 | **Assistant documentaire local** : OCR, résumé, routage, suggestions. **Validation humaine obligatoire** — pas de décision autonome. |
| 17 juil. | Ne pas restreindre le périmètre IA | Périmètre complet (OCR + résumé + routage + suggestions + rédaction assistée), contrôle humain, scores, audit. |
| 18 juil. | Document de notes + analyser tous formats PJ | Document isolé + extraction multi-formats alignée sur les PJ autorisées. |

---

## 3. Architecture & stack

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 15, TypeScript, Tailwind, shadcn/ui, TanStack Query, Zustand |
| Backend | NestJS, TypeScript |
| Base | PostgreSQL 16 + Drizzle ORM |
| IA | Python FastAPI (`ia-service`) + Tesseract OCR + NLP local |
| Temps réel | Socket.IO, auth **JWT** |
| Fichiers | Disque local (`uploads/…`) ; MinIO prévu M7 |
| Workflow | Temporal.io (prévu M7) |
| Auth | JWT + refresh + RBAC |

**URLs locales :**
- Frontend : `http://localhost:3000`
- API Nest : `http://localhost:3001/api`
- IA : `http://localhost:8000`

**Principes :**
- Le frontend **ne parle pas** directement au Python en prod → **proxy Nest JWT**
- Données sensibles **dans le périmètre** (pas de cloud IA / email tiers)
- Monorepo : `backend/` · `frontend/` · `ia-service/`

**UI :** inspirations FlexFlow (login split brand/form) + Enix (motion flottant / staggered) — teal, Outfit + Plus Jakarta Sans.

---

## 4. Modules livrés et à venir

| Module | Statut | Contenu |
|--------|--------|---------|
| **0–3 Cœur** | ✅ | Auth, RBAC, admin, courriers, messagerie, PJ, archives de base, notifs WS |
| **M1 Pilotage** | ✅ | Dashboard + analytics API ; recherche topbar ⌘K/Ctrl+K |
| **M2 Fichiers & PJ** | ✅ | Upload/download/delete, drag & drop, formats élargis, chemins Windows |
| **M3 Archivage** | ✅ | Durée/emplacement, rétention, scopes, désarchivage |
| **M4 Audit** | ✅ | Search, reports, anomalies ; export CSV / PDF / XLSX / JSON |
| **M5 Notifications** | ✅ | WS JWT, toast, filtres, discussion ; pas d’email SaaS |
| **M6 IA locale** | ✅ | Nest ↔ FastAPI ; suggestions ; analyse **tous formats PJ** ; validation humaine |
| **M7 Temporal / MinIO** | ⏳ | Workflows + stockage objet réel |
| **M8 Durcissement** | ⏳ | Tests critiques, Swagger, rate limit, monitoring |

**Non priorisé immédiatement :** SSO/MFA fort, process mining avancé, K8s/Prometheus prod.

---

## 5. Sécurité & conformité

- **Aucun SaaS tiers** pour courriers, PJ, discussions, IA
- JWT + refresh + RBAC ; WebSocket authentifié par JWT (plus de `userId` en query)
- Audit log (écriture interceptor + consultation M4)
- Super admin isolé du métier courrier
- **IA :** propose uniquement ; l’agent **Accepte / Modifie / Ignore**
- Traçabilité des actions ; archivage avec rétention ; anomalies (délais, workflow)

---

## 6. Comptes démo

**Mot de passe commun :** `fluxmin2026`

| Email | Rôle | Usage démo |
|-------|------|------------|
| `admin@fluxmin.gouv.fr` | Super Admin | Admin, analytics, audit — **pas** messagerie |
| `agent.courrier.mfa@fluxmin.gouv.fr` | Agent Courrier MFA | Cycle courrier, PJ, discussion, archivage |
| `auditeur@fluxmin.gouv.fr` | Auditeur | Landing `/audit/search`, rapports, anomalies |
| `responsable.dsi.mfa@fluxmin.gouv.fr` | Responsable DSI MFA | Pilotage direction |
| `agent.courrier.minjus@fluxmin.gouv.fr` | Agent Courrier MINJUS | Flux inter-ministériels |
| `responsable.daf.minjus@fluxmin.gouv.fr` | Responsable DAF MINJUS | Flux inter-ministériels |

**Parcours démo rapides :**
1. Admin → `/dashboard` chiffres réels ; recherche `MFA`
2. Agent MFA → nouveau courrier → PJ → download / analyse IA
3. Auditeur → recherche audit ; export PDF/XLSX
4. Message discussion → toast + badge chez destinataire
5. `/ai/suggestions` + bouton analyse sur pièce jointe

---

## 7. Limitations & notes techniques (honnêteté jury)

| Sujet | État |
|-------|------|
| Stockage fichiers | Disque local ; MinIO réel = M7 |
| Temporal / Redis / BullMQ | Non branchés métier |
| Email | Pas de SaaS ; SMTP interne optionnel plus tard |
| OCR Windows | Tesseract (+ Poppler pour PDF scannés) recommandé |
| Versioning documents | Non implémenté |
| SSO / MFA fort | Hors scope immédiat |
| Courrier archivé | Discussion en lecture seule |
| Taille max PJ courrier | **50 Mo** (messages discussion : 20 Mo) |

**Formats PJ acceptés :**  
PDF, png/jpg/jpeg/gif/webp, txt/csv/rtf, Word (doc/docx), Excel (xls/xlsx), PowerPoint (ppt/pptx), OpenDocument (odt/ods/odp).

**OCR / déploiement IA :**
- Dev local : Tesseract dans `ia-service/vendor/tesseract/` (chemin relatif, script `setup-tesseract.ps1`)
- Prod / multi-utilisateurs : image Docker `ia-service` avec Tesseract inclus — tous les agents passent par le même service
- Fallback pip : RapidOCR si aucun binaire Tesseract


---

## 8. Arguments de présentation (points forts)

1. **Produit réel, pas maquette** — modules terminés avant le suivant ; écrans branchés API.
2. **Cœur métier opérationnel** — création, envoi, réception, transmission interne, historique, recherche.
3. **Souveraineté des données** — pas de cloud tiers pour IA, email ou stockage sensible.
4. **IA utile et maîtrisée** — assistant local avec validation humaine et traçabilité.
5. **Traçabilité & audit** — logs, rapports PDF/XLSX, anomalies.
6. **Collaboration** — messagerie par courrier, PJ, notifications temps réel.
7. **Pilotage par rôle** — parcours distincts admin / agent / auditeur.
8. **UX professionnelle** — design SaaS 2026 (teal, drag & drop).
9. **Règles métier réalistes** — flux interne/externe, transmission encadrée.
10. **Feuille de route claire** — M7 (Temporal/MinIO), M8 (durcissement prod).

---

## 9. Messages clés en 30 secondes

> « FluxMin digitalise le courrier ministériel de bout en bout : flux tracés, pièces jointes, archivage, audit et notifications. L’IA reste **locale** et **assistive** — elle propose, l’agent décide. Aucune donnée sensible ne sort vers un cloud tiers. »

---

*Document de consultation — juillet 2026. Pour l’état technique vivant du repo, voir aussi `PROJECT_RULES.md` et `TESTS.md`.*
