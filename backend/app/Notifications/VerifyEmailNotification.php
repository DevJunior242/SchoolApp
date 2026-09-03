<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class VerifyEmailNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly string $url) {}

    public function via($notifiable): array
    {
        return ['brevo'];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Vérifiez votre adresse email — Intellino Services.')
            ->line('Merci de confirmer votre adresse email pour activer toutes les fonctionnalités de votre compte.')
            ->action('Vérifier mon email', $this->url)
            ->line('Ce lien expire dans 60 minutes.')
            ->line("Si vous n'êtes pas à l'origine de cette inscription, aucune action n'est requise.");
    }
}
