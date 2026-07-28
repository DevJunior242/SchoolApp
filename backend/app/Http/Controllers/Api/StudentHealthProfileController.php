<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\AuthorizesStudentHealth;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\Student;
use App\Models\StudentHealthProfile;
use Illuminate\Http\Request;

class StudentHealthProfileController extends Controller
{
    use AuthorizesSchoolDirecteur;
    use AuthorizesStudentHealth;

    public function show(Request $request, School $school, Student $student)
    {
        $this->abortUnlessEnrolled($school, $student);
        $this->authorizeHealthViewer($request, $school, $student);

        return response()->json($student->healthProfile);
    }

    public function update(Request $request, School $school, Student $student)
    {
        $this->abortUnlessEnrolled($school, $student);
        $this->authorizeHealthManager($request, $school);

        $validated = $request->validate([
            'blood_type' => ['nullable', 'string', 'max:10'],
            'chronic_conditions' => ['nullable', 'string', 'max:5000'],
            'disability' => ['nullable', 'string', 'max:2000'],
            'doctor_name' => ['nullable', 'string', 'max:255'],
            'doctor_phone' => ['nullable', 'string', 'max:30'],
            'emergency_contact_name' => ['nullable', 'string', 'max:255'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:30'],
            'emergency_contact_phone2' => ['nullable', 'string', 'max:30'],
            'emergency_contact_relationship' => ['nullable', 'string', 'max:100'],
            'preferred_hospital' => ['nullable', 'string', 'max:255'],
        ]);

        $profile = StudentHealthProfile::query()->updateOrCreate(
            ['student_id' => $student->id],
            [...$validated, 'updated_by' => $request->user()->id]
        );

        return response()->json($profile);
    }
}
