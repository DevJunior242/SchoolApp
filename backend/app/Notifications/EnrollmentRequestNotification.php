<?php

namespace App\Notifications;

use App\Models\EnrollmentRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EnrollmentRequestNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly EnrollmentRequest $enrollmentRequest) {}

    public function via($notifiable): array
    {
        return ['database', 'brevo'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title' => 'Nouvelle demande de pré-inscription',
            'message' => sprintf(
                '%s souhaite inscrire %s%s.',
                $this->enrollmentRequest->parent_fullname,
                $this->enrollmentRequest->child_fullname,
                $this->enrollmentRequest->level_wanted ? " en {$this->enrollmentRequest->level_wanted}" : '',
            ),
            'enrollment_request_id' => $this->enrollmentRequest->id,
            'url' => '/dashboard/enrollment-requests',
        ];
    }

    public function toMail($notifiable): MailMessage
    {
        $message = (new MailMessage)
            ->subject('Nouvelle demande de pré-inscription — EduAfrique')
            ->line(sprintf(
                '%s souhaite inscrire %s%s.',
                $this->enrollmentRequest->parent_fullname,
                $this->enrollmentRequest->child_fullname,
                $this->enrollmentRequest->level_wanted ? " en {$this->enrollmentRequest->level_wanted}" : '',
            ));

        if ($this->enrollmentRequest->parent_phone) {
            $message->line('Téléphone : '.$this->enrollmentRequest->parent_phone);
        }

        if ($this->enrollmentRequest->parent_email) {
            $message->line('Email : '.$this->enrollmentRequest->parent_email);
        }

        if ($this->enrollmentRequest->message) {
            $message->line('Message : '.$this->enrollmentRequest->message);
        }

        $message->line('Rendez-vous dans "Demandes d\'inscription" pour accepter ou refuser cette demande.');

        return $message;
    }
}
