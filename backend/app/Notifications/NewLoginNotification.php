<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;

/**
 * Alerte de sécurité : connexion au compte depuis un appareil jamais vu.
 * Si ce n'est pas la personne, elle déconnecte l'appareil depuis « Sécurité ».
 */
class NewLoginNotification extends Notification
{
    public function __construct(
        public readonly string $device,
        public readonly string $ip,
        public readonly Carbon $at,
    ) {}

    public function via($notifiable): array
    {
        return ['brevo'];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Nouvelle connexion à votre compte — '.config('app.name'))
            ->greeting('Bonjour '.($notifiable->fullname ?? '').',')
            ->line('Votre compte '.config('app.name').' vient d’être ouvert depuis un nouvel appareil :')
            ->line('Appareil : '.$this->device)
            ->line('Adresse IP : '.$this->ip)
            ->line('Date : '.$this->at->copy()->timezone(config('app.timezone'))->format('d/m/Y à H:i').' (heure du serveur)')
            ->line('Si c’est vous, il n’y a rien à faire.')
            ->action('Voir mes appareils connectés', rtrim(config('app.frontend_url'), '/').'/dashboard/security')
            ->line('Si ce n’est pas vous : déconnectez cet appareil depuis « Sécurité », puis changez votre mot de passe. Changer le mot de passe ferme toutes les autres sessions.');
    }
}
