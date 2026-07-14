<?php

namespace App\Notifications;

use App\Models\Attendance;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class StudentAbsentNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Attendance $attendance) {}

    public function via($notifiable): array
    {
        return ['database', 'brevo'];
    }

    public function toDatabase($notifiable): array
    {
        $this->attendance->loadMissing(['student', 'classSubjectTeacher.subject', 'classSubjectTeacher.schoolClass']);

        return [
            'title' => 'Absence signalée',
            'message' => sprintf(
                '%s a été marqué(e) absent(e) en %s (%s) le %s.',
                $this->attendance->student->fullname,
                $this->attendance->classSubjectTeacher->subject->name,
                $this->attendance->classSubjectTeacher->schoolClass->name,
                $this->attendance->date->format('d/m/Y'),
            ),
            'attendance_id' => $this->attendance->id,
            'student_id' => $this->attendance->student_id,
            'url' => '/dashboard/my-children-attendances',
        ];
    }

    public function toMail($notifiable): MailMessage
    {
        $this->attendance->loadMissing(['student', 'classSubjectTeacher.subject', 'classSubjectTeacher.schoolClass']);

        return (new MailMessage)
            ->subject('Absence de '.$this->attendance->student->fullname.' — EduAfrique')
            ->line(sprintf(
                '%s a été marqué(e) absent(e) en %s (%s) le %s.',
                $this->attendance->student->fullname,
                $this->attendance->classSubjectTeacher->subject->name,
                $this->attendance->classSubjectTeacher->schoolClass->name,
                $this->attendance->date->format('d/m/Y'),
            ))
            ->line("Vous pouvez justifier cette absence depuis votre espace parent.");
    }
}
