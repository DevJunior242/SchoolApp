<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\ClassSubjectTeacher;
use App\Models\Country;
use App\Models\Level;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolClass;
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
 * Carte « Assiduité du mois » du tableau de bord admin. Régression : pour un
 * admin limité à une section, le résumé plantait (filtre sur une colonne
 * classes.section_id inexistante).
 */
class AdminDashboardAttendanceTest extends TestCase
{
    use DatabaseTransactions;

    public function test_attendance_rate_for_section_restricted_admin_and_empty_month(): void
    {
        $country = Country::query()->firstOrCreate(['iso_code' => 'BF'], ['name' => 'Burkina Faso', 'currency' => 'XOF']);
        $school = School::query()->create([
            'country_id' => $country->id, 'name' => 'École Assiduité Test',
            'status' => School::STATUS_ACTIVE, 'plan' => School::PLAN_ECOLE,
            'language' => School::LANGUAGE_FR, 'currency' => 'XOF',
        ]);
        $section = Section::query()->create(['name' => 'Secondaire Assiduité', 'code' => 'SA'.uniqid()]);
        $school->sections()->attach($section->id, ['active' => true]);

        $admin = User::factory()->create();
        $member = SchoolUser::query()->create([
            'school_id' => $school->id, 'user_id' => $admin->id,
            'role_id' => Role::query()->firstOrCreate(['slug' => 'admin'], ['name' => 'Admin'])->id,
            'status' => SchoolUser::STATUS_ACTIVE,
        ]);
        $member->sections()->attach($section->id);

        Sanctum::actingAs($admin);
        $url = "/api/schools/{$school->id}/dashboard-summary";

        // Aucun appel ce mois-ci : pas de taux (la carte affiche « — »).
        $this->getJson($url)->assertOk()->assertJsonPath('data.0.attendance_rate', null);

        $level = Level::query()->create(['section_id' => $section->id, 'name' => '6e', 'code' => '6A'.uniqid(), 'order' => 1]);
        $year = SchoolYear::query()->create([
            'school_id' => $school->id, 'label' => '2026-2027',
            'start_date' => now()->subMonth(), 'end_date' => now()->addMonths(8), 'is_current' => true,
        ]);
        $class = SchoolClass::query()->create(['school_id' => $school->id, 'level_id' => $level->id, 'school_year_id' => $year->id, 'name' => '6e A']);
        $course = ClassSubjectTeacher::query()->create([
            'class_id' => $class->id,
            'subject_id' => Subject::query()->create(['school_id' => $school->id, 'name' => 'Maths', 'code' => 'M'])->id,
            'user_id' => User::factory()->create()->id,
        ]);
        foreach ([Attendance::STATUS_PRESENT, Attendance::STATUS_PRESENT, Attendance::STATUS_RETARD, Attendance::STATUS_ABSENT] as $status) {
            Attendance::query()->create([
                'class_subject_teacher_id' => $course->id,
                'student_id' => Student::query()->create(['fullname' => 'Élève '.uniqid(), 'date_of_birth' => '2014-01-01', 'gender' => 'F'])->id,
                'date' => today(),
                'status' => $status,
            ]);
        }

        // 3 présents (dont 1 retard) sur 4 = 75 %.
        $this->getJson($url)
            ->assertOk()
            ->assertJsonPath('data.0.attendance_rate', 75)
            ->assertJsonPath('data.0.attendance_today_absent', 1);
    }
}
