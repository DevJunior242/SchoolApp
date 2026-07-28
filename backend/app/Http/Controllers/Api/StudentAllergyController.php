<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\AuthorizesStudentHealth;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\Student;
use App\Models\StudentAllergy;
use Illuminate\Http\Request;

class StudentAllergyController extends Controller
{
    use AuthorizesSchoolDirecteur;
    use AuthorizesStudentHealth;

    /**
     * Lecture ouverte au professeur (alerte visuelle), pas seulement au
     * staff santé et au parent.
     */
    public function index(Request $request, School $school, Student $student)
    {
        $this->abortUnlessEnrolled($school, $student);
        $this->authorizeAllergyViewer($request, $school, $student);

        return response()->json($student->allergies()->orderByDesc('severity')->get());
    }

    public function store(Request $request, School $school, Student $student)
    {
        $this->abortUnlessEnrolled($school, $student);
        $this->authorizeHealthManager($request, $school);

        $validated = $request->validate([
            'label' => ['required', 'string', 'max:255'],
            'severity' => ['required', 'in:'.StudentAllergy::SEVERITY_MILD.','.StudentAllergy::SEVERITY_SEVERE],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $allergy = $student->allergies()->create([...$validated, 'created_by' => $request->user()->id]);

        return response()->json($allergy, 201);
    }

    public function destroy(Request $request, School $school, Student $student, StudentAllergy $allergy)
    {
        $this->abortUnlessEnrolled($school, $student);
        $this->authorizeHealthManager($request, $school);
        abort_if($allergy->student_id !== $student->id, 404);

        $allergy->delete();

        return response()->json(status: 204);
    }
}
