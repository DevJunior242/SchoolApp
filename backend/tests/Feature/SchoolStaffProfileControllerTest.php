<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\SchoolStaffProfileController;
use App\Models\Country;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolStaffProfile;
use App\Models\SchoolUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class SchoolStaffProfileControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_supports_search_and_department_filter(): void
    {
        $directorRole = Role::query()->firstOrCreate(['slug' => 'directeur'], ['name' => 'Directeur']);
        $rhRole = Role::query()->firstOrCreate(['slug' => 'rh'], ['name' => 'Responsable RH']);
        $country = Country::query()->create([
            'name' => 'Cote d Ivoire',
            'iso_code' => 'CI',
            'currency' => 'XOF',
        ]);

        $school = School::query()->create([
            'country_id' => $country->id,
            'name' => 'École Test',
            'status' => School::STATUS_ACTIVE,
            'plan' => School::PLAN_ECOLE,
            'language' => School::LANGUAGE_FR,
            'currency' => 'XOF',
        ]);

        $director = User::factory()->create(['fullname' => 'Directeur Test']);
        $alice = User::factory()->create(['fullname' => 'Alice Martin']);
        $bob = User::factory()->create(['fullname' => 'Bob Dupont']);

        SchoolUser::query()->create([
            'school_id' => $school->id,
            'user_id' => $director->id,
            'role_id' => $directorRole->id,
            'status' => SchoolUser::STATUS_ACTIVE,
        ]);

        SchoolUser::query()->create([
            'school_id' => $school->id,
            'user_id' => $alice->id,
            'role_id' => $rhRole->id,
            'status' => SchoolUser::STATUS_ACTIVE,
        ]);

        SchoolUser::query()->create([
            'school_id' => $school->id,
            'user_id' => $bob->id,
            'role_id' => $rhRole->id,
            'status' => SchoolUser::STATUS_ACTIVE,
        ]);

        SchoolStaffProfile::query()->create([
            'school_id' => $school->id,
            'user_id' => $alice->id,
            'department' => 'Direction',
            'position' => 'Responsable RH',
            'employment_status' => SchoolStaffProfile::EMPLOYMENT_FULL_TIME,
            'hire_date' => '2024-09-01',
            'monthly_salary' => 350000,
            'contract_type' => SchoolStaffProfile::CONTRACT_CDI,
        ]);

        SchoolStaffProfile::query()->create([
            'school_id' => $school->id,
            'user_id' => $bob->id,
            'department' => 'Scolarité',
            'position' => 'Assistant',
            'employment_status' => SchoolStaffProfile::EMPLOYMENT_PART_TIME,
            'hire_date' => '2025-01-10',
            'monthly_salary' => 200000,
            'contract_type' => SchoolStaffProfile::CONTRACT_CDD,
        ]);

        $request = Request::create('/schools/'.$school->id.'/hr/staff', 'GET', [
            'search' => 'Alice',
            'department' => 'Direction',
        ]);
        $request->setUserResolver(fn () => $director);

        $response = app(SchoolStaffProfileController::class)->index($request, $school);
        $payload = $response->getData(true);

        $this->assertCount(1, $payload['data']);
        $this->assertSame('Alice Martin', $payload['data'][0]['fullname']);
        $this->assertSame('Direction', $payload['data'][0]['department']);
    }
}
