# EduAfrique / SchoolApp

SaaS de gestion scolaire (Laravel + React) — `backend` et `frontend-ui`.

## ⚠️ IMPORTANT : ce VPS héberge DEUX projets distincts

Le serveur `62.238.60.188` héberge **deux applications séparées, sans rapport entre elles** :

| | **SchoolApp** (ce projet) | **Intellino / Martial SaaS** (autre projet, ne pas toucher) |
|---|---|---|
| Dossier VPS | `/var/www/SchoolApp/` | `/var/www/MartialSaaS/` |
| Frontend | port **80** | port **8080** |
| Backend API | port **8000** | port **8081** |
| Scripts déploiement | `deploy-backend`, `deploy-frontend` | `deploy-martial-backend`, `deploy-martial-frontend` |
| Base de données | `ibc_db` / user `ibc_app` | `martial_db` / user `martial_app` |
| Queue worker (systemd) | `ibc-queue.service` | `martial-queue.service` |
| Repos GitHub | `SchoolApp` | `intellino-backend`, `intellino-frontend` |

**Ne jamais utiliser les scripts/ports/dossiers de Martial SaaS pour ce projet, et inversement.** Les deux projets partagent le même nginx (server blocks différents) et le même MySQL (bases différentes) — ils ne doivent jamais se marcher dessus.

## Déploiement de CE projet

```bash
ssh root@62.238.60.188 "deploy-backend"    # git pull + composer install + migrate + cache clear + restart php-fpm/queue
ssh root@62.238.60.188 "deploy-frontend"   # git pull + npm install + build
```
