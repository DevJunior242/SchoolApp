<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\AuthorizesStudentHealth;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\Student;
use App\Models\StudentVaccination;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StudentVaccinationController extends Controller
{
    use AuthorizesSchoolDirecteur;
    use AuthorizesStudentHealth;

    public function index(Request $request, School $school, Student $student)
    {
        $this->abortUnlessEnrolled($school, $student);
        $this->authorizeHealthViewer($request, $school, $student);

        return response()->json($student->vaccinations()->orderByDesc('administered_at')->get());
    }

    public function store(Request $request, School $school, Student $student)
    {
        $this->abortUnlessEnrolled($school, $student);
        $this->authorizeHealthManager($request, $school);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'administered_at' => ['required', 'date'],
            'expires_at' => ['nullable', 'date', 'after:administered_at'],
            'next_dose_at' => ['nullable', 'date'],
            'document' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:4096'],
        ]);

        $documentPath = $request->hasFile('document')
            ? $request->file('document')->store("students/{$student->id}/vaccinations", 'health')
            : null;

        $vaccination = $student->vaccinations()->create([
            'name' => $validated['name'],
            'administered_at' => $validated['administered_at'],
            'expires_at' => $validated['expires_at'] ?? null,
            'next_dose_at' => $validated['next_dose_at'] ?? null,
            'document_path' => $documentPath,
            'created_by' => $request->user()->id,
        ]);

        return response()->json($vaccination, 201);
    }

    public function destroy(Request $request, School $school, Student $student, StudentVaccination $vaccination)
    {
        $this->abortUnlessEnrolled($school, $student);
        $this->authorizeHealthManager($request, $school);
        abort_if($vaccination->student_id !== $student->id, 404);

        if ($vaccination->document_path) {
            Storage::disk('health')->delete($vaccination->document_path);
        }
        $vaccination->delete();

        return response()->json(status: 204);
    }

    public function downloadDocument(Request $request, School $school, Student $student, StudentVaccination $vaccination)
    {
        $this->abortUnlessEnrolled($school, $student);
        $this->authorizeHealthViewer($request, $school, $student);
        abort_if($vaccination->student_id !== $student->id, 404);
        abort_unless($vaccination->document_path, 404);

        return Storage::disk('health')->response($vaccination->document_path);
    }
}
