<?php

namespace App\Notifications;

use App\Models\Student;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Le matricule doit atteindre le parent (et l'élève s'il a son propre
 * compte) même s'ils ne se connectent jamais à la plateforme : canal mail
 * obligatoire, pas seulement la cloche de notifications.
 *
 * Mise en file d'attente : une inscription peut porter sur plusieurs élèves
 * à la fois (le secrétariat saisit souvent toute une classe d'un coup), donc
 * plusieurs appels Brevo synchrones à la suite ralentiraient nettement la
 * requête si on ne les différait pas.
 */
class StudentEnrolledNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly Student $student) {}

    public function via($notifiable): array
    {
        return ['database', 'brevo'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title' => 'Inscription confirmée',
            'message' => "{$this->student->fullname} est inscrit(e). Matricule : {$this->student->matricule}.",
            'student_id' => $this->student->id,
            'url' => '/dashboard',
        ];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Inscription confirmée — {$this->student->fullname}")
            ->line("Bonjour,")
            ->line("{$this->student->fullname} est bien inscrit(e) dans l'établissement.")
            ->line("Matricule permanent : {$this->student->matricule}")
            ->line("Conservez précieusement ce matricule : il identifie votre enfant de façon permanente (bulletins, cantine, dossier administratif...), y compris s'il change d'établissement plus tard.");
    }
}
