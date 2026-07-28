<?php

namespace App\Notifications;

use App\Models\BookLoan;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class BookLoanDueSoonNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly BookLoan $loan) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        $this->loan->loadMissing('copy.book', 'student');

        return [
            'title' => 'Retour de livre bientôt dû',
            'message' => sprintf(
                'Le livre « %s » emprunté par %s est à rendre le %s.',
                $this->loan->copy->book->title,
                $this->loan->student->fullname,
                $this->loan->due_at->translatedFormat('d/m/Y'),
            ),
            'url' => '/dashboard/my-library',
        ];
    }
}
