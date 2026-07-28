<?php

namespace App\Notifications;

use App\Models\BookReservation;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class BookReservationReadyNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly BookReservation $reservation) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        $this->reservation->loadMissing('book');

        return [
            'title' => 'Livre disponible',
            'message' => "« {$this->reservation->book->title} » est disponible, à retirer à la bibliothèque.",
            'url' => '/dashboard/my-library',
        ];
    }
}
