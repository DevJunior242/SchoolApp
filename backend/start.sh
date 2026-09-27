#!/bin/bash
# Lancé au démarrage du conteneur schoolapp-app (voir Dockerfile), même modèle qu'Intellino RH.
mkdir -p storage/logs storage/framework/cache/data storage/framework/sessions storage/framework/views
# L'image est construite avec « composer --no-scripts » : enregistre les paquets
# (ex. propaganistas/laravel-phone), sinon l'API tombe après chaque déploiement.
php artisan package:discover --ansi
# Lien public/storage -> storage/app/public, recréé si absent.
[ -e public/storage ] || php artisan storage:link
php artisan migrate --force
php artisan optimize:clear
php artisan optimize
php artisan queue:work &
exec php artisan serve --host=0.0.0.0 --port=8080 --no-reload
