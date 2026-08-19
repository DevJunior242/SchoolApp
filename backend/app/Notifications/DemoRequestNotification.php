<?php

namespace App\Notifications;

use App\Models\DemoRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DemoRequestNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly DemoRequest $demoRequest) {}

    public function via($notifiable): array
    {
        return ['database', 'brevo'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title' => 'Nouvelle demande de démo',
            'message' => sprintf(
                '%s souhaite une démo%s.',
                $this->demoRequest->school_name ?: 'Un visiteur',
                $this->demoRequest->email ? " ({$this->demoRequest->email})" : ($this->demoRequest->phone ? " ({$this->demoRequest->phone})" : ''),
            ),
            'demo_request_id' => $this->demoRequest->id,
            'url' => '/dashboard/demo-requests',
        ];
    }

    public function toMail($notifiable): MailMessage
    {
        $message = (new MailMessage)
            ->subject('Nouvelle demande de démo — Intellino')
            ->line(sprintf(
                '%s souhaite une démo.',
                $this->demoRequest->school_name ?: 'Un visiteur du site',
            ));

        if ($this->demoRequest->email) {
            $message->line('Email : '.$this->demoRequest->email);
        }

        if ($this->demoRequest->phone) {
            $message->line('Téléphone : '.$this->demoRequest->phone);
        }

        return $message->line('Message : '.$this->demoRequest->description);
    }
}
