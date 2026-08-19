<?php

namespace App\Notifications;

use App\Models\School;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TrialExpiredNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly School $school) {}

    public function via($notifiable): array
    {
        return ['database', 'brevo'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title' => 'Essai gratuit terminé',
            'message' => sprintf(
                "L'essai gratuit de %s est terminé. Votre espace est maintenant en lecture seule. Contactez-nous pour réactiver l'accès complet.",
                $this->school->name,
            ),
            'school_id' => $this->school->id,
            'url' => '/dashboard',
        ];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Essai gratuit terminé — EduAfrique')
            ->line("L'essai gratuit de {$this->school->name} est terminé.")
            ->line('Vos données restent consultables, mais toute création ou modification est bloquée jusqu\'à réactivation.')
            ->line('Contactez-nous pour réactiver l\'accès complet de votre école.');
    }
}
