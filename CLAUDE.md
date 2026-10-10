# EduAfrique / SchoolApp

SaaS de gestion scolaire (Laravel + React) — `backend` et `frontend-ui`.

## Module RH du personnel : règle avec Intellino RH (décidée le 2026-09-27)

- **Intellino RH (`/home/devjunior/Présento`) est la référence pour tout ce qui touche au personnel.** Une nouveauté RH naît là-bas, puis est reprise ici seulement si les écoles en ont besoin (ex. kiosque « QR seul »). Un bug corrigé dans l'un est vérifié dans l'autre.
- SchoolApp garde un module RH suffisant pour une école (pointage, congés, paie simple) ; les fonctions avancées peuvent rester propres à Intellino RH.
- Marchés distincts (écoles / entreprises) : pas de cannibalisation. Plus tard : paquet partagé une fois le module stable.

## À reprendre d'Intellino RH (noté le 2026-09-29, pas encore fait)

Déjà faits et testés dans Intellino RH (`/home/devjunior/Présento`, voir son CLAUDE.md, « Règles anti-fraude »). À reprendre ici en remplaçant entreprise par école, **puis retirer la ligne de cette liste** :

1. **Ticket de scan** : c'est le plus urgent.
   - Problème : le QR tournant (30 s) est vérifié à l'envoi du pointage. Pendant la recherche de position (jusqu'à 30 s ici), il expire → refus.
   - Solution là-bas : `POST /hr/attendance/scan` vérifie le QR au scan et rend un ticket de 120 s, à usage unique et lié au compte (`claimTicket` / `consumeTicket`, cache). Le pointage envoie `ticket` ; `token` reste accepté pour les anciennes pages.
   - Côté front : `handlePunch` dans `DashboardMyAttendancePage.jsx`.
   - Test : `test_scan_ticket_gives_time_to_confirm_after_qr_expires`.
2. **Recherche GPS en plusieurs mesures au pointage** :
   - `utils/gps.js` (`pickBestReading`, `isInsideZone`), `utils/useGpsCollection.js` et `components/GpsCollectionCard.jsx` ;
   - `watchPosition` en haute précision pendant 10 s dès l'ouverture de « Mon pointage », puis la meilleure mesure ;
   - `my-attendance` renvoie `office` (position, rayon, `max_accuracy_meters`) ;
   - remplace `getCurrentPosition()` de `staffDevice.js` au pointage.
3. **« Utiliser ma position » des réglages en plusieurs mesures** : même hook avec `autoStart: false`, 15 s, garde la mesure la plus précise (`OfficeGpsStatus` dans `StaffAttendanceSettingsCard.jsx`).
4. **Téléphone du directeur** :
   - Problème : `visibleUserIds` retire la personne connectée, donc un directeur ne voit ni ne valide son propre changement de téléphone (bloqué s'il n'y a personne au-dessus).
   - Solution là-bas : le dirigeant voit le sien (`deviceUserIds`, pastille « Vous », `is_me`), avec **mot de passe exigé** (`confirmOwnDevice`). La RH ne gère jamais le sien. Le compteur du tableau de bord suit la même règle.
   - Ici : décider quel rôle d'école a ce droit (fondateur / directeur).
5. **Message « Vous étiez à X m » après un pointage** : `distance_meters` est déjà calculé ici ; vérifier que l'employé le voit (`DashboardMyAttendancePage.jsx`).

## Appareils connectés et sessions (repris d'Intellino RH le 2026-10-04)

Même système qu'Intellino RH (`SessionService`, voir son CLAUDE.md) :
- tout jeton passe par `SessionService::issue` (inscription, connexion, code 2FA), jamais `createToken` directement : appareil, IP et `device_hash` (en-tête `X-Client-Id` envoyé par `api/axios.jsx`) ;
- **expiration glissante** : jeton inutilisé depuis 30 jours refusé (`Sanctum::authenticateAccessTokensUsing`), supprimé par `auth:prune-sessions` (planifié à 03:15 dans `bootstrap/app.php`, et lancé aussi à chaque démarrage du conteneur) ;
- **nouvel appareil** (`login_devices`) : e-mail `NewLoginNotification`, sauf pour le premier appareil du compte ;
- **jeton copié** (utilisé depuis un autre type d'appareil, ex. curl) : `flagged_at`, e-mail `SessionUsedElsewhereNotification`, pastille « Activité inhabituelle » ;
- page `/dashboard/security` : carte `components/ActiveSessionsCard.jsx` (`GET /me/sessions`, `DELETE /me/sessions/{id}`, `POST /me/sessions/logout-others`) ;
- tests : `tests/Feature/SessionsTest.php`.

## Tâches planifiées (activées le 2026-10-04)

`start.sh` lance `php artisan schedule:work &` (comme Intellino RH) : les tâches de `withSchedule` dans `bootstrap/app.php` tournent chaque jour. Avant, aucune ne tournait en production. Activé quand aucune école réelle n'était inscrite :
- `schools:expire-trials` : relance les écoles en fin d'essai, **passe en lecture seule** celles dont l'essai est fini, bloque celles qui dépassent le quota de personnel ;
- `health:notify-expiring-vaccinations`, `library:notify-loan-due-dates` : e-mails ;
- `auth:prune-sessions` (03:15) : supprime les sessions inutilisées depuis 30 jours.
Toute nouvelle tâche ajoutée à `withSchedule` part en production au déploiement suivant.

## Déploiement (VPS OVH, mis à jour le 2026-09-27)

VPS OVH `51.91.251.26` (`ssh ovh`), partagé avec Intellino et Intellino RH (Présento) mais **projets totalement séparés** : ne jamais utiliser les scripts, ports, conteneurs ou bases des autres.

| | **SchoolApp** | Intellino | Intellino RH |
|---|---|---|---|
| Domaine | edu.intellino.tech | intellino.tech | rh.intellino.tech |
| Dossier | /var/www/schoolapp | /var/www/intellino | /var/www/rh |
| Front servi | /var/www/schoolapp/frontend | /var/www/intellino-frontend | /var/www/rh-frontend |
| Port API / MySQL | 8080 / 3306 | 8081 / 3307 | 8082 / 3308 |
| Conteneurs | schoolapp-app / schoolapp-db | intellino-app / -db | rh-app / rh-db |
| Alias | `deploy` | `deploy-intellino` | `deploy-rh` |

- Mise à jour : `git push` puis `ssh ovh` → `deploy` (`deploy.sh` du dépôt) : `git pull --ff-only`, reconstruction du conteneur, vérification de l'API (`/up`), front compilé dans **`node:24.21.0-alpine`** (version figée le 2026-10-02, `NODE_IMAGE`, comme Intellino RH) puis `rsync --delete` vers `/var/www/schoolapp/frontend`. S'arrête à la première erreur : si la compilation échoue, l'ancien site reste en ligne. Ne pas mettre npm à jour (npm 12 = version majeure).
- Même modèle qu'Intellino RH : `backend/Dockerfile`, `backend/.dockerignore`, `backend/docker-compose.yml` (dans le dépôt, ports sur 127.0.0.1 seulement, `restart: unless-stopped`, réseau `schoolapp-network` en `external`) et `backend/start.sh`.
- `backend/.env` n'existe que sur le serveur ; il contient aussi `DB_PASSWORD` et `DB_ROOT_PASSWORD`, lus par docker-compose (jamais de mot de passe dans le dépôt). Après modification : `docker compose up -d --force-recreate app`. Artisan : `docker exec -it schoolapp-app php artisan …`. MySQL : tunnel SSH vers 127.0.0.1:3306.
- **Jamais de `composer require` dans le conteneur** : ajouter le paquet en local, committer `composer.json` + `composer.lock`, déployer. L'image est construite avec `--no-scripts` : `.dockerignore` exclut `bootstrap/cache/*.php` (un vieux `packages.php` copié dans l'image « oubliait » laravel-phone) et `start.sh` lance `package:discover` au démarrage.
- **Jamais de commande qui efface la base en production** (`migrate:fresh`, `migrate:refresh`, `migrate:reset`, `db:wipe`) : de vraies écoles l'utilisent. Pour changer des données, une nouvelle migration ; ne jamais proposer ces commandes à l'utilisateur.
- Aucun fichier PHP ne doit avoir de ligne vide ou d'espace avant `<?php` : la sortie part avant les en-têtes et **toutes** les réponses de l'API deviennent vides (panne du 2026-09-27 causée par `config/cors.php`).

## CGU et politique de confidentialité (2026-09-27)

Pages texte `/terms` et `/privacy` (`components/LegalDocument.jsx`), contenu dans `frontend-ui/src/legal/content.js` (converti depuis les anciens PDF v1.0, mentions de l'éditeur complétées : siège Trame d'accueil Ouaga 2000, RCCM BFOUA012025B1312204, IFU 00279731J). « Télécharger (PDF) » génère le PDF au clic avec jsPDF (`utils/legalPdf.js`, même générateur qu'Intellino RH). Changement substantiel : `LEGAL_VERSION` (front) **et** `terms_version` (`backend/config/legal.php`). Les anciens PDF de `public/` ne sont plus utilisés.

## Écran d'accueil « QR seul » (kiosque, repris d'Intellino RH le 2026-09-27)

`/kiosque/:token` (public, hors `PublicLayout`, aucun compte connecté) affiche le QR renouvelé ; API publique `GET /api/kiosk/{token}` (throttle 20/min). Lien créé / remplacé / désactivé par la RH depuis la page Présence (`KioskLinkCard`, `GET|POST|DELETE /schools/{school}/hr/attendance/kiosk`, `SchoolKioskController`). Jeton chiffré + empreinte dans `school_staff_attendance_settings` (`kiosk_token*`). Mode écran uniquement (422 en mode imprimé). `StaffAttendancePunchService::issueRotatingToken()` sert la page RH et le kiosque. Test : `StaffAttendanceSecurityTest::test_kiosk_link_shows_qr_without_login_and_can_be_revoked`.

## Position de l'établissement sur une carte (reprise d'Intellino RH, 2026-09-28)

Contrôle GPS du pointage du personnel : la position se choisit sur une carte (`components/OfficeLocationPicker.jsx`, react-leaflet + tuiles et recherche d'adresse OpenStreetMap/Nominatim, vue **satellite Esri** + noms de lieux si `VITE_ESRI_API_KEY` est défini (bouton Plan / Satellite, satellite par défaut ; sans clé : plan seul), chargée à la demande par `lazy` dans `StaffAttendanceSettingsCard.jsx`) : clic sur l'établissement, cercle du rayon, réglette 20–1000 m ; latitude/longitude seulement dans « Saisir les coordonnées (avancé) ». Les tuiles ne sont pas mises en cache par la PWA (autre domaine, aucune règle `runtimeCaching`). OpenStreetMap ajouté aux prestataires de la politique de confidentialité.

## Page `/dashboard` jamais blanche (corrigé le 2026-10-02)

`pages/DashboardOverviewPage.jsx` redirige selon le rôle. Avant, elle renvoyait `null` (page blanche **sans erreur**, donc invisible pour `AppErrorBoundary`) pour le superadmin, le prestataire, un compte sans école en cours et un rôle absent de la liste.
- superadmin → `/dashboard/all-schools` ;
- prestataire → `/dashboard/my-marketplace-items` ;
- sans école en cours → carte « Choisissez une école » (`/dashboard/schools`) ou « Créer une école » (`/create-school`) ;
- rôle sans tableau de bord dédié → carte « Bienvenue » ;
- pendant le chargement → indicateur de chargement.
Règle : une page ne renvoie jamais `null` à la fin ; toujours un contenu, une redirection ou un message.
Vérifié le même jour : tous les rôles des seeders ont une redirection, et toutes les cibles comme tous les liens du menu ont une route. Ajouts :
- `RoleProtectedRoute` affiche un indicateur de chargement au lieu de `null` ;
- `<Route path="*">` (404) à l'intérieur de `/dashboard`, car une adresse inconnue y affichait le menu avec un contenu vide.

## Fondateur non salarié (`school_users.is_staff`, 2026-10-10)

- `is_staff` vrai pour tous les membres, **faux pour le créateur de l'école** (`admin` + `is_owner`) : il n'a pas « Mon espace » (Mon pointage / Ma paie) dans le menu et le pointage lui est refusé (403).
- Il peut l'activer lui-même dans Mon profil (« Je travaille aussi comme salarié de l'école », `OwnerStaffStatusCard`, `PUT /schools/{school}/my-staff-status`, réservé au créateur).
- Différence voulue avec Intellino RH, où tout le monde pointe, dirigeant compris.
- Tests : `tests/Feature/SchoolOwnerStaffStatusTest.php`.

## Tableau de bord du professeur (2026-10-10)

- `/dashboard/teacher` (`pages/TeacherDashboardPage.jsx`) : classes, élèves, appels à faire aujourd'hui (bouton « Faire l'appel » par cours), notes saisies sur 7 jours, moyenne par classe. Avant, le « Tableau de bord » du professeur était la liste « Mes cours » (`/my-assignments`).
- API `GET /schools/{school}/my-teaching-summary` (`DashboardController::teacherSummary`) : existait sans page ; corrigée (filtre de section via `level`, l'ancien `classes.section_id` n'existe pas → erreur 500 pour un prof limité à une section), cours du jour limités à l'année en cours, `attendance_taken` par cours. Test : `TeacherDashboardSummaryTest`.
- Raccourcis du professeur (`QuickActions`) : ne pas renvoyer vers `/dashboard/my-courses` (page élève) ni `/dashboard/assignments` (inexistante).

## Données pour l'inspection : PDI, handicap, redoublant (2026-10-10)

- `students.is_displaced` + `displaced_origin` (PDI), `students.has_disability` + `disability_type` (`Student::DISABILITY_TYPES` : moteur, visuel, auditif, intellectuel, autre), `class_student.is_repeating` (propre à l'année/classe). Migration `2026_10_10_000002`.
- **Données sensibles** : dans `$hidden` du modèle `Student` (`SENSITIVE_FIELDS`), donc jamais envoyées par défaut ; rendues visibles seulement dans `GET /students` pour `admin` et `secretaire` (`SENSITIVE_VIEWER_ROLES`). Ne pas les retirer de `$hidden`.
- Saisie à l'inscription et via « Situation (inspection) » dans la liste des élèves (`PUT /schools/{school}/students/{student}/situation`, admin/secrétariat) ; composant `components/StudentSituationFields.jsx`, constantes `utils/studentSituation.js`.
- **Rapport pour l'inspection** : `/dashboard/inspection-report` (`pages/InspectionReportPage.jsx`, menu admin et secrétariat), API `GET /schools/{school}/reports/inspection` (`InspectionReportController`, mêmes rôles, section respectée). Par niveau puis classe : effectif, dont PDI, dont handicap, dont redoublants (G/F/T) + handicap par type ; année scolaire en cours, élèves actifs seulement, aucun nom. Export PDF (jsPDF + autotable, paysage, zone signature/cachet) et « Excel » = CSV `;` avec BOM (pas de bibliothèque Excel). **Version standard** : à ajuster aux colonnes exactes du formulaire officiel dès qu'on en a une copie. Test : `InspectionReportTest`.
- Pas encore fait : la mention dans la politique de confidentialité (`legal/content.js` + `LEGAL_VERSION`).
- Tests : `StudentInspectionFieldsTest`.

## Effectif garçons / filles par classe (2026-10-10)

`App\Services\ClassHeadcountService::forClasses()` : élèves inscrits dans la classe (`class_student` actif) **et** actifs dans l'école, comptés G / F / total. Utilisé par la page Classes (champ `effectif` de `GET /classes`, pastille « 47 élèves · 22 G / 25 F ») et le tableau de bord du professeur (`class_headcounts` de `my-teaching-summary`, carte « Effectif de mes classes »). Garder ce calcul unique pour que les chiffres concordent partout. Test : `ClassHeadcountTest`.
