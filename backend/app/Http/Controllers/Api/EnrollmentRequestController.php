<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\SchoolClass;
use App\Models\SchoolStudent;
use App\Models\ClassStudent;
use App\Models\ParentStudent;
use App\Models\Role;
use App\Models\Student;
use App\Models\Level;
use App\Rules\ValidTurnstileToken;
use Illuminate\Http\Request;
use App\Models\EnrollmentRequest;
use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;
use App\Notifications\EnrollmentRequestNotification;
use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\ValidatesSchoolSection;
use App\Http\Controllers\Api\Concerns\ResolvesMemberUser;
use App\Notifications\StudentEnrolledNotification;
use Illuminate\Support\Facades\DB;

class EnrollmentRequestController extends Controller
{
    use AuthorizesSchoolDirecteur, ResolvesMemberUser, ValidatesSchoolSection;

    /**
     * Formulaire public (pas de compte requis) accessible depuis la
     * homepage : un parent/élève manifeste son intérêt pour une école.
     */
    public function store(Request $request, School $school)
    {
        // Honeypot anti-bot : champ caché côté formulaire, invisible et non
        // rempli par un humain. On répond un faux succès pour ne pas
        // signaler au bot que sa requête a été détectée.
        if ($request->filled('company')) {
            return response()->json(['message' => 'Demande envoyée.'], 201);
        }

        $validated = $request->validate([
            'child_fullname' => ['required', 'string', 'max:255'],
            'child_birthdate' => ['nullable', 'date'],
            'level_id' => ['nullable', 'uuid', 'exists:levels,id'],
            'parent_fullname' => ['required', 'string', 'max:255'],
            'parent_phone' => ['nullable', 'string', 'max:30'],
            'parent_email' => ['nullable', 'email', 'max:255'],
            'message' => ['nullable', 'string', 'max:1000'],
            'turnstile_token' => [new ValidTurnstileToken],
        ]);

        if (empty($validated['parent_phone']) && empty($validated['parent_email'])) {
            throw ValidationException::withMessages([
                'parent_phone' => ['Indiquez au moins un numéro de téléphone ou un email pour être recontacté.'],
            ]);
        }

        $level = ! empty($validated['level_id'])
            ? Level::query()->with('section')->findOrFail($validated['level_id'])
            : null;

        if ($level && ! $school->sections()
            ->whereKey($level->section_id)
            ->wherePivot('active', true)
            ->exists()) {
            throw ValidationException::withMessages([
                'level_id' => ["Ce niveau n'est pas ouvert dans cette école."],
            ]);
        }

        $enrollmentRequest = EnrollmentRequest::query()->create([
            ...$validated,
            'school_id' => $school->id,
            'status' => EnrollmentRequest::STATUS_PENDING,
        ]);

        $enrollmentRequest->setRelation('level', $level);
        $this->notifySchoolStaff($school, $enrollmentRequest);

        return response()->json($enrollmentRequest, 201);
    }

    public function index(Request $request, School $school)
    {
        $this->authorizeStudentRegistrar($request, $school);

        return response()->json(
            EnrollmentRequest::query()
                ->where('school_id', $school->id)
                ->with('level.section', 'student')
                ->latest('created_at')
                ->paginate($request->integer('per_page', 15))
        );
    }

    public function accept(Request $request, School $school, EnrollmentRequest $enrollmentRequest)
    {
        $this->authorizeStudentRegistrar($request, $school);
        abort_if($enrollmentRequest->school_id !== $school->id, 404);

        $validated = $request->validate([
            'class_id' => ['required', 'uuid', 'exists:classes,id'],
            'child_birthdate' => ['required', 'date', 'before:today'],
            'gender' => ['required', 'in:M,F'],
            'parent_email' => ['nullable', 'email', 'max:255'],
            'parent_relationship' => ['required', 'in:'.implode(',', [
                ParentStudent::RELATIONSHIP_PERE,
                ParentStudent::RELATIONSHIP_MERE,
                ParentStudent::RELATIONSHIP_TUTEUR,
                ParentStudent::RELATIONSHIP_AUTRE,
            ])],
        ]);

        $schoolClass = SchoolClass::query()
            ->where('school_id', $school->id)
            ->findOrFail($validated['class_id']);
        $classLevel = $this->activeSchoolClass($school, $schoolClass);
        $this->authorizeLevelSection($request, $school, $classLevel);

        if ($enrollmentRequest->level_id && $enrollmentRequest->level_id !== $schoolClass->level_id) {
            throw ValidationException::withMessages([
                'class_id' => ["La classe choisie ne correspond pas au niveau demandé."],
            ]);
        }

        $result = DB::transaction(function () use ($enrollmentRequest, $school, $schoolClass, $validated) {
            $requestRecord = EnrollmentRequest::query()->lockForUpdate()->findOrFail($enrollmentRequest->id);
            abort_unless($requestRecord->status === EnrollmentRequest::STATUS_PENDING, 422, 'Cette demande a déjà été traitée.');

            $parent = $this->resolveUser([
                'fullname' => $requestRecord->parent_fullname,
                'email' => $validated['parent_email'] ?? $requestRecord->parent_email,
                'phone' => $requestRecord->parent_phone,
            ]);
            $student = Student::query()->create([
                'fullname' => $requestRecord->child_fullname,
                'date_of_birth' => $validated['child_birthdate'],
                'gender' => $validated['gender'],
            ]);

            ParentStudent::query()->create([
                'parent_user_id' => $parent->id,
                'student_id' => $student->id,
                'relationship' => $validated['parent_relationship'],
                'is_primary_contact' => true,
            ]);

            $parentRole = Role::query()->where('slug', 'parent')->firstOrFail();
            $this->guardAgainstRoleConflict($school, $parent, $parentRole->id);
            SchoolUser::query()->updateOrCreate(
                ['school_id' => $school->id, 'user_id' => $parent->id],
                ['role_id' => $parentRole->id, 'status' => SchoolUser::STATUS_ACTIVE],
            );
            if (! $parent->current_school_id) {
                $parent->update(['current_school_id' => $school->id]);
            }

            SchoolStudent::query()->create([
                'school_id' => $school->id,
                'student_id' => $student->id,
                'admission_date' => now(),
                'status' => SchoolStudent::STATUS_ACTIVE,
            ]);
            ClassStudent::query()->create([
                'class_id' => $schoolClass->id,
                'student_id' => $student->id,
                'status' => ClassStudent::STATUS_ACTIVE,
            ]);

            $requestRecord->update([
                'status' => EnrollmentRequest::STATUS_ACCEPTED,
                'student_id' => $student->id,
            ]);

            return [$requestRecord, $student, $parent];
        });

        [$enrollmentRequest, $student, $parent] = $result;
        $parent->notify(new StudentEnrolledNotification($student));

        return response()->json($enrollmentRequest->load('level.section', 'student'));
    }

    public function reject(Request $request, School $school, EnrollmentRequest $enrollmentRequest)
    {
        $this->authorizeStudentRegistrar($request, $school);
        abort_if($enrollmentRequest->school_id !== $school->id, 404);

        $validated = $request->validate([
            'rejection_reason' => ['nullable', 'string', 'max:1000'],
        ]);
        abort_unless($enrollmentRequest->status === EnrollmentRequest::STATUS_PENDING, 422, 'Cette demande a déjà été traitée.');

        $enrollmentRequest->update([
            'status' => EnrollmentRequest::STATUS_REJECTED,
            'rejection_reason' => $validated['rejection_reason'] ?? null,
        ]);

        return response()->json($enrollmentRequest);
    }

    private function notifySchoolStaff(School $school, EnrollmentRequest $enrollmentRequest): void
    {
        $userIds = SchoolUser::query()
            ->where('school_id', $school->id)
            ->whereHas('role', fn($query) => $query->whereIn('slug', ['directeur', 'secretaire']))
            ->pluck('user_id');

        $recipients = User::query()->whereIn('id', $userIds)->get();

        foreach ($recipients as $recipient) {
            $recipient->notify(new EnrollmentRequestNotification($enrollmentRequest));
        }
    }
}
