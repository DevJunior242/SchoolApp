<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\AuthorizesStudentHealth;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\Student;
use App\Models\StudentHealthDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StudentHealthDocumentController extends Controller
{
    use AuthorizesSchoolDirecteur;
    use AuthorizesStudentHealth;

    public function index(Request $request, School $school, Student $student)
    {
        $this->abortUnlessEnrolled($school, $student);
        $this->authorizeHealthViewer($request, $school, $student);

        return response()->json($student->healthDocuments()->orderByDesc('created_at')->get());
    }

    public function store(Request $request, School $school, Student $student)
    {
        $this->abortUnlessEnrolled($school, $student);
        $this->authorizeHealthManager($request, $school);

        $validated = $request->validate([
            'type' => ['required', 'in:'.implode(',', [
                StudentHealthDocument::TYPE_CERTIFICATE,
                StudentHealthDocument::TYPE_VACCINATION_BOOKLET,
                StudentHealthDocument::TYPE_PRESCRIPTION,
                StudentHealthDocument::TYPE_REPORT,
            ])],
            'label' => ['nullable', 'string', 'max:255'],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:8192'],
        ]);

        $document = $student->healthDocuments()->create([
            'type' => $validated['type'],
            'label' => $validated['label'] ?? null,
            'path' => $request->file('file')->store("students/{$student->id}/documents", 'health'),
            'uploaded_by' => $request->user()->id,
        ]);

        return response()->json($document, 201);
    }

    public function destroy(Request $request, School $school, Student $student, StudentHealthDocument $document)
    {
        $this->abortUnlessEnrolled($school, $student);
        $this->authorizeHealthManager($request, $school);
        abort_if($document->student_id !== $student->id, 404);

        Storage::disk('health')->delete($document->path);
        $document->delete();

        return response()->json(status: 204);
    }

    public function download(Request $request, School $school, Student $student, StudentHealthDocument $document)
    {
        $this->abortUnlessEnrolled($school, $student);
        $this->authorizeHealthViewer($request, $school, $student);
        abort_if($document->student_id !== $student->id, 404);

        return Storage::disk('health')->response($document->path);
    }
}
