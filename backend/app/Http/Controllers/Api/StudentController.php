<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\ResolvesMemberUser;
use App\Http\Controllers\Controller;
use App\Models\ClassStudent;
use App\Models\ParentStudent;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolStudent;
use App\Models\SchoolUser;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class StudentController extends Controller
{
    use AuthorizesSchoolDirecteur, ResolvesMemberUser;

    public function index(Request $request, School $school)
    {
        $this->authorizeStudentViewer($request, $school);

        return response()->json(
            SchoolStudent::query()
                ->where('school_id', $school->id)
                ->when(
                    $request->query('search'),
                    fn ($query, $search) => $query->whereHas('student', fn ($q) => $q->where('fullname', 'like', "%{$search}%"))
                )
                ->when(
                    $request->query('class_id'),
                    fn ($query, $classId) => $query->whereHas(
                        'student.classStudents',
                        fn ($q) => $q->where('status', ClassStudent::STATUS_ACTIVE)->where('class_id', $classId)
                    )
                )
                ->with([
                    'student.user',
                    'student.parents',
                    'student.classStudents' => fn ($query) => $query
                        ->where('status', ClassStudent::STATUS_ACTIVE)
                        ->latest('created_at')
                        ->limit(1)
                        ->with('schoolClass'),
                ])
                ->paginate($request->integer('per_page', 10))
        );
    }

    /**
     * Inscrit un ou plusieurs élèves en une seule fois (le secrétariat
     * saisit souvent toute une classe d'un coup).
     */
    public function store(Request $request, School $school)
    {
        $this->authorizeStudentRegistrar($request, $school);

        $validated = $request->validate([
            'students' => ['required', 'array', 'min:1'],
            'students.*.fullname' => ['required', 'string', 'max:255'],
            'students.*.date_of_birth' => ['required', 'date', 'before:today'],
            'students.*.gender' => ['required', 'string', 'max:10'],
            'students.*.birth_place' => ['nullable', 'string', 'max:255'],
            'students.*.blood_type' => ['nullable', 'string', 'max:10'],
            'students.*.medical_notes' => ['nullable', 'string'],

            'students.*.class_id' => ['required', 'uuid', 'exists:classes,id'],
            'students.*.matricule' => ['nullable', 'string', 'max:50'],
            'students.*.previous_school' => ['nullable', 'string', 'max:255'],

            'students.*.student_email' => ['nullable', 'email'],

            'students.*.parent_fullname' => ['nullable', 'string', 'max:255'],
            'students.*.parent_email' => ['nullable', 'required_without:students.*.parent_phone', 'email'],
            'students.*.parent_phone' => ['nullable', 'required_without:students.*.parent_email', 'string', 'max:30'],
            'students.*.parent_relationship' => ['required', 'string', 'max:30'],
        ]);

        $results = DB::transaction(fn () => array_map(
            fn (array $entry) => $this->enrollStudent($school, $entry),
            $validated['students']
        ));

        return response()->json($results, 201);
    }

    private function enrollStudent(School $school, array $entry): Student
    {
        $class = SchoolClass::query()->where('school_id', $school->id)->findOrFail($entry['class_id']);
        $isMajeur = Carbon::parse($entry['date_of_birth'])->age >= 18;

        $studentUser = null;

        if ($isMajeur && ! empty($entry['student_email'])) {
            $studentUser = User::create([
                'fullname' => $entry['fullname'],
                'email' => $entry['student_email'],
                'password' => Hash::make(str()->random(24)),
            ]);
        }

        $student = Student::create([
            'user_id' => $studentUser?->id,
            'fullname' => $entry['fullname'],
            'date_of_birth' => $entry['date_of_birth'],
            'gender' => $entry['gender'],
            'birth_place' => $entry['birth_place'] ?? null,
            'blood_type' => $entry['blood_type'] ?? null,
            'medical_notes' => $entry['medical_notes'] ?? null,
        ]);

        $parentUser = $this->resolveUser([
            'fullname' => $entry['parent_fullname'] ?? null,
            'email' => $entry['parent_email'] ?? null,
            'phone' => $entry['parent_phone'] ?? null,
        ]);

        ParentStudent::query()->updateOrCreate(
            ['parent_user_id' => $parentUser->id, 'student_id' => $student->id],
            ['relationship' => $entry['parent_relationship'], 'is_primary_contact' => true]
        );

        $parentRole = Role::query()->where('slug', 'parent')->firstOrFail();
        SchoolUser::query()->updateOrCreate(
            ['school_id' => $school->id, 'user_id' => $parentUser->id],
            ['role_id' => $parentRole->id, 'status' => SchoolUser::STATUS_ACTIVE]
        );

        if (! $parentUser->current_school_id) {
            $parentUser->update(['current_school_id' => $school->id]);
        }

        if ($studentUser) {
            $eleveRole = Role::query()->where('slug', 'eleve')->firstOrFail();
            SchoolUser::query()->updateOrCreate(
                ['school_id' => $school->id, 'user_id' => $studentUser->id],
                ['role_id' => $eleveRole->id, 'status' => SchoolUser::STATUS_ACTIVE]
            );
            $studentUser->update(['current_school_id' => $school->id]);
        }

        SchoolStudent::query()->updateOrCreate(
            ['school_id' => $school->id, 'student_id' => $student->id],
            [
                'matricule' => $entry['matricule'] ?? null,
                'admission_date' => now(),
                'previous_school' => $entry['previous_school'] ?? null,
                'status' => SchoolStudent::STATUS_ACTIVE,
            ]
        );

        $season = $class->schoolYear->seasons()->orderBy('order')->firstOrFail();

        ClassStudent::query()->updateOrCreate(
            ['class_id' => $class->id, 'student_id' => $student->id, 'season_id' => $season->id],
            ['status' => ClassStudent::STATUS_ACTIVE]
        );

        return $student->load('user', 'parents');
    }
}
