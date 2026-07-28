<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\ClassStudent;
use App\Models\ClassSubjectTeacher;
use App\Models\CourseContent;
use App\Models\ParentStudent;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\Student;
use App\Notifications\CourseContentPublishedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class CourseContentController extends Controller
{
    use AuthorizesSchoolDirecteur;

    /**
     * Comme les routes sœurs (grades/attendances/students) : pas de
     * {school} dans l'URL, {assignment} porte déjà son école via
     * schoolClass.school_id.
     */
    public function index(Request $request, ClassSubjectTeacher $assignment)
    {
        $this->abortUnlessCanView($request, $assignment);

        return response()->json(
            CourseContent::query()
                ->where('class_subject_teacher_id', $assignment->id)
                ->orderByDesc('created_at')
                ->get()
        );
    }

    public function store(Request $request, ClassSubjectTeacher $assignment)
    {
        $this->abortUnlessOwner($request, $assignment);

        $validated = $request->validate([
            'category' => ['required', 'integer', 'in:'.implode(',', [
                CourseContent::CATEGORY_VIDEO,
                CourseContent::CATEGORY_DEVOIR,
                CourseContent::CATEGORY_EXAMEN,
            ])],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'video_url' => ['required_if:category,'.CourseContent::CATEGORY_VIDEO, 'nullable', 'url'],
            'file' => [
                'required_if:category,'.CourseContent::CATEGORY_DEVOIR.','.CourseContent::CATEGORY_EXAMEN,
                'nullable', 'file', 'mimes:pdf', 'max:20480',
            ],
        ]);

        $content = CourseContent::query()->create([
            'class_subject_teacher_id' => $assignment->id,
            'category' => $validated['category'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'video_url' => $validated['video_url'] ?? null,
            'file_path' => $request->hasFile('file')
                ? $request->file('file')->store("classes/{$assignment->class_id}/course-contents", 'courses')
                : null,
        ]);

        $this->notifyClass($assignment, $content);

        return response()->json($content, 201);
    }

    public function storeCorrection(Request $request, CourseContent $content)
    {
        $content->loadMissing('classSubjectTeacher');
        $this->abortUnlessOwner($request, $content->classSubjectTeacher);

        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:pdf', 'max:20480'],
        ]);

        if ($content->correction_path) {
            Storage::disk('courses')->delete($content->correction_path);
        }

        $content->update([
            'correction_path' => $request->file('file')->store(
                "classes/{$content->classSubjectTeacher->class_id}/course-contents",
                'courses'
            ),
        ]);

        return response()->json($content);
    }

    public function destroy(Request $request, CourseContent $content)
    {
        $content->loadMissing('classSubjectTeacher');
        $this->abortUnlessOwner($request, $content->classSubjectTeacher);

        if ($content->file_path) {
            Storage::disk('courses')->delete($content->file_path);
        }
        if ($content->correction_path) {
            Storage::disk('courses')->delete($content->correction_path);
        }
        $content->delete();

        return response()->json(status: 204);
    }

    public function download(Request $request, CourseContent $content)
    {
        $content->loadMissing('classSubjectTeacher');
        $this->abortUnlessCanView($request, $content->classSubjectTeacher);
        abort_if(! $content->file_path, 404);

        return Storage::disk('courses')->response($content->file_path);
    }

    public function downloadCorrection(Request $request, CourseContent $content)
    {
        $content->loadMissing('classSubjectTeacher');
        $this->abortUnlessCanView($request, $content->classSubjectTeacher);
        abort_if(! $content->correction_path, 404);

        return Storage::disk('courses')->response($content->correction_path);
    }

    /**
     * Vue élève : la liste de ses matières (une par professeur qui lui
     * enseigne), pour choisir ensuite laquelle consulter.
     */
    public function myCourses(Request $request, School $school)
    {
        $student = $request->user()->studentProfile;
        abort_unless($student, 404);

        return response()->json($this->subjectsForStudent($school, $student));
    }

    /**
     * Vue parent : la même chose, pour chacun de ses enfants inscrits dans
     * cette école.
     */
    public function forParentCourses(Request $request, School $school)
    {
        $studentIds = ParentStudent::query()
            ->where('parent_user_id', $request->user()->id)
            ->pluck('student_id');

        $children = Student::query()
            ->whereIn('id', $studentIds)
            ->whereHas('classStudents', fn ($query) => $query
                ->where('status', ClassStudent::STATUS_ACTIVE)
                ->whereHas('schoolClass', fn ($q) => $q->where('school_id', $school->id)))
            ->get();

        return response()->json(
            $children->map(fn ($student) => [
                'student' => $student,
                'subjects' => $this->subjectsForStudent($school, $student),
            ])->values()
        );
    }

    private function subjectsForStudent(School $school, Student $student): Collection
    {
        $classId = ClassStudent::query()
            ->where('student_id', $student->id)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->whereHas('schoolClass', fn ($query) => $query->where('school_id', $school->id))
            ->value('class_id');

        if (! $classId) {
            return collect();
        }

        return ClassSubjectTeacher::query()
            ->where('class_id', $classId)
            ->with(['subject', 'teacher'])
            ->withCount('courseContents')
            ->get();
    }

    private function notifyClass(ClassSubjectTeacher $assignment, CourseContent $content): void
    {
        $studentIds = ClassStudent::query()
            ->where('class_id', $assignment->class_id)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->pluck('student_id');

        $students = Student::query()->whereIn('id', $studentIds)->with('parents', 'user')->get();

        foreach ($students as $student) {
            $student->user?->notify(new CourseContentPublishedNotification($content));
            foreach ($student->parents as $parent) {
                $parent->notify(new CourseContentPublishedNotification($content));
            }
        }
    }

    private function abortUnlessOwner(Request $request, ClassSubjectTeacher $assignment): void
    {
        abort_unless($assignment->user_id === $request->user()->id, 403, "Vous n'enseignez pas ce cours.");
    }

    private function abortUnlessCanView(Request $request, ClassSubjectTeacher $assignment): void
    {
        $user = $request->user();

        if ($assignment->user_id === $user->id) {
            return;
        }

        $assignment->loadMissing('schoolClass');

        $isDirecteur = SchoolUser::query()
            ->where('school_id', $assignment->schoolClass->school_id)
            ->where('user_id', $user->id)
            ->whereHas('role', fn ($query) => $query->where('slug', 'directeur'))
            ->exists();
        if ($isDirecteur) {
            return;
        }

        $studentIds = collect([$user->studentProfile?->id])
            ->merge(ParentStudent::query()->where('parent_user_id', $user->id)->pluck('student_id'))
            ->filter();

        $hasAccess = ClassStudent::query()
            ->whereIn('student_id', $studentIds)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->where('class_id', $assignment->class_id)
            ->exists();

        abort_unless($hasAccess, 403, "Vous n'avez pas accès à ce cours.");
    }
}
