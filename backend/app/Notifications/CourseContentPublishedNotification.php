<?php

namespace App\Notifications;

use App\Models\CourseContent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Une classe entière (élèves + parents) est notifiée à chaque publication :
 * mise en file d'attente pour ne pas ralentir la requête du professeur
 * (même raisonnement que pour l'inscription d'élèves en masse). Cloche
 * uniquement — pas d'email, une publication de cours n'est pas assez rare
 * pour justifier ce canal (contrairement au matricule à l'inscription).
 */
class CourseContentPublishedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly CourseContent $content) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        $this->content->loadMissing('classSubjectTeacher.subject');

        $categoryLabel = match ($this->content->category) {
            CourseContent::CATEGORY_VIDEO => 'Vidéo',
            CourseContent::CATEGORY_DEVOIR => 'Devoir',
            CourseContent::CATEGORY_EXAMEN => 'Examen',
            default => 'Contenu',
        };

        return [
            'title' => "Nouveau contenu — {$this->content->classSubjectTeacher->subject->name}",
            'message' => "{$categoryLabel} : {$this->content->title}",
            'url' => '/dashboard/my-courses',
        ];
    }
}
