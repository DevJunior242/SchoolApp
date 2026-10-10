<?php

namespace Tests\Feature;

use App\Models\Country;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Régression (403 sur /dashboard/exams pour un professeur) : les lectures
 * de la page Examens ne doivent pas exiger un e-mail vérifié ni une école
 * modifiable — GET /classes était rangé avec les routes d'écriture.
 */
class TeacherExamsPageAccessTest extends TestCase
{
    use DatabaseTransactions;

    public function test_unverified_teacher_can_load_exams_page_even_in_read_only_school(): void
    {
        config(['auth.require_email_verification' => true]);

        $role = Role::query()->firstOrCreate(['slug' => 'professeur'], ['name' => 'Professeur']);
        $country = Country::query()->firstOrCreate(['iso_code' => 'BF'], ['name' => 'Burkina Faso', 'currency' => 'XOF']);
        $school = School::query()->create([
            'country_id' => $country->id,
            'name' => 'École Examens Test',
            'status' => School::STATUS_READ_ONLY,
            'plan' => School::PLAN_ECOLE,
            'language' => School::LANGUAGE_FR,
            'currency' => 'XOF',
        ]);
        $teacher = User::factory()->unverified()->create();
        SchoolUser::query()->create([
            'school_id' => $school->id,
            'user_id' => $teacher->id,
            'role_id' => $role->id,
            'status' => SchoolUser::STATUS_ACTIVE,
        ]);

        Sanctum::actingAs($teacher);

        foreach (['exam-types', 'school-years', 'classes?per_page=1000', 'exams'] as $path) {
            $this->getJson("/api/schools/{$school->id}/{$path}")->assertOk();
        }
        $this->getJson('/api/subjects')->assertOk();

        // Les écritures restent bloquées dans une école en lecture seule.
        $this->postJson("/api/schools/{$school->id}/classes", [])->assertForbidden();
    }
}
