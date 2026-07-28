<?php

namespace App\Notifications;

use App\Models\EventRecap;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class EventRecapPublishedNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly EventRecap $eventRecap) {}

    /**
     * Publié une seule fois par événement (pas à chaque photo ajoutée) :
     * pas besoin d'un canal mail, la cloche de notifications suffit.
     */
    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        $this->eventRecap->loadMissing('event');

        return [
            'title' => 'Récapitulatif publié',
            'message' => "Le récap de « {$this->eventRecap->event->title} » est disponible.",
            'event_id' => $this->eventRecap->event_id,
            'url' => "/dashboard/events/{$this->eventRecap->event_id}/recap",
        ];
    }
}
