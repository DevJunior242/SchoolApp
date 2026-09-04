<?php

namespace App\Notifications;

use App\Models\School;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class StaffQuotaExpiringNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly School $school, private readonly int $daysLeft) {}

    public function via($notifiable): array
    {
        return ['database', 'brevo'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title' => 'Votre palier doit être mis à jour',
            'message' => "L'école {$this->school->name} dépasse la limite de comptes du personnel de son palier. Passez à un palier supérieur dans {$this->daysLeft} jour(s), sinon l'école sera mise en lecture seule.",
            'school_id' => $this->school->id,
            'url' => '/dashboard',
        ];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Mise à jour nécessaire pour votre école — edu.intellino')
            ->line("L'école {$this->school->name} dépasse la limite de comptes du personnel de son palier.")
            ->line("Vous avez {$this->daysLeft} jour(s) pour passer à un palier supérieur ou réduire le nombre de comptes du personnel.")
            ->line("À l'issue de ce délai, l'école passera en lecture seule jusqu'à régularisation.");
    }
}
