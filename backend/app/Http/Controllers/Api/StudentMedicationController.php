<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\AuthorizesStudentHealth;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\Student;
use App\Models\StudentMedication;
use Illuminate\Http\Request;

class StudentMedicationController extends Controller
{
    use AuthorizesSchoolDirecteur;
    use AuthorizesStudentHealth;

    public function index(Request $request, School $school, Student $student)
    {
        $this->abortUnlessEnrolled($school, $student);
        $this->authorizeHealthViewer($request, $school, $student);

        return response()->json($student->medications()->orderByDesc('starts_on')->get());
    }

    public function store(Request $request, School $school, Student $student)
    {
        $this->abortUnlessEnrolled($school, $student);
        $this->authorizeHealthManager($request, $school);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'dosage' => ['required', 'string', 'max:255'],
            'starts_on' => ['required', 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'parent_authorized' => ['nullable', 'boolean'],
        ]);

        $medication = $student->medications()->create([...$validated, 'created_by' => $request->user()->id]);

        return response()->json($medication, 201);
    }

    public function destroy(Request $request, School $school, Student $student, StudentMedication $medication)
    {
        $this->abortUnlessEnrolled($school, $student);
        $this->authorizeHealthManager($request, $school);
        abort_if($medication->student_id !== $student->id, 404);

        $medication->delete();

        return response()->json(status: 204);
    }
}
