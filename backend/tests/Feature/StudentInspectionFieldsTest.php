<?php

namespace Tests\Feature;

use App\Models\ClassStudent;
use App\Models\Country;
use App\Models\Level;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolUser;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Champs pour l'inspection : PDI, handicap, redoublant. Données sensibles,
 * visibles seulement par l'administration (admin, secrétariat).
 */
class StudentInspectionFieldsTest extends TestCase
{
    use DatabaseTransactions;

    private School $school;

    private SchoolClass $class;

    private User $admin;

    private User $accountant;

    protected function setUp(): void
    {
        parent::setUp();

        $country = Country::query()->firstOrCreate(['iso_code' => 'BF'], ['name' => 'Burkina Faso', 'currency' => 'XOF']);
        $this->school = School::query()->create([
            'country_id' => $country->id,
            'name' => 'École Inspection Test',
            'status' => School::STATUS_ACTIVE,
            'plan' => School::PLAN_ECOLE,
            'language' => School::LANGUAGE_FR,
            'currency' => 'XOF',
        ]);
        $section = Section::query()->create(['name' => 'Primaire Test', 'code' => 'PRI-T'.uniqid()]);
        $this->school->sections()->attach($section->id, ['active' => true]);
        $level = Level::query()->create(['section_id' => $section->id, 'name' => 'CM2 Test', 'code' => 'CM2T'.uniqid(), 'order' => 1]);
        $year = SchoolYear::query()->create([
            'school_id' => $this->school->id, 'label' => '2026-2027',
            'start_date' => now()->subMonth(), 'end_date' => now()->addMonths(8), 'is_current' => true,
        ]);
        $this->class = SchoolClass::query()->create([
            'school_id' => $this->school->id, 'level_id' => $level->id, 'school_year_id' => $year->id, 'name' => 'CM2 A',
        ]);

        $this->admin = $this->member('admin');
        $this->accountant = $this->member('comptable');
        foreach (['parent', 'eleve'] as $slug) {
            Role::query()->firstOrCreate(['slug' => $slug], ['name' => ucfirst($slug)]);
        }
    }

    public function test_fields_saved_at_enrollment_and_visible_only_to_administration(): void
    {
        Sanctum::actingAs($this->admin);
        $this->postJson("/api/schools/{$this->school->id}/students", ['students' => [[
            'fullname' => 'Awa Ouédraogo',
            'date_of_birth' => '2015-03-02',
            'gender' => 'F',
            'class_id' => $this->class->id,
            'parent_fullname' => 'Mariam Ouédraogo',
            'parent_email' => 'mariam.'.uniqid().'@example.com',
            'parent_phone' => '+22670123456',
            'parent_relationship' => 'Mère',
            'is_displaced' => true,
            'displaced_origin' => 'Djibo',
            'has_disability' => true,
            'disability_type' => 'auditif',
            'is_repeating' => true,
        ]]])->assertCreated();

        $student = Student::query()->where('fullname', 'Awa Ouédraogo')->firstOrFail();
        $this->assertTrue($student->is_displaced);
        $this->assertSame('auditif', $student->disability_type);
        $this->assertTrue(ClassStudent::query()->where('student_id', $student->id)->value('is_repeating'));

        $this->getJson("/api/schools/{$this->school->id}/students")
            ->assertOk()
            ->assertJsonPath('data.0.student.is_displaced', true)
            ->assertJsonPath('data.0.student.displaced_origin', 'Djibo');

        Sanctum::actingAs($this->accountant);
        $row = $this->getJson("/api/schools/{$this->school->id}/students")->assertOk()->json('data.0.student');
        $this->assertArrayNotHasKey('is_displaced', $row);
        $this->assertArrayNotHasKey('disability_type', $row);
    }

    public function test_situation_update_clears_details_when_unchecked(): void
    {
        $student = Student::query()->create([
            'fullname' => 'Issa Sawadogo', 'date_of_birth' => '2014-05-05', 'gender' => 'M',
            'is_displaced' => true, 'displaced_origin' => 'Arbinda',
            'has_disability' => true, 'disability_type' => 'moteur',
        ]);
        \App\Models\SchoolStudent::query()->create([
            'school_id' => $this->school->id, 'student_id' => $student->id, 'status' => \App\Models\SchoolStudent::STATUS_ACTIVE,
        ]);
        ClassStudent::query()->create(['class_id' => $this->class->id, 'student_id' => $student->id, 'status' => ClassStudent::STATUS_ACTIVE]);

        $url = "/api/schools/{$this->school->id}/students/{$student->id}/situation";
        $payload = ['is_displaced' => false, 'displaced_origin' => 'Arbinda', 'has_disability' => false, 'disability_type' => 'moteur', 'is_repeating' => true];

        Sanctum::actingAs($this->accountant);
        $this->putJson($url, $payload)->assertForbidden();

        Sanctum::actingAs($this->admin);
        $this->putJson($url, $payload)
            ->assertOk()
            ->assertJsonPath('is_displaced', false)
            ->assertJsonPath('displaced_origin', null)
            ->assertJsonPath('disability_type', null);

        $this->assertTrue(ClassStudent::query()->where('student_id', $student->id)->value('is_repeating'));
    }

    private function member(string $slug): User
    {
        $role = Role::query()->firstOrCreate(['slug' => $slug], ['name' => ucfirst($slug)]);
        $user = User::factory()->create();
        SchoolUser::query()->create([
            'school_id' => $this->school->id, 'user_id' => $user->id,
            'role_id' => $role->id, 'status' => SchoolUser::STATUS_ACTIVE,
        ]);

        return $user;
    }
}
