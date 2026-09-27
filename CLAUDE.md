# EduAfrique / SchoolApp

SaaS de gestion scolaire (Laravel + React) — `backend` et `frontend-ui`.

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
- `backend/.env` et `backend/docker-compose.yml` n'existent que sur le serveur. Artisan : `docker exec -it schoolapp-app php artisan …`.
- **Jamais de `composer require` dans le conteneur** : ajouter le paquet en local, committer `composer.json` + `composer.lock`, déployer. L'image est construite avec `--no-scripts`, c'est `start.sh` qui lance `package:discover` au démarrage.
- Aucun fichier PHP ne doit avoir de ligne vide ou d'espace avant `<?php` : la sortie part avant les en-têtes et **toutes** les réponses de l'API deviennent vides (panne du 2026-09-27 causée par `config/cors.php`).

## CGU et politique de confidentialité (2026-09-27)

Pages texte `/terms` et `/privacy` (`components/LegalDocument.jsx`), contenu dans `frontend-ui/src/legal/content.js` (converti depuis les anciens PDF v1.0, mentions de l'éditeur complétées : siège Trame d'accueil Ouaga 2000, RCCM BFOUA012025B1312204, IFU 00279731J). « Télécharger (PDF) » génère le PDF au clic avec jsPDF (`utils/legalPdf.js`, même générateur qu'Intellino RH). Changement substantiel : `LEGAL_VERSION` (front) **et** `terms_version` (`backend/config/legal.php`). Les anciens PDF de `public/` ne sont plus utilisés.
