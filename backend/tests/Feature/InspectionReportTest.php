<?php

namespace Tests\Feature;

use App\Models\ClassStudent;
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
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InspectionReportTest extends TestCase
{
    use DatabaseTransactions;

    public function test_report_counts_by_class_level_gender_and_situation(): void
    {
        $country = Country::query()->firstOrCreate(['iso_code' => 'BF'], ['name' => 'Burkina Faso', 'currency' => 'XOF']);
        $school = School::query()->create([
            'country_id' => $country->id, 'name' => 'École Rapport Test',
            'status' => School::STATUS_ACTIVE, 'plan' => School::PLAN_ECOLE,
            'language' => School::LANGUAGE_FR, 'currency' => 'XOF',
        ]);
        $section = Section::query()->create(['name' => 'Primaire Rapport', 'code' => 'PR'.uniqid()]);
        $cm1 = Level::query()->create(['section_id' => $section->id, 'name' => 'CM1', 'code' => 'CM1'.uniqid(), 'order' => 5]);
        $cm2 = Level::query()->create(['section_id' => $section->id, 'name' => 'CM2', 'code' => 'CM2'.uniqid(), 'order' => 6]);
        $year = SchoolYear::query()->create([
            'school_id' => $school->id, 'label' => '2026-2027',
            'start_date' => now()->subMonth(), 'end_date' => now()->addMonths(8), 'is_current' => true,
        ]);
        $cm2a = SchoolClass::query()->create(['school_id' => $school->id, 'level_id' => $cm2->id, 'school_year_id' => $year->id, 'name' => 'CM2 A']);
        $cm1a = SchoolClass::query()->create(['school_id' => $school->id, 'level_id' => $cm1->id, 'school_year_id' => $year->id, 'name' => 'CM1 A']);

        $enroll = function (SchoolClass $class, string $gender, array $situation = [], bool $repeating = false, int $status = SchoolStudent::STATUS_ACTIVE) use ($school) {
            $student = Student::query()->create(['fullname' => 'Élève '.uniqid(), 'date_of_birth' => '2015-01-01', 'gender' => $gender] + $situation);
            SchoolStudent::query()->create(['school_id' => $school->id, 'student_id' => $student->id, 'status' => $status]);
            ClassStudent::query()->create(['class_id' => $class->id, 'student_id' => $student->id, 'status' => ClassStudent::STATUS_ACTIVE, 'is_repeating' => $repeating]);
        };

        $enroll($cm2a, 'M', ['is_displaced' => true], repeating: true);
        $enroll($cm2a, 'F', ['has_disability' => true, 'disability_type' => 'visuel']);
        $enroll($cm2a, 'F', ['is_displaced' => true, 'has_disability' => true]);
        $enroll($cm1a, 'M');
        $enroll($cm1a, 'F', status: SchoolStudent::STATUS_LEFT); // parti : non compté

        $admin = User::factory()->create();
        SchoolUser::query()->create([
            'school_id' => $school->id, 'user_id' => $admin->id,
            'role_id' => Role::query()->firstOrCreate(['slug' => 'admin'], ['name' => 'Admin'])->id,
            'status' => SchoolUser::STATUS_ACTIVE,
        ]);
        $teacher = User::factory()->create();
        SchoolUser::query()->create([
            'school_id' => $school->id, 'user_id' => $teacher->id,
            'role_id' => Role::query()->firstOrCreate(['slug' => 'professeur'], ['name' => 'Professeur'])->id,
            'status' => SchoolUser::STATUS_ACTIVE,
        ]);

        $url = "/api/schools/{$school->id}/reports/inspection";

        Sanctum::actingAs($teacher);
        $this->getJson($url)->assertForbidden();

        Sanctum::actingAs($admin);
        $this->getJson($url)
            ->assertOk()
            ->assertJsonPath('school_year', '2026-2027')
            // Niveaux dans l'ordre (CM1 avant CM2).
            ->assertJsonPath('levels.0.level', 'CM1')
            ->assertJsonPath('levels.0.total.effectif', ['garcons' => 1, 'filles' => 0, 'total' => 1])
            ->assertJsonPath('levels.1.classes.0.label', 'CM2 A')
            ->assertJsonPath('levels.1.classes.0.effectif', ['garcons' => 1, 'filles' => 2, 'total' => 3])
            ->assertJsonPath('levels.1.classes.0.pdi', ['garcons' => 1, 'filles' => 1, 'total' => 2])
            ->assertJsonPath('levels.1.classes.0.handicap', ['garcons' => 0, 'filles' => 2, 'total' => 2])
            ->assertJsonPath('levels.1.classes.0.handicap_types.visuel.filles', 1)
            ->assertJsonPath('levels.1.classes.0.handicap_types.non_precise.filles', 1)
            ->assertJsonPath('levels.1.classes.0.redoublants.garcons', 1)
            ->assertJsonPath('total.effectif', ['garcons' => 2, 'filles' => 2, 'total' => 4]);
    }
}
