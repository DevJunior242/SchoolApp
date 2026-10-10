<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Alerte de sécurité : une session ouverte sur un appareil est utilisée depuis
 * un autre type d'appareil (jeton de connexion probablement copié).
 */
class SessionUsedElsewhereNotification extends Notification
{
    public function __construct(
        public readonly string $loginDevice,
        public readonly string $usedFrom,
        public readonly string $ip,
    ) {}

    public function via($notifiable): array
    {
        return ['brevo'];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Activité inhabituelle sur votre compte — '.config('app.name'))
            ->greeting('Bonjour '.($notifiable->fullname ?? '').',')
            ->line('Une session ouverte sur « '.$this->loginDevice.' » vient d’être utilisée depuis « '.$this->usedFrom.' » (adresse IP '.$this->ip.').')
            ->line('Cela peut arriver après une mise à jour de votre navigateur. Sinon, quelqu’un a peut-être copié votre session.')
            ->action('Voir mes appareils connectés', rtrim(config('app.frontend_url'), '/').'/dashboard/security')
            ->line('En cas de doute : « Déconnecter tous les autres appareils », puis changez votre mot de passe.');
    }
}
