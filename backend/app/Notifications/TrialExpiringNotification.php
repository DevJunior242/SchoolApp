<?php

namespace App\Notifications;

use App\Models\School;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TrialExpiringNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly School $school) {}

    public function via($notifiable): array
    {
        return ['database', 'brevo'];
    }

    private function daysLeft(): int
    {
        return max(0, now()->diffInDays($this->school->trial_ends_at, false));
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title' => 'Votre essai gratuit se termine bientôt',
            'message' => sprintf(
                "L'essai gratuit de %s se termine dans %d jour(s). Contactez-nous pour continuer à utiliser votre espace sans interruption.",
                $this->school->name,
                $this->daysLeft(),
            ),
            'school_id' => $this->school->id,
            'url' => '/dashboard',
        ];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Votre essai gratuit edu.intellino se termine bientôt')
            ->line(sprintf(
                "L'essai gratuit de %s se termine dans %d jour(s).",
                $this->school->name,
                $this->daysLeft(),
            ))
            ->line('Passé ce délai, votre école passera en lecture seule : vos données resteront visibles mais vous ne pourrez plus rien ajouter ni modifier.')
            ->line('Contactez-nous dès maintenant pour continuer à utiliser votre espace sans interruption.');
    }
}
