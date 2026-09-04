<?php

namespace App\Notifications;

use App\Models\School;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class StaffQuotaExpiredNotification extends Notification
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
            'title' => 'Palier de votre école à mettre à jour',
            'message' => "L'école {$this->school->name} dépasse toujours la limite de comptes du personnel. Elle est maintenant en lecture seule. Contactez-nous après la mise à jour du palier.",
            'school_id' => $this->school->id,
            'url' => '/dashboard',
        ];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('École mise en lecture seule — edu.intellino')
            ->line("L'école {$this->school->name} dépasse toujours la limite de comptes du personnel de son palier.")
            ->line('Votre école est maintenant en lecture seule : les données restent consultables, mais les nouvelles modifications sont bloquées.')
            ->line('Contactez-nous après la mise à jour du palier pour réactiver votre accès.');
    }
}
