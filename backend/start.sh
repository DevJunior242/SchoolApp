#!/bin/bash
# L'image est construite avec « composer --no-scripts » : sans package:discover,
# les paquets (ex. propaganistas/laravel-phone) ne sont pas enregistrés et l'API
# tombe après chaque déploiement. On le lance ici, au démarrage du conteneur.
php artisan package:discover --ansi
php artisan config:clear
php artisan cache:clear
php artisan config:cache
php artisan route:cache
php artisan migrate --force
[ -e public/storage ] || php artisan storage:link
php artisan queue:work --daemon &
php artisan serve --host=0.0.0.0 --port=8080
