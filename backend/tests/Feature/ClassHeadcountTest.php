<?php

namespace Tests\Feature;

use App\Models\ClassStudent;
use App\Models\ClassSubjectTeacher;
use App\Models\Country;
use App\Models\Level;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolStudent;
use App\Models\SchoolUser;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Effectif garçons / filles par classe : page Classes (admin) et tableau de
 * bord du professeur, même calcul (ClassHeadcountService).
 */
class ClassHeadcountTest extends TestCase
{
    use DatabaseTransactions;

    public function test_admin_and_teacher_see_boys_girls_per_class(): void
    {
        $country = Country::query()->firstOrCreate(['iso_code' => 'BF'], ['name' => 'Burkina Faso', 'currency' => 'XOF']);
        $school = School::query()->create([
            'country_id' => $country->id, 'name' => 'École Effectifs Test',
            'status' => School::STATUS_ACTIVE, 'plan' => School::PLAN_ECOLE,
            'language' => School::LANGUAGE_FR, 'currency' => 'XOF',
        ]);
        $section = Section::query()->create(['name' => 'Secondaire Effectifs', 'code' => 'SE'.uniqid()]);
        $school->sections()->attach($section->id, ['active' => true]);
        $level = Level::query()->create(['section_id' => $section->id, 'name' => '6e', 'code' => '6E'.uniqid(), 'order' => 1]);
        $year = SchoolYear::query()->create([
            'school_id' => $school->id, 'label' => '2026-2027',
            'start_date' => now()->subMonth(), 'end_date' => now()->addMonths(8), 'is_current' => true,
        ]);
        $class = SchoolClass::query()->create(['school_id' => $school->id, 'level_id' => $level->id, 'school_year_id' => $year->id, 'name' => '6e A']);

        foreach ([['M', SchoolStudent::STATUS_ACTIVE], ['M', SchoolStudent::STATUS_ACTIVE], ['F', SchoolStudent::STATUS_ACTIVE], ['F', SchoolStudent::STATUS_LEFT]] as [$gender, $status]) {
            $student = Student::query()->create(['fullname' => 'Élève '.uniqid(), 'date_of_birth' => '2014-01-01', 'gender' => $gender]);
            SchoolStudent::query()->create(['school_id' => $school->id, 'student_id' => $student->id, 'status' => $status]);
            ClassStudent::query()->create(['class_id' => $class->id, 'student_id' => $student->id, 'status' => ClassStudent::STATUS_ACTIVE]);
        }

        $expected = ['garcons' => 2, 'filles' => 1, 'total' => 3];

        $admin = $this->member($school, 'admin');
        Sanctum::actingAs($admin);
        $this->getJson("/api/schools/{$school->id}/classes")
            ->assertOk()
            ->assertJsonPath('data.0.effectif', $expected);

        $teacher = $this->member($school, 'professeur');
        $subject = Subject::query()->create(['school_id' => $school->id, 'name' => 'Maths', 'code' => 'M']);
        $physics = Subject::query()->create(['school_id' => $school->id, 'name' => 'Physique', 'code' => 'P']);
        // Deux matières dans la même classe : la classe n'apparaît qu'une fois.
        ClassSubjectTeacher::query()->create(['class_id' => $class->id, 'subject_id' => $subject->id, 'user_id' => $teacher->id]);
        ClassSubjectTeacher::query()->create(['class_id' => $class->id, 'subject_id' => $physics->id, 'user_id' => $teacher->id]);

        Sanctum::actingAs($teacher);
        $this->getJson("/api/schools/{$school->id}/my-teaching-summary")
            ->assertOk()
            ->assertJsonCount(1, 'class_headcounts')
            ->assertJsonPath('class_headcounts.0', ['classe' => '6e A'] + $expected);
    }

    private function member(School $school, string $slug): User
    {
        $user = User::factory()->create();
        SchoolUser::query()->create([
            'school_id' => $school->id, 'user_id' => $user->id,
            'role_id' => Role::query()->firstOrCreate(['slug' => $slug], ['name' => ucfirst($slug)])->id,
            'status' => SchoolUser::STATUS_ACTIVE,
        ]);

        return $user;
    }
}
