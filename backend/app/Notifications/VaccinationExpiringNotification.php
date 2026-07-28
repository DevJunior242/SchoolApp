<?php

namespace App\Notifications;

use App\Models\StudentVaccination;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class VaccinationExpiringNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly StudentVaccination $vaccination) {}

    /**
     * Une seule fois par vaccin (marqué `expiry_notified` par la commande
     * planifiée) : pas besoin d'un canal mail, la cloche suffit.
     */
    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        $this->vaccination->loadMissing('student');
        $days = now()->diffInDays($this->vaccination->expires_at);

        return [
            'title' => 'Vaccin bientôt expiré',
            'message' => sprintf(
                'Le vaccin %s de %s expire dans %d jour%s.',
                $this->vaccination->name,
                $this->vaccination->student->fullname,
                $days,
                $days > 1 ? 's' : '',
            ),
            'student_id' => $this->vaccination->student_id,
            'url' => "/dashboard/students/{$this->vaccination->student_id}/health",
        ];
    }
}
