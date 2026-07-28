<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\AuthorizesStudentHealth;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\Student;
use Illuminate\Http\Request;

class StudentMedicalVisitController extends Controller
{
    use AuthorizesSchoolDirecteur;
    use AuthorizesStudentHealth;

    public function index(Request $request, School $school, Student $student)
    {
        $this->abortUnlessEnrolled($school, $student);
        $this->authorizeHealthViewer($request, $school, $student);

        return response()->json(
            $student->medicalVisits()
                ->where('school_id', $school->id)
                ->with('recorder')
                ->orderByDesc('visited_at')
                ->get()
        );
    }

    /**
     * Historique append-only : chaque passage à l'infirmerie est conservé
     * tel quel, pas de modification/suppression a posteriori.
     */
    public function store(Request $request, School $school, Student $student)
    {
        $this->abortUnlessEnrolled($school, $student);
        $this->authorizeHealthManager($request, $school);

        $validated = $request->validate([
            'visited_at' => ['required', 'date'],
            'reason' => ['required', 'string', 'max:255'],
            'diagnosis' => ['nullable', 'string', 'max:2000'],
            'treatment_given' => ['nullable', 'string', 'max:2000'],
            'rest_recommended' => ['nullable', 'boolean'],
            'is_emergency' => ['nullable', 'boolean'],
            'returned_to_class_at' => ['nullable', 'date', 'after_or_equal:visited_at'],
        ]);

        $visit = $student->medicalVisits()->create([
            ...$validated,
            'school_id' => $school->id,
            'recorded_by' => $request->user()->id,
        ]);

        return response()->json($visit->load('recorder'), 201);
    }
}
