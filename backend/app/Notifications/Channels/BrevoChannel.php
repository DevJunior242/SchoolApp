<?php

namespace App\Notifications\Channels;

use App\Services\BrevoService;
use Illuminate\Mail\Markdown;
use Illuminate\Notifications\Notification;

class BrevoChannel
{
    public function __construct(
        private readonly Markdown $markdown,
        private readonly BrevoService $brevo,
    ) {}

    public function send(mixed $notifiable, Notification $notification): void
    {
        $message = $notification->toMail($notifiable);

        $recipient = $notifiable->routeNotificationFor('brevo', $notification)
            ?? $notifiable->routeNotificationFor('mail', $notification);

        if (! $recipient) {
            return;
        }

        $theme = $message->theme ?? config('mail.markdown.theme', 'default');
        $html = $this->markdown->theme($theme)->render($message->markdown, $message->data());

        $this->brevo->send(
            toEmail: is_string($recipient) ? $recipient : $recipient->email,
            toName: $notifiable->fullname ?? '',
            subject: $message->subject ?: class_basename($notification),
            htmlContent: $html,
        );
    }
}
