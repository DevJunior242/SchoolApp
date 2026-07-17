<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Models\School;
use App\Models\SchoolUser;
use Illuminate\Http\Request;
use App\Models\EnrollmentRequest;
use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;
use App\Notifications\EnrollmentRequestNotification;
use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;

class EnrollmentRequestController extends Controller
{
    use AuthorizesSchoolDirecteur;

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
            'level_wanted' => ['nullable', 'string', 'max:255'],
            'parent_fullname' => ['required', 'string', 'max:255'],
            'parent_phone' => ['nullable', 'string', 'max:30'],
            'parent_email' => ['nullable', 'email', 'max:255'],
            'message' => ['nullable', 'string', 'max:1000'],
        ]);

        if (empty($validated['parent_phone']) && empty($validated['parent_email'])) {
            throw ValidationException::withMessages([
                'parent_phone' => ['Indiquez au moins un numéro de téléphone ou un email pour être recontacté.'],
            ]);
        }

        $enrollmentRequest = EnrollmentRequest::query()->create([
            ...$validated,
            'school_id' => $school->id,
            'status' => EnrollmentRequest::STATUS_PENDING,
        ]);

        $this->notifySchoolStaff($school, $enrollmentRequest);

        return response()->json($enrollmentRequest, 201);
    }

    public function index(Request $request, School $school)
    {
        $this->authorizeStudentRegistrar($request, $school);

        return response()->json(
            EnrollmentRequest::query()
                ->where('school_id', $school->id)
                ->latest('created_at')
                ->paginate($request->integer('per_page', 15))
        );
    }

    public function accept(Request $request, School $school, EnrollmentRequest $enrollmentRequest)
    {
        $this->authorizeStudentRegistrar($request, $school);
        abort_if($enrollmentRequest->school_id !== $school->id, 404);

        $enrollmentRequest->update(['status' => EnrollmentRequest::STATUS_ACCEPTED]);

        return response()->json($enrollmentRequest);
    }

    public function reject(Request $request, School $school, EnrollmentRequest $enrollmentRequest)
    {
        $this->authorizeStudentRegistrar($request, $school);
        abort_if($enrollmentRequest->school_id !== $school->id, 404);

        $enrollmentRequest->update(['status' => EnrollmentRequest::STATUS_REJECTED]);

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
