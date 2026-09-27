# EduAfrique / SchoolApp

SaaS de gestion scolaire (Laravel + React) — `backend` et `frontend-ui`.

## Module RH du personnel : règle avec Intellino RH (décidée le 2026-09-27)

- **Intellino RH (`/home/devjunior/Présento`) est la référence pour tout ce qui touche au personnel.** Une nouveauté RH naît là-bas, puis est reprise ici seulement si les écoles en ont besoin (ex. kiosque « QR seul »). Un bug corrigé dans l'un est vérifié dans l'autre.
- SchoolApp garde un module RH suffisant pour une école (pointage, congés, paie simple) ; les fonctions avancées peuvent rester propres à Intellino RH.
- Marchés distincts (écoles / entreprises) : pas de cannibalisation. Plus tard : paquet partagé une fois le module stable.

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

- Mise à jour : `git push` puis `ssh ovh` → `deploy` (`deploy.sh` du dépôt) : `git pull --ff-only`, reconstruction du conteneur, vérification de l'API (`/up`), front compilé dans `node:24-alpine` puis `rsync --delete` vers `/var/www/schoolapp/frontend`. S'arrête à la première erreur.
- Même modèle qu'Intellino RH : `backend/Dockerfile`, `backend/.dockerignore`, `backend/docker-compose.yml` (dans le dépôt, ports sur 127.0.0.1 seulement, `restart: unless-stopped`, réseau `schoolapp-network` en `external`) et `backend/start.sh`.
- `backend/.env` n'existe que sur le serveur ; il contient aussi `DB_PASSWORD` et `DB_ROOT_PASSWORD`, lus par docker-compose (jamais de mot de passe dans le dépôt). Après modification : `docker compose up -d --force-recreate app`. Artisan : `docker exec -it schoolapp-app php artisan …`. MySQL : tunnel SSH vers 127.0.0.1:3306.
- **Jamais de `composer require` dans le conteneur** : ajouter le paquet en local, committer `composer.json` + `composer.lock`, déployer. L'image est construite avec `--no-scripts` : `.dockerignore` exclut `bootstrap/cache/*.php` (un vieux `packages.php` copié dans l'image « oubliait » laravel-phone) et `start.sh` lance `package:discover` au démarrage.
- Aucun fichier PHP ne doit avoir de ligne vide ou d'espace avant `<?php` : la sortie part avant les en-têtes et **toutes** les réponses de l'API deviennent vides (panne du 2026-09-27 causée par `config/cors.php`).

## CGU et politique de confidentialité (2026-09-27)

Pages texte `/terms` et `/privacy` (`components/LegalDocument.jsx`), contenu dans `frontend-ui/src/legal/content.js` (converti depuis les anciens PDF v1.0, mentions de l'éditeur complétées : siège Trame d'accueil Ouaga 2000, RCCM BFOUA012025B1312204, IFU 00279731J). « Télécharger (PDF) » génère le PDF au clic avec jsPDF (`utils/legalPdf.js`, même générateur qu'Intellino RH). Changement substantiel : `LEGAL_VERSION` (front) **et** `terms_version` (`backend/config/legal.php`). Les anciens PDF de `public/` ne sont plus utilisés.

## Écran d'accueil « QR seul » (kiosque, repris d'Intellino RH le 2026-09-27)

`/kiosque/:token` (public, hors `PublicLayout`, aucun compte connecté) affiche le QR renouvelé ; API publique `GET /api/kiosk/{token}` (throttle 20/min). Lien créé / remplacé / désactivé par la RH depuis la page Présence (`KioskLinkCard`, `GET|POST|DELETE /schools/{school}/hr/attendance/kiosk`, `SchoolKioskController`). Jeton chiffré + empreinte dans `school_staff_attendance_settings` (`kiosk_token*`). Mode écran uniquement (422 en mode imprimé). `StaffAttendancePunchService::issueRotatingToken()` sert la page RH et le kiosque. Test : `StaffAttendanceSecurityTest::test_kiosk_link_shows_qr_without_login_and_can_be_revoked`.
