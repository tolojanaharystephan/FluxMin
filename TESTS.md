# FluxMin – Plan de Tests Fonctionnels

## Version : 1.1
## Date : 17/07/2026

> Aligné avec l'avancement produit (voir `PROJECT_RULES.md` § État d'avancement).
> Priorité manuelle : Audit (M4) puis Notifications / IA.

---

## 0. PILOTAGE → AUDIT (priorité produit)

| # | Test | Résultat attendu | Statut |
|---|------|-----------------|--------|
| 0.1 | Login `admin@…` → dashboard | KPIs numériques réels (pas de mocks) | ☐ |
| 0.2 | Page Analytics | Totaux / mensuel / top directions depuis API | ☐ |
| 0.3 | Recherche topbar « MFA » | Suggestions + navigation détail | ☐ |
| 0.4 | Super admin : pas de menus inbox/sent/drafts | Section Messagerie absente | ☐ |
| 0.5 | Créer courrier + PJ multi | Fichiers listés après création | ☐ |
| 0.6 | Télécharger PJ (Windows) | Fichier téléchargé (pas 404) | ☐ |
| 0.7 | Ajouter / supprimer PJ sur détail | Refresh liste OK | ☐ |
| 0.8 | Envoyer fichier en discussion | PJ visible + téléchargeable | ☐ |
| 0.9 | Archiver via dialogue (durée + emplacement) | Statut archive + entrée liste Archives | ☐ |
| 0.10 | Liste archives : badges rétention | Valide / Expire bientôt / Expiré | ☐ |
| 0.11 | Désarchiver depuis liste ou détail | Statut « reçu », disparait des archives | ☐ |
| 0.12 | Scope : agent ne voit que archives liées à sa direction | Pas de fuite inter-direction | ☐ |
| 0.13 | Audit recherche (compte auditeur) | Résultats API réels, pas de mocks | ☐ |
| 0.14 | Générer un rapport d'audit | Rapport listé avec indicateurs | ☐ |
| 0.15 | Page Anomalies | Détection délai/workflow + Traiter | ☐ |
| 0.16 | Export CSV recherche audit | Fichier téléchargé | ☐ |
| 0.17 | Message discussion → notif destinataire | Badge + toast + entrée centre notifs | ☐ |
| 0.18 | WebSocket sans userId query | Connexion avec JWT `auth.token` uniquement | ☐ |
| 0.19 | Filtrer notifs (type / non lues) | Liste filtrée API | ☐ |
| 0.20 | Clic toast / notif | Marquée lue + navigation courrier | ☐ |
| 0.21 | Démarrer ia-service + GET /ai/health | status ok ; backend logue warning si IA down au boot | ☐ |
| 0.22 | Analyser PJ (PDF, image, docx, xlsx, pptx, txt, odt…) | Résumé structuré (synthèse + points clés) + directions + actions | ☐ |
| 0.22b | Analyser tout (multi-PJ) n’importe quel courrier | Cohérence / correspondances ; analyse partielle si 1 PJ échoue ; erreur claire si IA down | ☐ |
| 0.22c | OCR image (Tesseract vendor ou RapidOCR) | Texte extrait sans erreur PATH machine | ☐ |
| 0.22d | PDF démo seed absents | Recréés au `db:seed` et au démarrage Nest | ☐ |
| 0.23 | Page Suggestions IA | Données réelles (pas de mocks) | ☐ |
| 0.24 | Accepter suggestion | Entrée audit AI_SUGGESTION_ACCEPTED | ☐ |
| 0.25 | Rédaction assistée | Brouillon gabarit local | ☐ |

---

## 1. AUTHENTIFICATION & SÉCURITÉ

| # | Test | Résultat attendu | Statut |
|---|------|-----------------|--------|
| 1.1 | Login avec identifiants valides | Retourne JWT + refresh token + profil utilisateur | ☐ |
| 1.2 | Login avec mot de passe incorrect | Erreur 401 | ☐ |
| 1.3 | Login avec email inexistant | Erreur 401 (pas de fuite d'info) | ☐ |
| 1.4 | Accès à une route protégée sans token | Erreur 401 | ☐ |
| 1.5 | Accès avec token expiré | Erreur 401 | ☐ |
| 1.6 | Refresh token valide | Nouveau access token | ☐ |
| 1.7 | Refresh token expiré/invalide | Erreur 401 | ☐ |
| 1.8 | Changement de mot de passe | OK + ancien token invalidé | ☐ |
| 1.9 | Register avec email existant | Erreur 409 Conflict | ☐ |

---

## 2. RBAC & PERMISSIONS

| # | Test | Résultat attendu | Statut |
|---|------|-----------------|--------|
| 2.1 | `agent` tente de créer un ministère | Erreur 403 | ☐ |
| 2.2 | `super_admin` crée un ministère | OK 201 | ☐ |
| 2.3 | `courrier_admin` crée un courrier | OK 201 | ☐ |
| 2.4 | `agent` tente de supprimer un courrier non-brouillon | Erreur 403 | ☐ |
| 2.5 | `auditeur` tente de créer un courrier | Erreur 403 | ☐ |
| 2.6 | Utilisateur d'une direction A tente de modifier un courrier de direction B | Erreur 403 | ☐ |

---

## 3. ADMINISTRATION (Ministères / Directions / Utilisateurs)

| # | Test | Résultat attendu | Statut |
|---|------|-----------------|--------|
| 3.1 | CRUD ministère complet | Create → Read → Update → Delete OK | ☐ |
| 3.2 | Créer ministère avec nom dupliqué | Erreur 409 | ☐ |
| 3.3 | CRUD direction liée à un ministère | OK + FK validée | ☐ |
| 3.4 | Supprimer ministère ayant des directions | Erreur FK ou cascade attendue | ☐ |
| 3.5 | CRUD utilisateur avec hash bcrypt | Mot de passe jamais en clair en réponse | ☐ |
| 3.6 | Recherche utilisateur par nom/email | Résultats filtrés correctement | ☐ |
| 3.7 | Stats admin (`/admin/stats`) | Compteurs cohérents | ☐ |

---

## 4. COURRIERS (Phase 2 — cœur de métier)

### 4.1 Cycle de vie

| # | Test | Résultat attendu | Statut |
|---|------|-----------------|--------|
| 4.1.1 | Créer courrier brouillon | Statut = `brouillon`, référence auto générée | ☐ |
| 4.1.2 | Modifier brouillon (objet, corps) | OK | ☐ |
| 4.1.3 | Envoyer brouillon | Statut → `envoye`, dateEnvoi renseignée | ☐ |
| 4.1.4 | Tenter d'envoyer un courrier déjà envoyé | Erreur 403 | ☐ |
| 4.1.5 | Marquer comme reçu | Statut → `recu`, dateReception renseignée | ☐ |
| 4.1.6 | Transmettre à une autre direction | Statut → `en_traitement`, historique mis à jour | ☐ |
| 4.1.7 | Supprimer brouillon | OK | ☐ |
| 4.1.8 | Supprimer courrier non-brouillon | Erreur 403 | ☐ |

### 4.2 Circuit obligatoire

| # | Test | Résultat attendu | Statut |
|---|------|-----------------|--------|
| 4.2.1 | Vérifier que la direction courrier émettrice est auto-détectée | Champ `directionCourrierEmetteurId` rempli | ☐ |
| 4.2.2 | Vérifier que chaque étape crée un log dans `flux_etapes` | Historique complet | ☐ |
| 4.2.3 | Historique d'un courrier après envoi+réception+transmission | 3 entrées min. dans flux_etapes | ☐ |

### 4.3 Recherche & Filtrage

| # | Test | Résultat attendu | Statut |
|---|------|-----------------|--------|
| 4.3.1 | Recherche par référence partielle | Résultats correspondants | ☐ |
| 4.3.2 | Filtrage par statut | Uniquement les courriers du statut choisi | ☐ |
| 4.3.3 | Pagination (page 1, limit 5) | 5 résultats, total correct | ☐ |
| 4.3.4 | Utilisateur ne voit que SES courriers (émis + reçus) | Pas de courriers d'autres directions | ☐ |

### 4.4 Type Interne vs Externe

| # | Test | Résultat attendu | Statut |
|---|------|-----------------|--------|
| 4.4.1 | Créer courrier interne sans sélectionner de ministère | OK, pas de ministère destinataire | ☐ |
| 4.4.2 | Créer courrier externe avec ministère + direction | OK, les deux champs renseignés | ☐ |
| 4.4.3 | Tenter courrier externe sans ministère | Erreur validation | ☐ |

### 4.5 Pièces jointes

| # | Test | Résultat attendu | Statut |
|---|------|-----------------|--------|
| 4.5.1 | Uploader un PDF | OK, fichier enregistré | ☐ |
| 4.5.2 | Uploader une image (PNG, JPG) | OK | ☐ |
| 4.5.3 | Uploader un fichier Word/Excel | OK | ☐ |
| 4.5.4 | Uploader un fichier > 50 Mo | Erreur 400 | ☐ |
| 4.5.5 | Uploader un format non supporté (.exe, .zip) | Erreur 400 | ☐ |
| 4.5.6 | Uploader plusieurs fichiers sur un même courrier | OK, tous attachés | ☐ |
| 4.5.7 | Voir les pièces jointes dans le détail du courrier | Liste affichée avec noms et tailles | ☐ |

---

## 5. RÉFÉRENCES & INTÉGRITÉ

| # | Test | Résultat attendu | Statut |
|---|------|-----------------|--------|
| 5.1 | Génération de référence unique | Format `FLUX-2026-000001`, incrémentée | ☐ |
| 5.2 | 2 courriers créés en parallèle | 2 références différentes | ☐ |
| 5.3 | Courrier avec destinataire inexistant | Erreur FK | ☐ |

---

## 6. FRONTEND — NAVIGATION & UX

| # | Test | Résultat attendu | Statut |
|---|------|-----------------|--------|
| 6.1 | Page login → soumettre → redirect dashboard | Flux complet | ☐ |
| 6.2 | Sidebar : cliquer "Boîte de réception" | Navigation vers `/inbox` | ☐ |
| 6.3 | Inbox : bouton "Nouveau courrier" | Navigation vers `/courriers/new` | ☐ |
| 6.4 | Formulaire nouveau courrier → envoyer | Redirection inbox, courrier visible | ☐ |
| 6.5 | Cliquer sur un courrier dans inbox | Page détail `/courriers/[id]` | ☐ |
| 6.6 | Page détail : bouton "Transmettre" | Direction sélectionnée + confirmation | ☐ |
| 6.7 | Page détail : bouton "Retour" | Retour à la page précédente | ☐ |
| 6.8 | Thème dark/light | Toggle fonctionne sur toutes les pages | ☐ |
| 6.9 | Déconnexion | Retour login, token supprimé | ☐ |
| 6.10 | Uploader des fichiers via le formulaire | Fichiers listés avant envoi | ☐ |
| 6.11 | Supprimer un fichier de la liste avant envoi | Fichier retiré de la liste | ☐ |

---

## 7. CAS LIMITES / EDGE CASES

| # | Test | Résultat attendu | Statut |
|---|------|-----------------|--------|
| 7.1 | Soumettre formulaire avec champ objet vide | Bouton désactivé ou erreur validation | ☐ |
| 7.2 | Créer courrier sans sélectionner de destinataire | Erreur validation | ☐ |
| 7.3 | Token JWT manuellement modifié dans localStorage | Erreur 401 | ☐ |
| 7.4 | Double-clic rapide sur "Envoyer" | Un seul courrier créé (pas de doublon) | ☐ |
| 7.5 | Recharger la page sur `/inbox` | Données rechargées, pas de crash | ☐ |
| 7.6 | Courrier avec objet de 256 caractères | Erreur validation (max 255) | ☐ |
| 7.7 | Utilisateur non authentifié accède directement à `/courriers/1` | Redirect vers login | ☐ |
| 7.8 | Type interne : vérifier que le select ministère n'apparaît pas | Pas de champ ministère | ☐ |
| 7.9 | Type externe : vérifier que le select ministère est obligatoire | Bouton désactivé sans ministère | ☐ |

---

## Priorité de test

| Priorité | Tests |
|----------|-------|
| **Bloquant** | 1.1-1.3, 2.1-2.2, 4.1.1-4.1.5, 5.1, 6.1 |
| **Critique** | 1.4-1.7, 4.2.1-4.2.3, 4.3.1-4.3.4, 6.3-6.6, 4.4.1-4.4.3 |
| **Important** | 3.1-3.7, 4.1.6-4.1.8, 4.5.1-4.5.7, 7.1-7.9 |
| **Mineur** | 6.8-6.11, 5.2-5.3 |

---

## 8. Communications Gouvernement (MG)

| # | Action | Résultat attendu | ☐ |
|---|--------|------------------|---|
| 8.1 | Login `gouvernement@…` → menu Publier | Formulaire accessible | ☐ |
| 8.2 | Publier communiqué **public** | Visible dans Actualités générales ; notif tous ministères | ☐ |
| 8.2a | Clic notif `publication_gouv` (liste ou toast) | Ouvre `/actualites/:id` pour tout utilisateur notifié | ☐ |
| 8.2b | Joindre **1 ou plusieurs** fichiers à la publication | Zone drag & drop ; PJ listées + téléchargeables sur le détail | ☐ |
| 8.2c | Ajouter des PJ depuis le détail (rôle gouvernement) | Fichiers uploadés et visibles après refresh | ☐ |
| 8.3 | Publier **ordre ciblé MFA** + PJ | Visible Actualités ministère (users MFA) ; pas MINJUS | ☐ |
| 8.4 | Agent MFA ouvre le post ciblé | Lecture OK ; **pas** de bouton AR | ☐ |
| 8.5 | `directeur.mfa@…` AR + message | AR enregistré ; notif Gouvernement | ☐ |
| 8.6 | Directeur MINJUS tente AR sur post MFA | Refus / pas de droit | ☐ |
| 8.7 | Gouvernement répond dans le fil | Message visible côté MFA | ☐ |

---

## 9. Hyperautomation M7 (MinIO / Temporal / Process mining)

| # | Action | Résultat attendu | ☐ |
|---|--------|------------------|---|
| 9.1 | `docker compose up -d minio temporal temporal-ui` | MinIO `:9000/:9001`, Temporal `:7233` | ☐ |
| 9.2 | Upload PDF sur un courrier (backend log « MinIO OK ») | `chemin_minio` = `courriers/…` ; download OK | ☐ |
| 9.3 | Upload PJ publication gouvernement | Objet sous `publications/…` ; download OK | ☐ |
| 9.4 | Arrêter MinIO puis upload | Fallback disque `uploads/…` ; download OK | ☐ |
| 9.5 | Ancien fichier `uploads/…` encore en base | Download toujours OK (dual-read) | ☐ |
| 9.6 | Envoyer un courrier | Workflow Temporal `courrier-suivi-{id}` visible UI | ☐ |
| 9.7 | Demo délais courts (`TEMPORAL_RELANCES_DELAY=2 minutes`) | Notif `courrier_relance` puis `courrier_escalade` | ☐ |
| 9.8 | Accuser réception / archiver | Workflow annulé ; plus de relance | ☐ |
| 9.9 | Analytics → section Process mining | Volumes d’étapes, transitions, délais moyens | ☐ |

---

## 10. Durcissement M8 (local, sans Docker)

| # | Action | Résultat attendu | ☐ |
|---|--------|------------------|---|
| 10.1 | Ouvrir `http://localhost:3001/api/docs` | Swagger UI FluxMin ; Authorize JWT | ☐ |
| 10.2 | `GET /api/health` (sans token) | 200 `{ status: "ok", database: "up" }` | ☐ |
| 10.3 | Spam login (>10/min) | 429 Too Many Requests | ☐ |
| 10.4 | `cd backend && npm test -- src/app.controller.spec.ts src/common/guards/roles.guard.spec.ts` | Suites vertes | ☐ |
| 10.5 | `npm run test:e2e` (Postgres local) | Health 200 + login invalide 401 (skip si DB down) | ☐ |

---

## Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Super Admin | admin@fluxmin.gouv.fr | fluxmin2026 |
| Gouvernement | gouvernement@fluxmin.gouv.fr | fluxmin2026 |
| Directeur MFA | directeur.mfa@fluxmin.gouv.fr | fluxmin2026 |
| Directeur MINJUS | directeur.minjus@fluxmin.gouv.fr | fluxmin2026 |
| Agent Courrier MFA | agent.courrier.mfa@fluxmin.gouv.fr | fluxmin2026 |
| Responsable DSI MFA | responsable.dsi.mfa@fluxmin.gouv.fr | fluxmin2026 |
| Agent DSI MFA | agent.dsi.mfa@fluxmin.gouv.fr | fluxmin2026 |
| Agent Courrier MINJUS | agent.courrier.minjus@fluxmin.gouv.fr | fluxmin2026 |
| Responsable DAF MINJUS | responsable.daf.minjus@fluxmin.gouv.fr | fluxmin2026 |
| Auditeur | auditeur@fluxmin.gouv.fr | fluxmin2026 |
