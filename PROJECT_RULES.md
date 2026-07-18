# FluxMin – Plateforme de Gestion et d'Automatisation Intelligente des Courriers Ministériels

## Version du document : 2.0
## Dernière mise à jour : 18 juillet 2026 — M1–M7 ✅ · MG ✅ · M8 Durcissement (socle local) ✅

---

## État d'avancement produit (réel)

| Module | Statut | Contenu |
|--------|--------|---------|
| 0–3 Cœur (auth, admin, courriers, notifs, messagerie) | ✅ | Opérationnel |
| **M1 Pilotage** (dashboard + analytics + recherche topbar) | ✅ | Données API réelles, plus de mocks |
| **M2 Fichiers & pièces jointes** | ✅ | Chemins Windows corrects, upload création + détail, download, suppression, UI SaaS |
| **M3 Archivage complet** | ✅ | Scopes accès, dialogue durée/emplacement, rétention (expire bientôt/expiré), désarchivage détail + liste |
| **M4 Audit lecture** (search / reports / anomalies) | ✅ | APIs réelles + UI branchée ; logs interceptor ; rapports générés ; anomalies délai/workflow |
| **M5 Notifications produit** | ✅ | In-app : WS JWT, toast, filtres, messages discussion ; pas de SaaS email tiers (SMTP interne optionnel plus tard) |
| **M6 IA bout-en-bout** | ✅ | Nest→FastAPI ; OCR local ; résumé/infos clés LLM multi-fournisseurs ; validation humaine |
| **MG Communications Gouvernement** | ✅ | Rôle `gouvernement` ; posts publics/ciblés ; PJ ; notifs ; AR/réponses par **directeur de ministère** uniquement |
| **M7 Hyperautomation** | ✅ | **M7a** MinIO · **M7b** Temporal · **M7c** process mining |
| **M8 Durcissement** | ✅ | Socle local : Swagger `/api/docs`, rate limit, helmet, `GET /api/health`, tests critiques |

### M8 — Durcissement (socle local, sans Docker)

- Swagger UI : `http://localhost:3001/api/docs` (désactivable en prod sauf `SWAGGER_ENABLED=true`)
- Rate limit global 60 req/min ; login/register 10 req/min
- Helmet + CORS (`FRONTEND_URL`)
- Health public : `GET /api/health` (ping Postgres)
- Tests Jest : health, RolesGuard, auth login invalide, throttler config

### M7 — Hyperautomation (livré)

- **MinIO** : `StorageService` S3 ; bucket auto ; fallback disque si MinIO down ; clés `courriers/…`, `messages/…`, `publications/…`
- **Temporal** : workflow `courrierSuiviWorkflow` (relance puis escalade) ; start à l’envoi/transmission ; cancel à AR/archivage
- **Process mining** : `GET /stats/process-mining` + section Analytics (volumes, transitions, délais moyens)
- Env : voir [`backend/.env.example`](backend/.env.example) ; console MinIO `:9001` ; Temporal UI (compose)

### Rôles organisationnels (MAJ)

- `super_admin` : admin **plateforme** technique (pas de réponse aux publications gouvernement)
- `directeur_ministere` : ex-`admin_ministere` — **un par ministère**, rattaché au **ministère uniquement** (`ministereId`, **sans direction**) ; seul à AR / répondre aux posts gouvernement **ciblés**
- `gouvernement` : publie actualités (public ou ministère), PJ, archive

**Règle :** un module se termine (backend + frontend + parcours testé, sans mock) avant le suivant.

**Direction UI :** inspirations SaaS modernes — surfaces propres, drag & drop, hiérarchie claire ; éviter les clichés purple/glow.

**Références design actives :**
- Login / auth : [FlexFlow SaaS Login Experience](https://dribbble.com/shots/27446988-FlexFlow-SaaS-Login-Experience) — split brand/form, profondeur atmosphérique, surface formulaire glass
- Motion : [Enix Animation](https://dribbble.com/shots/17013531-Enix-Animation) — flottements doux, entrées staggered, micro-interactions spring

---

## 1. Introduction

### 1.1 Objectif général
Développer une plateforme web sécurisée de gestion des courriers et documents administratifs inter- et intra-ministériels, combinée à une couche d'hyperautomation par IA, afin de digitaliser, fluidifier et sécuriser les flux d'information au sein et entre les ministères.

### 1.2 Objectifs spécifiques
- Remplacer/suppléer les circuits papier et emails classiques par un système tracé et normé
- Automatiser les tâches répétitives (classification, extraction, suggestions)
- Garantir une traçabilité complète et une conformité réglementaire
- Améliorer la productivité des agents (cible : gain 50-70% sur traitement courant)
- Fournir une solution interministérielle tout en respectant l'autonomie de chaque entité

---

## 2. Contexte et Acteurs

### Acteurs
- **Ministères** : Entités principales (Défense, Justice, Culture…)
- **Directions** : Sous-entités (Direction du Courrier, DSI, DAF, DRH, etc.)
- **Utilisateurs** : Agents, Responsables de direction, Responsables Courrier, Auditeurs
- **Super Admin** : rôle **plateforme** (pas de direction, pas de messagerie opérationnelle)

### Flux
- **Interne** : Direction A → Direction B (même ministère) — toute direction détentrice peut **transmettre** vers une autre direction du même ministère
- **Externe** : Ministère A → Direction destinataire Ministère B (à la création / envoi) ; ensuite les transmissions restent **internes** au ministère détenteur

> Ancien modèle (circuit obligatoire via Direction du Courrier uniquement) : abandonné pour la transmission. La Direction Courrier reste un point d'entrée possible, mais n'est plus le seul acteur autorisé à transmettre.

---

## 3. Exigences Fonctionnelles

### 3.1 Gestion des Courriers
- [x] Création, envoi, réception ; transmission **interne** (même ministère) par toute direction détentrice
- [x] Pièces jointes (multi-fichiers, formats courants, upload + download + suppression)
- [x] Statuts et historique complet
- [x] Recherche full-text + filtres avancés (statut, type, dates) + recherche topbar
- [x] Notifications temps réel (WebSocket JWT ; email SaaS volontairement exclu — SMTP interne plus tard)
- [x] Archivage (archiver / lister / désarchiver, rétention, scopes direction/ministère)
- [ ] Versioning des documents

### 3.2 Hyperautomation IA (Microservice dédié)
- [x] OCR + Classification automatique des documents *(branché Nest/FE)*
- [x] Extraction / résumé + objet proposé
- [x] Suggestions d'actions et pré-remplissage *(UI réelle, validation humaine)*
- [x] Rédaction assistée par gabarit local
- [x] Tableau de bord d'analyse des flux (process mining)

### 3.3 Administration et Sécurité
- [x] Gestion des ministères, directions, utilisateurs et rôles (RBAC)
- [x] Audit log (écriture interceptor + consultation search / reports / anomalies)
- [x] Archivage long terme (rétention, emplacement, contrôles d'accès)
- [ ] SSO / Authentification forte

---

## 4. Stack Technique

| Couche | Technologie |
|--------|------------|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + TanStack Query + Zustand |
| Backend | NestJS + TypeScript |
| Base de données | PostgreSQL 16 + Drizzle ORM |
| IA / ML | Python FastAPI + Tesseract OCR + RapidOCR + NLP local ; LLM OpenAI-compatible optionnel (résumé) |
| Workflow | Temporal.io |
| Stockage fichiers | MinIO (S3 compatible) |
| Cache / Queues | Redis + BullMQ |
| Auth | JWT + refresh tokens + RBAC |
| Monitoring | Prometheus + Grafana + Winston/Pino |
| Déploiement | Docker + Docker Compose (dev) / Kubernetes (prod) |

---

## 5. Schéma de Base de Données

Tables implémentées :
- `ministeres` – Entités ministères
- `directions` – Directions par ministère
- `utilisateurs` – Utilisateurs avec rôles et permissions
- `courriers` – Courriers avec workflow complet
- `pieces_jointes` – Documents attachés
- `flux_etapes` – Historique des actions sur courriers
- `archives` – Archivage long terme
- `audit_logs` – Logs d'audit immuables

---

## 6. Architecture Microservices

```
Utilisateur → Frontend (Next.js) → API Gateway
                  ↓
     Auth Service ↔ Courrier Service ↔ Temporal Workflows
                  ↓
           IA Service (Python FastAPI)
                  ↓
       PostgreSQL + MinIO (fichiers) + Redis (cache/queues)
```

Services :
- `auth-service` – Authentification et autorisation
- `courrier-service` – Gestion des flux et workflows
- `ia-service` – OCR, Classification, NLP (Python FastAPI)
- `notification-service` – Notifications temps réel
- `archive-service` – Archivage et stockage
- `admin-service` – Gestion ministères/directions

---

## 7. UI/UX Design System

- **Design** : Moderne, premium, professionnel type SaaS 2026 (inspiré Linear, Vercel, Notion)
- **Composants** : shadcn/ui + Tailwind CSS
- **Thème** : Dark mode par défaut + Light mode
- **Typographie** : Inter / Geist
- **Animations** : Framer Motion (transitions fluides)
- **Layout** : Sidebar collapsible + Top bar + Dashboard
- **Responsive** : Desktop + Tablette
- **Accessibilité** : ARIA + Performance (lazy loading, code splitting)

---

## 8. Plan de Développement Itératif

### Phase 0 : Initialisation ✅ TERMINÉE
- [x] Schema DB + Drizzle + seed + migrations
- [x] Structure dossiers backend/frontend/ia-service
- [x] Dockerfiles (backend, frontend, ia-service)
- [x] Monorepo root config (package.json avec scripts)
- [x] Docker Compose complet (postgres, redis, minio, temporal, backend, frontend, ia-service, temporal-ui)
- [x] .env avec toutes les variables
- [x] Design system frontend (composants UI : Button, Card, Input, Avatar, Badge, Separator, ScrollArea, Dialog, DropdownMenu, Tooltip, Label)
- [x] Layout principal (Sidebar collapsible + TopBar + AppShell)
- [x] ThemeProvider (dark mode par défaut + light mode)
- [x] Page de login premium (split view branding + formulaire)
- [x] Dashboard d'accueil (statistiques, courriers récents, suggestions IA, activité, performance)
- [x] .gitignore global
- [x] Compilation vérifiée (frontend build OK, backend build OK)
- [x] PROJECT_RULES.md créé et maintenu

### Phase 1 : Authentification & Administration ✅ TERMINÉE
- [x] Auth Module (login, register, refresh, profile) avec JWT + refresh tokens
- [x] JWT Strategy (Passport.js) + validation token
- [x] RBAC Guards (JwtAuthGuard global + RolesGuard global)
- [x] Décorateurs @Roles, @RequirePermissions, @Public, @CurrentUser
- [x] Matrice rôles → permissions (agent, responsable, courrier_admin, auditeur, super_admin)
- [x] Admin Module CRUD complet : Ministeres, Directions, Utilisateurs
- [x] Audit Log Service + Interceptor global (logs toutes les mutations)
- [x] Frontend: Auth store (Zustand + persist)
- [x] Frontend: API client (fetch natif, tous endpoints CRUD)
- [x] Frontend: AuthGuard (route protégée, redirection login)
- [x] Frontend: Page Ministères (CRUD, search, cards)
- [x] Frontend: Page Directions (CRUD, select ministère, badges type)
- [x] Frontend: Page Utilisateurs (CRUD, search, avatar, rôles)
- [x] Frontend: Login connecté au backend (JWT)
- [x] Frontend: Dashboard protégé par AuthGuard
- [x] Compilation vérifiée (frontend 0 erreurs, backend 0 erreurs)

### Phase 2 : Core Courrier ✅ TERMINÉE
- [x] CRUD Courrier (create, read, update, delete) avec validation
- [x] Service courrier avec logique métier complète
- [x] Circuit de flux : envoi + transmission interne entre directions du même ministère
- [x] Historique des étapes (flux_etapes)
- [x] Envoi, réception, transmission de courriers
- [x] Génération automatique de références
- [x] Pièces jointes upload + download (multi-fichiers, 50 Mo max)
- [x] Header Content-Disposition RFC 5987 (noms de fichiers UTF-8)
- [x] Frontend: API client courrier (api.ts) — tous endpoints CRUD + upload + download
- [x] Frontend: Page Inbox connectée à l'API — filtres statut, typeCourrier, dates, pagination UI
- [x] Frontend: Page Sent connectée à l'API — scope=sent, filtres, pagination
- [x] Frontend: Page Drafts connectée à l'API — scope=drafts, suppression, pagination
- [x] Frontend: Page Nouveau courrier (formulaire complet interne/externe)
- [x] Frontend: Page Détail courrier (infos + historique + actions + download PJ)
- [x] Backend: QueryCourrierDto enrichi — scope, typeCourrier, dateDebut, dateFin
- [x] Backend: Recherche full-text sur reference + objet + corps
- [x] Compilation backend vérifiée (nest build OK)
- [x] Lint frontend vérifié (0 erreurs, 1 warning hook préexistant)

### Phase 3 : Notifications & Real-time ✅ TERMINÉE
- [x] Table notifications (schema + migration)
- [x] WebSocket Gateway (Socket.IO) avec authentification par userId
- [x] NotificationService (CRUD + broadcast temps réel)
- [x] NotificationController (GET /notifications, unread-count, mark-read, mark-all-read)
- [x] Notifications automatiques sur : envoi, transmission, réception, archivage
- [x] Frontend: Hook useNotifications (Socket.IO client + unread count)
- [x] Frontend: Cloche TopBar avec compteur temps réel + badge
- [x] Frontend: Page /notifications (liste + marquer lu + tout marquer lu)
- [x] Compilation backend vérifiée (nest build OK)
- [x] Lint frontend vérifié (0 erreurs, 1 warning préexistant)

### Phase 3bis : Pilotage produit ✅ TERMINÉE (Module 1)
- [x] `GET /api/stats/dashboard` + `GET /api/stats/analytics` (scopés par rôle)
- [x] Dashboard / Analytics branchés API (plus de mocks)
- [x] Recherche TopBar (⌘K) + `scope=accessible` + inbox `?q=`
- [x] Super admin sans direction / sans menus messagerie

### Phase 3ter : Fichiers & pièces jointes ✅ TERMINÉE (Module 2)
- [x] Utilitaire chemins partagé (`storage.util.ts`) — chemins relatifs, résolution Windows
- [x] Upload/download PJ courrier + messages fiables
- [x] Upload multi à la création + ajout/suppression sur détail
- [x] UI SaaS (drag & drop, validation taille/format)

### Phase 4 : Intégration IA
- [x] Branchement Nest → FastAPI
- [x] OCR + Classification + Extraction / résumé
- [x] Suggestions et rédaction assistée (remplacer mocks UI)

### Phase 5 : Workflow Temporal + Archivage + Audit lecture
- [ ] Temporal.io workflows
- [x] Archivage enrichi (M3)
- [x] API + UI audit search / reports / anomalies (M4)

### Phase 6 : Tests, Sécurité, Optimisations, Documentation
- [x] Tests unitaires + E2E critiques (health, auth, guards) — M8
- [x] Sécurité (rate limiting, helmet, CORS, validation uploads) — M8
- [x] Documentation API (Swagger `/api/docs`) — M8
- [ ] Optimisations performance / Prometheus — hors socle M8 local

---

## 9. Conventions de Code

### Backend (NestJS)
- Architecture Clean / DDD léger
- Validation : class-validator + class-transform
- Logging : Winston/Pino
- Tests : Jest

### Frontend (Next.js)
- State management : Zustand
- Data fetching : TanStack Query
- Composants : shadcn/ui
- Animations : Framer Motion
- Styles : Tailwind CSS

### IA Service (Python FastAPI)
- Pydantic models
- OCR : Tesseract
- NLP : Hugging Face (futur)

---

## 10. Points de Vigilance

1. **Sécurité** : Chiffrement des données sensibles, JWT sécurisés, RBAC strict
2. **Performance** : < 2s chargement courriers, cache Redis
3. **Scalabilité** : Architecture microservices, conteneurs Docker
4. **Conformité** : RGPD, archivage ; IA : OCR/extraction restent locaux ; résumé LLM optionnel avec validation humaine (exigence souveraineté assouplie pour la qualité du résumé)
5. **Traçabilité** : Audit log sur toutes les actions sensibles

---

## 11. Guide de Démarrage Local

### 11.1 Prérequis (Installations)

| Outil | Version requise | Statut |
|-------|----------------|--------|
| Node.js | ≥ 20.x | ✅ Installé |
| PostgreSQL | ≥ 16 | ✅ Installé (local) |
| Python | ≥ 3.10 | ✅ Installé (pour ia-service) |
| Redis | ≥ 7 | ⏳ Optionnel Phase 1 |
| MinIO | Latest | ⏳ Optionnel Phase 2 |
| Docker | Latest | ❌ Non disponible (PC lente) |

### 11.2 Configuration Base de Données

**PostgreSQL local :**
- Host : `localhost`
- Port : `5432`
- Utilisateur : `postgres`
- Mot de passe : `postgres`
- Base de données : `fluxmin`

**URL de connexion :**
```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/fluxmin
```

### 11.3 Variables d'Environnement (`.env` à la racine)

```env
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=fluxmin
DATABASE_URL=postgres://postgres:postgres@localhost:5432/fluxmin

# Backend
PORT=3001
JWT_SECRET=fluxmin-jwt-secret-key-super-secure-2026
JWT_REFRESH_SECRET=fluxmin-jwt-refresh-secret-key-super-secure-2026
FRONTEND_URL=http://localhost:3000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_IA_SERVICE_URL=http://localhost:8000

# Services (optionnels Phase 1)
REDIS_HOST=localhost
REDIS_PORT=6379
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
```

### 11.4 Lancement Étape par Étape

#### Étape 1 : Créer la base de données
```sql
-- Via psql ou pgAdmin
CREATE DATABASE fluxmin;
```

#### Étape 2 : Installer les dépendances Backend
```bash
cd backend
npm install
```

#### Étape 3 : Initialiser la base de données
```bash
# Générer les migrations Drizzle
npm run db:generate

# Pousser le schema en DB
npx drizzle-kit push

# Injecter les données de démo
npm run db:seed
```

#### Étape 4 : Lancer le Backend
```bash
npm run start:dev
# → http://localhost:3001/api
```

#### Étape 5 : Installer les dépendances Frontend
```bash
cd ../frontend
npm install
```

#### Étape 6 : Lancer le Frontend
```bash
npm run dev
# → http://localhost:3000
```
#### Étape 7 : Lancer le service IA
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# → http://localhost:8000
```

### 11.5 Comptes de Démo (après seed)

| Email | Mot de passe | Rôle | Direction |
|-------|-------------|------|-----------|
| admin@fluxmin.gouv.fr | fluxmin2026 | Super Admin | Aucune (plateforme) |
| agent.courrier.mfa@fluxmin.gouv.fr | fluxmin2026 | Agent Courrier | Direction du Courrier MFA |
| responsable.dsi.mfa@fluxmin.gouv.fr | fluxmin2026 | Responsable | DSI MFA |
| agent.dsi.mfa@fluxmin.gouv.fr | fluxmin2026 | Responsable | DSI MFA |
| agent.courrier.minjus@fluxmin.gouv.fr | fluxmin2026 | Agent Courrier | Direction du Courrier MINJUS |
| responsable.daf.minjus@fluxmin.gouv.fr | fluxmin2026 | Responsable | DAF MINJUS |
| auditeur@fluxmin.gouv.fr | fluxmin2026 | Auditeur | Aucune (transversal) |

admin@fluxmin.gouv.fr → Super Admin
agent.courrier.mfa@fluxmin.gouv.fr → Courrier MFA
responsable.dsi.mfa@fluxmin.gouv.fr → Resp. DSI MFA
agent.dsi.mfa@fluxmin.gouv.fr → Agent DSI MFA
agent.drh.mfa@fluxmin.gouv.fr → Agent DRH MFA
agent.daf.mfa@fluxmin.gouv.fr → Agent DAF MFA
agent.courrier.minjus@fluxmin.gouv.fr → Courrier MINJUS
responsable.daf.minjus@fluxmin.gouv.fr → Resp. DAF MINJUS
agent.drh.minjus@fluxmin.gouv.fr → Agent DRH MINJUS
agent.daj.minjus@fluxmin.gouv.fr → Agent DAJ MINJUS
agent.courrier.mcc@fluxmin.gouv.fr → Courrier MCC
agent.patrimoine.mcc@fluxmin.gouv.fr → Agent Patrimoine MCC
agent.daf.mcc@fluxmin.gouv.fr → Agent DAF MCC
auditeur@fluxmin.gouv.fr → Auditeur
gouvernement@fluxmin.gouv.fr
directeur.mfa@fluxmin.gouv.fr
directeur.minjus@fluxmin.gouv.fr



5 courriers illustrant tous les flux :
1. Interne MFA (DSI → DRH)
2. Externe MINJUS → MFA (Courrier MINJUS → DSI MFA)
3. Externe MCC → MINJUS (Courrier MCC → DAF MINJUS)
4. Interne MINJUS (DAF → DAJ) en brouillon
5. Interne MFA (DAF → DSI) reçu

### 11.6 URLs des Services

| Service | URL | Phase |
|---------|-----|-------|
| Frontend Next.js | http://localhost:3000 | Phase 0+ |
| Backend NestJS API | http://localhost:3001/api | Phase 0+ |
| IA Service FastAPI | http://localhost:8000 | Phase 4+ |
| MinIO Console | http://localhost:9001 | Phase 2+ |
| Redis | localhost:6379 | Phase 3+ |
| Temporal UI | http://localhost:8080 | Phase 5+ |

### 11.7 Services Optionnels par Phase

| Phase | Services requis | Services optionnels |
|-------|----------------|-------------------|
| Phase 0-1 | PostgreSQL | — |
| Phase 2 | PostgreSQL | MinIO (fichiers) |
| Phase 3 | PostgreSQL + Redis | — |
| Phase 4 | PostgreSQL | IA Service |
| Phase 5 | PostgreSQL | Temporal + MinIO |
| Phase 6 | Tous | — |

### 11.8 Résolution de Problèmes

**Erreur "utilisateur non authentifié" sur /auth/login (Phase 1) :**
Le `RolesGuard` global ne vérifiait pas le décorateur `@Public()`. Corrigé en ajoutant la vérification `IS_PUBLIC_KEY` en début de `canActivate()`. **Règle : tout guard global DOIT vérifier `@Public()` en premier.**

**Erreur "database already exists" :**
```sql
DROP DATABASE fluxmin;
CREATE DATABASE fluxmin;
```

**Erreur de migration :**
```bash
# Réinitialiser les migrations
rm -rf src/infrastructure/database/migrations
npm run db:generate
npx drizzle-kit push
```

**Port 3001 déjà utilisé :**
```bash
# Windows : trouver le processus
netstat -ano | findstr :3001
# Tuer le processus
taskkill /PID <PID> /F
```

**Backend ne démarre pas :**
Vérifier que PostgreSQL est en cours d'exécution et que le `.env` est correct.

**LLM (résumé / infos clés)** — cascade multi-fournisseurs, **sans NLP local** :
1. Clés dans `ia-service/.env` : **Groq** ([console](https://console.groq.com/keys)), OpenAI, OpenRouter, Claude, xAI, Gemini, Mistral
2. `LLM_STRATEGY=max` : meilleur modèle d’abord (Groq prioritaire) ; bascule auto si 429 / quota / erreur
3. Sans clé / cascade épuisée : message d’erreur clair (pas de résumé local)
4. OCR / extraction fichiers restent locaux ; grounding + validation humaine
5. **Ne jamais committer** `.env` / clés API