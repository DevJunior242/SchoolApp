<?php

namespace App\Notifications;

use App\Models\Event;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SchoolEventNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Event $event) {}

    public function via($notifiable): array
    {
        return ['database', 'brevo'];
    }

    public function toDatabase($notifiable): array
    {
        $this->event->loadMissing('schoolClass');

        return [
            'title' => 'Nouvel événement',
            'message' => sprintf(
                '%s — %s%s',
                $this->event->title,
                $this->event->start_at->format('d/m/Y à H:i'),
                $this->event->schoolClass ? " ({$this->event->schoolClass->name})" : '',
            ),
            'event_id' => $this->event->id,
            'url' => '/dashboard/events',
        ];
    }

    public function toMail($notifiable): MailMessage
    {
        $this->event->loadMissing('schoolClass');

        $message = (new MailMessage)
            ->subject($this->event->title.' — EduAfrique')
            ->line(sprintf(
                '%s : %s',
                $this->event->schoolClass ? "Un nouvel événement concerne la classe {$this->event->schoolClass->name}" : "Un nouvel événement concerne toute l'école",
                $this->event->title,
            ))
            ->line('Date : '.$this->event->start_at->format('d/m/Y à H:i'));

        if ($this->event->location) {
            $message->line('Lieu : '.$this->event->location);
        }

        if ($this->event->description) {
            $message->line($this->event->description);
        }

        return $message;
    }
}
