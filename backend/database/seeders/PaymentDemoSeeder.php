<?php

namespace Database\Seeders;

use App\Models\ClassStudent;
use App\Models\ClassSubjectTeacher;
use App\Models\Country;
use App\Models\FeeStructure;
use App\Models\Level;
use App\Models\ParentStudent;
use App\Models\PaymentMethod;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolStudent;
use App\Models\SchoolUser;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PaymentDemoSeeder extends Seeder
{
    private const SCHOOL_NAME = 'École de Test Local';

    private const PASSWORD = 'Demo1234!';

    public function run(): void
    {
        $this->call([RoleSeeder::class, CountrySeeder::class, LevelSeeder::class, SubjectSeeder::class]);

        $school = School::query()->updateOrCreate(
            ['name' => self::SCHOOL_NAME],
            [
                'country_id' => Country::query()->where('iso_code', 'CIV')->value('id'),
                'status' => School::STATUS_ACTIVE,
                'plan' => School::PLAN_ETABLISSEMENT,
                'language' => School::LANGUAGE_FR,
                'academic_period_type' => 'trimestre',
            ],
        );
        $roles = Role::query()->pluck('id', 'slug');
        $level = Level::query()->where('country_id', $school->country_id)->orderBy('order')->firstOrFail();
        $schoolYear = SchoolYear::query()->updateOrCreate(
            ['school_id' => $school->id, 'label' => '2026-2027'],
            ['start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true],
        );
        $classSixA = SchoolClass::query()->updateOrCreate(
            ['school_id' => $school->id, 'school_year_id' => $schoolYear->id, 'name' => '6e A'],
            ['level_id' => $level->id],
        );
        $classSixB = SchoolClass::query()->updateOrCreate(
            ['school_id' => $school->id, 'school_year_id' => $schoolYear->id, 'name' => '6e B'],
            ['level_id' => $level->id],
        );

        $staff = [
            ['Directrice Test', 'directeur.test@eduafrique.test', 'directeur'],
            ['Comptable Test', 'comptable.test@eduafrique.test', 'comptable'],
            ['Secrétaire Test', 'secretaire.test@eduafrique.test', 'secretaire'],
            ['RH Test', 'rh.test@eduafrique.test', 'rh'],
            ['Professeur Test', 'professeur.test@eduafrique.test', 'professeur'],
        ];
        $parents = [
            ['Parent Awa', 'parent.awa@eduafrique.test', 'mere'],
            ['Parent Koffi', 'parent.koffi@eduafrique.test', 'pere'],
            ['Parent Mariam', 'parent.mariam@eduafrique.test', 'tuteur'],
        ];

        $staffUsers = [];
        foreach ($staff as [$fullname, $email, $role]) {
            $staffUsers[$role] = $this->user($fullname, $email);
            $this->attachToSchool($staffUsers[$role], $school, $roles[$role]);
        }

        $parentUsers = [];
        foreach ($parents as [$fullname, $email]) {
            $parent = $this->user($fullname, $email);
            $this->attachToSchool($parent, $school, $roles['parent']);
            $parentUsers[] = $parent;
        }

        foreach ([
            ['Élève Amadou', 'eleve.amadou@eduafrique.test', '2015-04-12', 'M', 0, $classSixA],
            ['Élève Aïcha', 'eleve.aicha@eduafrique.test', '2015-08-24', 'F', 0, $classSixA],
            ['Élève Koffi', 'eleve.koffi@eduafrique.test', '2014-02-06', 'M', 1, $classSixB],
            ['Élève Mariam', 'eleve.mariam@eduafrique.test', '2014-11-19', 'F', 2, $classSixB],
        ] as [$fullname, $email, $birthDate, $gender, $parentIndex, $class]) {
            $studentUser = $this->user($fullname, $email);
            $this->attachToSchool($studentUser, $school, $roles['eleve']);
            $student = Student::query()->updateOrCreate(
                ['user_id' => $studentUser->id],
                [
                    'fullname' => $fullname,
                    'date_of_birth' => $birthDate,
                    'gender' => $gender,
                    'birth_place' => 'Abidjan',
                ],
            );
            ClassStudent::query()
                ->where('student_id', $student->id)
                ->where('class_id', '!=', $class->id)
                ->update(['status' => ClassStudent::STATUS_TRANSFERRED_OUT]);
            ClassStudent::query()->updateOrCreate(
                ['class_id' => $class->id, 'student_id' => $student->id],
                ['status' => ClassStudent::STATUS_ACTIVE],
            );
            SchoolStudent::query()->updateOrCreate(
                ['school_id' => $school->id, 'student_id' => $student->id],
                ['admission_date' => now(), 'status' => SchoolStudent::STATUS_ACTIVE],
            );
            ParentStudent::query()->updateOrCreate(
                ['parent_user_id' => $parentUsers[$parentIndex]->id, 'student_id' => $student->id],
                ['relationship' => $parents[$parentIndex][2], 'is_primary_contact' => true],
            );
        }

        foreach ([$classSixA, $classSixB] as $class) {
            foreach ([['MATH', 4], ['FR', 3]] as [$subjectCode, $coefficient]) {
                ClassSubjectTeacher::query()->updateOrCreate(
                    [
                        'class_id' => $class->id,
                        'subject_id' => Subject::query()->where('code', $subjectCode)->value('id'),
                        'user_id' => $staffUsers['professeur']->id,
                    ],
                    ['coefficient' => $coefficient],
                );
            }
        }

        foreach ([
            ['Scolarité - 1er trimestre', 75000, '2026-10-15', 1],
            ['Scolarité - 2e trimestre', 75000, '2027-01-15', 2],
        ] as [$label, $amount, $dueDate, $order]) {
            FeeStructure::query()->updateOrCreate(
                ['school_id' => $school->id, 'level_id' => $level->id, 'school_year_id' => $schoolYear->id, 'label' => $label],
                ['amount' => $amount, 'due_date' => $dueDate, 'order' => $order, 'category' => FeeStructure::CATEGORY_TUITION],
            );
        }

        foreach ([
            ['Orange Money Test', '+2250700000000', 'Compte de démonstration Orange Money'],
            ['Espèces au guichet', null, 'Paiement reçu directement au bureau'],
        ] as [$name, $number, $instructions]) {
            PaymentMethod::query()->updateOrCreate(
                ['school_id' => $school->id, 'name' => $name],
                ['number' => $number, 'instructions' => $instructions, 'is_active' => true],
            );
        }
    }

    private function user(string $fullname, string $email): User
    {
        return User::query()->updateOrCreate(
            ['email' => $email],
            ['fullname' => $fullname, 'password' => Hash::make(self::PASSWORD), 'email_verified_at' => now()],
        );
    }

    private function attachToSchool(User $user, School $school, string $roleId): void
    {
        $user->update(['current_school_id' => $school->id]);
        SchoolUser::query()->updateOrCreate(
            ['school_id' => $school->id, 'user_id' => $user->id],
            ['role_id' => $roleId, 'status' => SchoolUser::STATUS_ACTIVE],
        );
    }
}
