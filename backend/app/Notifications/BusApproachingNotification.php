<?php

namespace App\Notifications;

use App\Models\BusStop;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Info à fenêtre courte (quelques minutes) : un email arrivant en différé
 * serait trompeur plutôt qu'utile. Cloche uniquement pour l'instant — sans
 * infra de push natif, c'est le canal le plus honnête qu'on puisse offrir.
 * Envoyée une seule fois par (trajet, arrêt), voir BusTripController.
 */
class BusApproachingNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly BusStop $stop, private readonly int $etaMinutes) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title' => 'Bus en approche',
            'message' => "Le bus arrive dans environ {$this->etaMinutes} minute(s) à l'arrêt « {$this->stop->label} ».",
            'bus_stop_id' => $this->stop->id,
            'url' => '/dashboard/my-children-bus',
        ];
    }
}
