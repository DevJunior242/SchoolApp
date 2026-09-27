#!/bin/bash
# Déploiement de SchoolApp sur le VPS (alias « deploy »), sur le modèle de Présento.
# S'arrête à la première erreur : un déploiement raté laisse la version précédente en ligne.
set -euo pipefail

cd /var/www/schoolapp
git pull --ff-only origin main

# Backend (backend/.env n'existe que sur le serveur ; docker-compose.yml y lit les mots de passe MySQL)
cd backend
for key in DB_PASSWORD DB_ROOT_PASSWORD; do
    grep -q "^${key}=" .env || { echo "❌ ${key} manquant dans backend/.env"; exit 1; }
done
docker compose up -d --build
# Attendre le démarrage (start.sh : package:discover, cache, migrations) puis vérifier l'API
for i in $(seq 1 30); do
    curl -fsS -o /dev/null -H "Accept: application/json" http://127.0.0.1:8080/up && break
    sleep 2
done
docker exec schoolapp-app php artisan optimize
curl -fsS -o /dev/null -H "Accept: application/json" http://127.0.0.1:8080/up \
    || { echo "❌ L'API ne répond pas : docker logs schoolapp-app --tail 50"; exit 1; }

# Frontend : compilé dans un conteneur Node 24 pour ne pas dépendre du Node du serveur
cd ../frontend-ui
docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$PWD":/app -w /app node:24-alpine \
    sh -c "npm ci --no-audit --no-fund && npm run build"
# --delete : retire les anciens fichiers (sinon des milliers de vieux assets s'accumulent)
sudo rsync -a --delete --chmod=D755,F644 --exclude .well-known dist/ /var/www/schoolapp/frontend/

echo "✅ Déploiement terminé !"
