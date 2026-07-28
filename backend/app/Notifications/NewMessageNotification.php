<?php

namespace App\Notifications;

use App\Models\Message;
use App\Models\SchoolUser;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewMessageNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Message $message) {}

    /**
     * Pas de canal mail : un email par message échangé serait beaucoup trop
     * fréquent (chaque réponse dans une conversation en enverrait un). La
     * cloche de notifications (site) suffit pour ce cas d'usage.
     */
    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title' => 'Nouveau message',
            'message' => sprintf(
                '%s : %s',
                $this->message->sender->fullname,
                str($this->message->body)->limit(80),
            ),
            'message_id' => $this->message->id,
            'url' => $this->urlFor($notifiable),
        ];
    }

    /**
     * Le staff (directeur/secrétariat) gère tous les fils depuis la boîte de
     * réception ; un utilisateur classique n'a que son propre fil, accessible
     * depuis l'icône de messagerie du tableau de bord.
     */
    private function urlFor($notifiable): string
    {
        $isStaff = SchoolUser::query()
            ->where('school_id', $this->message->school_id)
            ->where('user_id', $notifiable->id)
            ->whereHas('role', fn ($query) => $query->whereIn('slug', ['directeur', 'secretaire']))
            ->exists();

        return $isStaff ? '/dashboard/messages' : '/dashboard';
    }
}
