<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\ResolvesMemberUser;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStudentsRequest;
use App\Models\BusStop;
use App\Models\ClassStudent;
use App\Models\ParentStudent;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolStudent;
use App\Models\SchoolUser;
use App\Models\Student;
use App\Models\User;
use App\Notifications\StudentEnrolledNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class StudentController extends Controller
{
    use AuthorizesSchoolDirecteur, ResolvesMemberUser;

    /**
     * Le compte élève (majeur, avec son propre login) récupère sa propre
     * fiche — utilisé notamment pour générer son badge cantine.
     */
    public function mine(Request $request, School $school)
    {
        $student = $request->user()->studentProfile;
        abort_unless($student, 404);

        $enrolled = ClassStudent::query()
            ->where('student_id', $student->id)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->whereHas('schoolClass', fn ($query) => $query->where('school_id', $school->id))
            ->exists();
        abort_unless($enrolled, 404);

        return response()->json($student);
    }

    /**
     * Rattache l'élève à un arrêt de bus précis (ou le retire du ramassage
     * scolaire si bus_stop_id est vide).
     */
    public function assignBusStop(Request $request, School $school, Student $student)
    {
        $this->authorizeStudentRegistrar($request, $school);

        $validated = $request->validate([
            'bus_stop_id' => ['nullable', 'uuid', 'exists:bus_stops,id'],
        ]);

        $schoolStudent = SchoolStudent::query()
            ->where('school_id', $school->id)
            ->where('student_id', $student->id)
            ->firstOrFail();

        if (! empty($validated['bus_stop_id'])) {
            $belongsToSchool = BusStop::query()
                ->where('id', $validated['bus_stop_id'])
                ->whereHas('bus', fn ($query) => $query->where('school_id', $school->id))
                ->exists();
            abort_unless($belongsToSchool, 404);
        }

        $schoolStudent->update(['bus_stop_id' => $validated['bus_stop_id'] ?? null]);

        return response()->json($schoolStudent->load('busStop'));
    }

    public function index(Request $request, School $school)
    {
        $this->authorizeStudentViewer($request, $school);

        return response()->json(
            SchoolStudent::query()
                ->where('school_id', $school->id)
                ->when(
                    $request->query('search'),
                    // Le matricule est unique, contrairement au nom (des
                    // élèves différents peuvent avoir des noms proches) :
                    // chercher sur les deux évite de servir/débiter le
                    // mauvais élève depuis la recherche manuelle de la cantine.
                    fn ($query, $search) => $query->whereHas('student', fn ($q) => $q
                        ->where('fullname', 'like', "%{$search}%")
                        ->orWhere('matricule', 'like', "%{$search}%"))
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
                    'busStop.bus',
                ])
                ->paginate($request->integer('per_page', 10))
        );
    }

    /**
     * Inscrit un ou plusieurs élèves en une seule fois (le secrétariat
     * saisit souvent toute une classe d'un coup).
     */
    public function store(StoreStudentsRequest $request, School $school)
    {
        $this->authorizeStudentRegistrar($request, $school);

        $validated = $request->validated();

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
        // Le parent est retrouvé par email/téléphone (ResolvesMemberUser) :
        // s'il a déjà un autre rôle à cette école (ex: le directeur inscrit
        // son propre enfant avec sa propre adresse email), on ne l'écrase
        // pas silencieusement.
        $this->guardAgainstRoleConflict($school, $parentUser, $parentRole->id);
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

        // L'inscription vaut pour toute l'année scolaire, pas pour un seul
        // trimestre/semestre.
        ClassStudent::query()->updateOrCreate(
            ['class_id' => $class->id, 'student_id' => $student->id],
            ['status' => ClassStudent::STATUS_ACTIVE]
        );

        // Le matricule doit atteindre le parent (et l'élève s'il a son
        // propre compte) même s'ils ne se connectent jamais à la plateforme.
        $parentUser->notify(new StudentEnrolledNotification($student));
        if ($studentUser) {
            $studentUser->notify(new StudentEnrolledNotification($student));
        }

        return $student->load('user', 'parents');
    }
}
