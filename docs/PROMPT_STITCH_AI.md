# PROMPT — Génération UI/UX moderne pour FluxMin (Stitch AI)

Copiez-collez le bloc ci-dessous dans Google Stitch AI pour générer un design moderne, premium et cohérent de toutes les pages de l'application.

---

```
# CONTEXTE PRODUIT

Tu es un designer UI/UX senior. Je te confie la refonte visuelle de « FluxMin », une plateforme web sécurisée de gestion et d'automatisation intelligente des courriers ministériels (inter- et intra-ministères). L'application s'adresse à des agents administratifs, responsables de direction, directeurs de ministère, auditeurs, et membres du Gouvernement. Toute l'interface est en FRANÇAIS.

# IDENTITÉ VISUELLE (à respecter sur TOUTES les pages)

- Style : SaaS premium 2026, inspiré de Linear, Vercel, Notion. Surfaces propres, hiérarchie claire, profondeur subtile. Interdit : clichés purple/glow, fonds néon, effets kitsch.
- Palette : fond sombre profond (teinte verte-noire type #07110f), accents teal/turquoise (#14b8a6) + accents sémantiques colorés (sky, emerald, amber, orange, red, lime, cyan, fuchsia, rose) pour les icônes et badges fonctionnels.
- Typographie : Inter / Geist, grandes graisses tracking-tight pour les titres, texte secondaire en muted.
- Composants : cartes arrondies (rounded-xl/2xl), bordures fines blanches/10, backdrop-blur sur surfaces flottantes, badges pill, boutons cohérents (primaire teal, outline, ghost), skeleton de chargement, états vide élégants avec icône large + texte muted.
- Micro-animations : transitions douces, fade-in staggered, hover sur lignes (bg-secondary/30), progress bars arrondies.
- Layout global : sidebar collapsible (68px ↔ 260px) avec sections groupées par modules, topbar avec recherche globale (⌘K), cloche de notifications avec badge de compteur en temps réel, avatar utilisateur avec menu déroulant (Profil, Paramètres, Déconnexion).
- Responsive : desktop + tablette ; les listes passent en colonne sur mobile.

# PAGES À DESIGNER (contenu réel de chaque écran)

## 1. PAGE DE CONNEXION (route "/")
Écran plein sans sidebar. Split view : panneau gauche (52%) avec branding « FluxMin », tagline « Gestion et automatisation intelligente des courriers ministériels », 3 features clés (IA locale assistive, Souveraineté des données, Flux tracés), fond avec mesh dégradé teal, orbes flottantes animées et carte « aperçu courrier entrant » flottante. Panneau droit : carte glass avec formulaire de connexion (email, mot de passe avec toggle visible/caché, checkbox « Se souvenir de moi », bouton « Se connecter »), lien « Mot de passe oublié », et zone « Démo rapide » avec 2 boutons de remplissage automatique (Agent Courrier / Responsable). Mention « Accès réservé aux agents autorisés ».

## 2. TABLEAU DE BORD (route "/dashboard")
Header adapté au rôle (Super Admin / Directeur / Responsable / Agent) + boutons « Actualiser » et « Nouveau courrier ». 4 cartes KPI avec icône en badge coloré + valeur + tendance (+/-%). Section « Courriers récents » (liste cliquable : icône, objet, référence mono, émetteur, direction, badge statut coloré, date relative). Colonne droite : carte « Actions rapides » (boutons vers Inbox / Nouveau courrier / Archives), carte « Activité récente » (timeline horodatée), carte « Performance » (barres de progression : temps moyen de traitement, taux d'archivage). Rôles : super_admin voit des KPIs multi-ministères et les actions admin.

## 3. BOÎTE DE RÉCEPTION (route "/inbox")
Header avec titre + compteur de courriers + boutons « Actualiser » / « Nouveau courrier ». Barre de recherche (référence, objet, contenu) avec Enter, filtres : statut (Reçu / En traitement / Envoyé), type (Interne / Externe), dates (Du / Au) + « Effacer dates ». Liste des courriers reçus (icône, objet, référence mono, badges type + statut, émetteur, direction, date). Pagination « Page X sur Y » + Précédent / Suivant. État vide avec grande icône Inbox.

## 4. COURRIERS ENVOYÉS (route "/sent")
Même structure que l'inbox : recherche + filtre statut, liste des courriers envoyés (badge « Envoyé », direction émettrice), pagination. État vide avec icône Send.

## 5. BROUILLONS (route "/drafts")
Recherche, liste des brouillons avec icône amber Edit3, référence mono, type, date de création, badge « Brouillon », actions rapides Modifier (pencil) et Supprimer (trash rouge) visibles au survol. Pagination.

## 6. NOUVEAU COURRIER (route "/courriers/new")
Formulaire centré (max-w-3xl). Champs : Objet (obligatoire), Type de courrier (Interne même ministère / Externe inter-ministériel), Corps du message (textarea), section « Destination » : pour externe = select Ministère destination (exclut son propre ministère) + Direction destinataire ; pour interne = select Direction destinataire du même ministère avec note explicative. Section « Pièces jointes » : zone de drag & drop multi-fichiers avec validation taille/format. Boutons footer : « Enregistrer brouillon » (outline) et « Envoyer » (primaire). Messages d'erreur inline.

## 7. DÉTAIL COURRIER (route "/courriers/[id]")
Header avec bouton retour, référence en titre, objet, badge statut coloré. Grille 2 colonnes : gauche = carte « Détails » (référence, type, dates de création/envoi, contenu en bloc préformaté) ; droite = carte Émetteur / Direction émettrice / Direction destinataire, puis panneau « Pièces jointes » (liste des fichiers avec taille + téléchargement, suppression, et analyse IA par fichier ou « Analyser toutes »). Carte « Historique » = timeline verticale des étapes (Création, Envoi, Réception, Transmission, Validation, Archivage) avec commentaires. Panneau « Discussion » (messages du fil de discussion lié au courrier). Carte « Actions » conditionnelle au statut : brouillon → Envoyer / Supprimer ; sinon → Transmettre (select direction même ministère), « Marquer comme reçu », « Archiver » ; archivé → info durée/emplacement + « Désarchiver ». Modales : « Archiver » (durée de conservation + emplacement) et « Analyse IA » (OCR, résumé, infos clés, actions proposées, validation humaine, rédaction assistée).

## 8. ARCHIVES (route "/archives")
Header avec icône orange Archive + compteur. Recherche + filtres Type (Interne/Externe) et Rétention (Valide / Expire bientôt / Expiré). Liste des courriers archivés : objet, badge rétention coloré (vert/ambre/rouge) avec icône alerte, référence, émetteur, type, date d'archivage, durée en années, date d'expiration, emplacement (icône MapPin), boutons « Consulter » et « Désarchiver ».

## 9. NOTIFICATIONS (route "/notifications")
Header avec cloche sky + compteur. Boutons « Tout marquer lu » et « Actualiser ». Filtres : type (courrier reçu, transmission, accusé, archivage, message, actualité gouv., AR, réponse gouv., relance/escalade auto) + toggle « Non lues uniquement ». Liste : icône colorée par type, titre, badge type, message (2 lignes max), date, pastille teal pour non-lue, fond légèrement accentué si non-lue. Cliquer marque lu et navigue.

## 10. ANALYTICS (route "/analytics")
Header + « Actualiser ». 4 KPI (Total courriers, Traités, En attente, Archivés). Carte « Évolution mensuelle » : bar chart double (créés vs traités, 6 mois) avec légende. Carte « Top directions destinataires » : classement 1..N avec barres de progression + pourcentage. Section « Process mining » : 2 KPI délais (envoi→réception, envoi→archivage en heures + échantillon), « Volume par étape » (barres par action), « Transitions fréquentes » (pills mono avec compteur).

## 11. SUGGESTIONS IA (route "/ai/suggestions")
Header avec sparkle cyan. 4 mini-KPI : état Service IA (en ligne/hors ligne), Courriers actifs, Retards +48h, Avec PJ. Liste de cartes de suggestions avec icône colorée par type (urgent amber, optimisation sky, classification cyan, système red, statistique emerald), titre, description, liste d'items (référence mono), badge confiance %, boutons d'action (« Ouvrir », « Traiter »...), et bouton « Rédaction assistée » qui ouvre une modale (objet + résumé → génération d'un brouillon prévisualisé). Avertissement bas de page.

## 12. RECHERCHE AVANCÉE AUDIT (route "/audit/search")
Mode lecture seule. Header avec icône lime + compteur. Recherche plein texte + filtres Statut et Période (Aujourd'hui / Semaine / Mois / Année). Bouton « Exporter CSV ». Liste des résultats : objet, référence mono, émetteur, direction, nombre d'actions, badge statut, bouton « Consulter ». Pagination.

## 13. RAPPORTS D'AUDIT (route "/audit/reports")
Header avec icône jaune + « Nouveau rapport ». Liste de rapports : titre, période (dates), date de génération, KPIs inline (courriers traités, délai moyen, anomalies avec icône alerte/ok), badge « Généré », boutons « Détail », « PDF », « Excel » et menu « Autres » (CSV / JSON). Modale « Nouveau rapport » : titre + dates début/fin. Modale « Détail » : grille du résumé des indicateurs + exports.

## 14. ANOMALIES AUDIT (route "/audit/anomalies")
Header avec icône rouge + compteur d'anomalies en cours (détection automatique : délai 72h, workflow). Filtres : type (Délai dépassé / Workflow) et statut (En cours / Traitées). Liste de cartes : icône colorée selon gravité (haute red / moyenne amber / basse), titre, objet, référence mono, date de détection, badges gravité + statut, boutons « Consulter » et « Traiter ».

## 15. ADMIN — MINISTÈRES (route "/admin/ministeres")
Header + « Nouveau ministère ». Recherche. Grille de cartes : icône building, nom, code mono, actions Modifier/Supprimer au survol. Modale CRUD : nom + code (optionnel).

## 16. ADMIN — DIRECTIONS (route "/admin/directions")
Header + « Nouvelle direction ». Grille de cartes : icône users, nom, badge type (Direction du Courrier / DSI / DAF / DRH / Autre), ministère de rattachement, actions Modifier/Supprimer. Modale CRUD : ministère (select), nom, type.

## 17. ADMIN — UTILISATEURS (route "/admin/utilisateurs")
Header + « Nouvel utilisateur ». Recherche (nom, prénom, email). Liste de cartes : avatar avec initiales, nom/prénom, badge rôle coloré (Agent Courrier secondary, Responsable info, Directeur default, Auditeur warning, Super Admin destructive, Gouvernement success), email, affiliation (direction ou ministère), actions Modifier/Supprimer au survol. Modale CRUD : nom, prénom, email, mot de passe, rôle (select), puis selon le rôle soit Direction soit Ministère (règle : directeur rattaché au ministère sans direction).

## 18. ACTUALITÉS GÉNÉRALES (route "/actualites")
Header avec icône fuchsia Newspaper. Liste de publications publiques : badges type + priorité (haute/urgente destructive/amber) + « Nouveau » teal, titre, date de publication, chevron droit. Clic → détail.

## 19. ACTUALITÉS MINISTÈRE (route "/actualites/ministere")
Même liste que les générales mais filtrée par ministère : badge ministère cible en plus. Icône rose Landmark.

## 20. DÉTAIL ACTUALITÉ (route "/actualites/[id]")
En-tête : badges (type, portée, priorité, ministère), titre, auteur + date. Carte « Contenu » (texte préformaté). Carte « Pièces jointes » (liste fichiers avec taille + téléchargement ; upload drag&drop réservé au Gouvernement). Si portée ministère : carte « Accusé de réception » (liste des AR avec nom, date, commentaire, icône check teal ; bouton « Accuser réception » pour le directeur avec commentaire optionnel) + panneau « Discussion » (lecture + écriture réservée Gouvernement et directeur du ministère).

## 21. PUBLIER UNE ACTUALITÉ (route "/gouvernement/publier")
Réservé au Gouvernement. Formulaire : Titre, Contenu (textarea), Type (Communiqué / Information / Ordre-mission / Alerte), Priorité (Normale / Haute / Urgente), Portée (Tous les ministères / Un ministère spécifique → select ministère), Pièces jointes (optionnel, drag & drop). Boutons « Publier maintenant » et « Enregistrer brouillon ».

## 22. PARAMÈTRES (route "/settings")
4 cartes empilées (max-w-3xl) : « Profil » (nom, prénom, email désactivé, bouton Sauvegarder, message succès/erreur inline), « Apparence » (toggle thème sombre/clair), « Notifications » (3 switches : nouveaux courriers, rappels de traitement, mises à jour de statut), « Sécurité » (changer le mot de passe : actuel + nouveau + confirmation avec toggles visibilité, note « min 6 caractères », bouton, messages inline).

## 23. MON PROFIL (route "/profile")
Carte en-tête : grand avatar avec initiales, nom complet, email, badges Rôle / Ministère / Direction. Carte « Informations personnelles » : prénom, nom, email (désactivé avec note « contactez un administrateur »), bouton Sauvegarder. Carte « Informations du compte » : lignes Rôle, Direction, Ministère avec icônes et séparateurs.

# CONSIGNES FINALES

- Génère un design system complet et cohérent : tu peux produire les écrans dans l'ordre logique ci-dessus en gardant exactement les mêmes composants réutilisables (carte, badge, bouton, select, input, pagination, état vide, modale).
- Chaque liste doit avoir un état de chargement (skeleton), un état d'erreur (message + bouton Réessayer) et un état vide élégant.
- Utilise des icônes linéaires fines cohérentes (style lucide).
- Badges de statut de courrier : En traitement (sky/info), Reçu (emerald/success), Envoyé (default), Brouillon (secondary), Archivé (outline).
- Privilégie la lisibilité et la densité d'information professionnelle, sans surcharge visuelle.
- Propose si possible 1-2 variantes raffinées de la page de connexion et du tableau de bord.
```

---

**Conseils d'utilisation :**
- Dans Stitch AI, collez ce prompt tel quel puis choisissez le premier écran à générer (commencez par le **tableau de bord** ou la **page de connexion** pour fixer l'identité visuelle).
- Fournissez à Stitch une capture d'écran actuelle de vos pages si l'outil le permet (onglet « Upload ») pour un rendu encore plus fidèle.
- Une fois un écran validé, générez les suivants dans le même fil de conversation pour conserver la cohérence.
