<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\ClassStudent;
use App\Models\ClassSubjectTeacher;
use App\Models\Event;
use App\Models\ParentStudent;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolUser;
use App\Models\Student;
use App\Models\User;
use App\Notifications\SchoolEventNotification;
use Illuminate\Http\Request;

class EventController extends Controller
{
    use AuthorizesSchoolDirecteur;

    private const STAFF_ROLE_SLUGS = ['directeur', 'censeur', 'surveillant', 'secretaire', 'comptable'];

    /**
     * Le staff voit tous les événements de l'école. Les autres ne voient
     * que les événements globaux + ceux de leur(s) classe(s) (élève,
     * parent ou professeur).
     */
    public function index(Request $request, School $school)
    {
        $userId = $request->user()->id;

        $isStaff = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $userId)
            ->whereHas('role', fn ($query) => $query->whereIn('slug', self::STAFF_ROLE_SLUGS))
            ->exists();

        $query = Event::query()->where('school_id', $school->id);

        if (! $isStaff) {
            $classIds = $this->relevantClassIds($userId);
            $query->where(function ($q) use ($classIds) {
                $q->whereNull('class_id')->orWhereIn('class_id', $classIds);
            });
        }

        return response()->json(
            $query->with(['schoolClass', 'creator'])->orderBy('start_at')->get()
        );
    }

    public function store(Request $request, School $school)
    {
        $this->authorizeEventManager($request, $school);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['required', 'in:'.implode(',', [
                Event::TYPE_REUNION, Event::TYPE_EXAMEN, Event::TYPE_SORTIE,
                Event::TYPE_FERIE, Event::TYPE_BULLETIN, Event::TYPE_AUTRE,
            ])],
            'class_id' => ['nullable', 'uuid', 'exists:classes,id'],
            'start_at' => ['required', 'date'],
            'end_at' => ['nullable', 'date', 'after:start_at'],
            'location' => ['nullable', 'string', 'max:255'],
        ]);

        if (! empty($validated['class_id'])) {
            $belongsToSchool = SchoolClass::query()
                ->where('school_id', $school->id)
                ->where('id', $validated['class_id'])
                ->exists();

            abort_unless($belongsToSchool, 404);
        }

        $event = Event::query()->create([
            ...$validated,
            'school_id' => $school->id,
            'created_by' => $request->user()->id,
        ]);

        $this->notifyConcernedUsers($event, $school, $request->user()->id);

        return response()->json($event->load('schoolClass', 'creator'), 201);
    }

    public function destroy(Request $request, School $school, Event $event)
    {
        $this->authorizeEventManager($request, $school);
        abort_if($event->school_id !== $school->id, 404);

        $event->delete();

        return response()->json(status: 204);
    }

    private function relevantClassIds(string $userId): array
    {
        $asParent = ClassStudent::query()
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->whereHas('student.parents', fn ($query) => $query->where('parent_user_id', $userId))
            ->pluck('class_id');

        $asTeacher = ClassSubjectTeacher::query()->where('user_id', $userId)->pluck('class_id');

        $asStudent = ClassStudent::query()
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->whereHas('student', fn ($query) => $query->where('user_id', $userId))
            ->pluck('class_id');

        return $asParent->merge($asTeacher)->merge($asStudent)->unique()->values()->all();
    }

    private function notifyConcernedUsers(Event $event, School $school, string $creatorId): void
    {
        if ($event->class_id) {
            $userIds = $this->classAudienceUserIds($event->class_id);
        } else {
            $userIds = SchoolUser::query()->where('school_id', $school->id)->pluck('user_id')->all();
        }

        $recipients = User::query()->whereIn('id', $userIds)->where('id', '!=', $creatorId)->get();

        foreach ($recipients as $recipient) {
            $recipient->notify(new SchoolEventNotification($event));
        }
    }

    private function classAudienceUserIds(string $classId): array
    {
        $activeStudentIds = ClassStudent::query()
            ->where('class_id', $classId)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->pluck('student_id');

        $parentIds = ParentStudent::query()
            ->whereIn('student_id', $activeStudentIds)
            ->pluck('parent_user_id');

        $teacherIds = ClassSubjectTeacher::query()->where('class_id', $classId)->pluck('user_id');

        $studentUserIds = Student::query()
            ->whereIn('id', $activeStudentIds)
            ->whereNotNull('user_id')
            ->pluck('user_id');

        return $parentIds->merge($teacherIds)->merge($studentUserIds)->unique()->values()->all();
    }
}
