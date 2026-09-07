<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\SchoolStaffLeaveController;
use App\Models\Country;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolStaffLeave;
use App\Models\SchoolStaffProfile;
use App\Models\SchoolUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class SchoolStaffLeaveControllerTest extends TestCase
{
    use RefreshDatabase;

    private School $school;
    private User $director;
    private User $staff;
    private SchoolStaffLeaveController $controller;

    protected function setUp(): void
    {
        parent::setUp();

        $directorRole = Role::query()->firstOrCreate(['slug' => 'directeur'], ['name' => 'Directeur']);
        $rhRole = Role::query()->firstOrCreate(['slug' => 'rh'], ['name' => 'Responsable RH']);
        $country = Country::query()->create([
            'name' => 'Cote d Ivoire',
            'iso_code' => 'CI',
            'currency' => 'XOF',
        ]);

        $this->school = School::query()->create([
            'country_id' => $country->id,
            'name' => 'École Congés Test',
            'status' => School::STATUS_ACTIVE,
            'plan' => School::PLAN_ECOLE,
            'language' => School::LANGUAGE_FR,
            'currency' => 'XOF',
        ]);

        $this->director = User::factory()->create(['fullname' => 'Directeur RH']);
        $this->staff = User::factory()->create(['fullname' => 'Employé Test']);

        SchoolUser::query()->create([
            'school_id' => $this->school->id,
            'user_id' => $this->director->id,
            'role_id' => $directorRole->id,
            'status' => SchoolUser::STATUS_ACTIVE,
        ]);

        SchoolUser::query()->create([
            'school_id' => $this->school->id,
            'user_id' => $this->staff->id,
            'role_id' => $rhRole->id,
            'status' => SchoolUser::STATUS_ACTIVE,
        ]);

        SchoolStaffProfile::query()->create([
            'school_id' => $this->school->id,
            'user_id' => $this->staff->id,
            'department' => 'Direction',
            'position' => 'Assistant',
            'employment_status' => SchoolStaffProfile::EMPLOYMENT_FULL_TIME,
            'contract_type' => SchoolStaffProfile::CONTRACT_CDI,
        ]);

        $this->controller = app(SchoolStaffLeaveController::class);
    }

    public function test_staff_leave_can_be_created_as_pending(): void
    {
        $request = $this->requestAs($this->director, [
            'user_id' => $this->staff->id,
            'leave_type' => SchoolStaffLeave::TYPE_ANNUAL,
            'starts_on' => '2026-10-05',
            'ends_on' => '2026-10-09',
            'reason' => 'Congé annuel.',
        ]);

        $response = $this->controller->store($request, $this->school);
        $payload = $response->getData(true);

        $this->assertSame(201, $response->getStatusCode());
        $this->assertSame(SchoolStaffLeave::STATUS_PENDING, $payload['status']);
        $this->assertSame('En attente', $payload['status_label']);
        $this->assertDatabaseHas('school_staff_leaves', [
            'school_id' => $this->school->id,
            'user_id' => $this->staff->id,
            'status' => SchoolStaffLeave::STATUS_PENDING,
        ]);
    }

    public function test_staff_leave_can_be_approved(): void
    {
        $leave = SchoolStaffLeave::query()->create([
            'school_id' => $this->school->id,
            'user_id' => $this->staff->id,
            'leave_type' => SchoolStaffLeave::TYPE_SICK,
            'status' => SchoolStaffLeave::STATUS_PENDING,
            'starts_on' => '2026-10-12',
            'ends_on' => '2026-10-13',
        ]);

        $request = $this->requestAs($this->director, [
            'status' => SchoolStaffLeave::STATUS_APPROVED,
        ]);

        $response = $this->controller->updateStatus($request, $this->school, $leave);
        $payload = $response->getData(true);

        $this->assertSame(SchoolStaffLeave::STATUS_APPROVED, $payload['status']);
        $this->assertSame('Directeur RH', $payload['approved_by']);
        $this->assertNotNull($payload['approved_at']);
        $this->assertDatabaseHas('school_staff_leaves', [
            'id' => $leave->id,
            'status' => SchoolStaffLeave::STATUS_APPROVED,
            'approved_by' => $this->director->id,
        ]);
    }

    public function test_non_hr_member_cannot_manage_staff_leave(): void
    {
        $teacherRole = Role::query()->firstOrCreate(['slug' => 'professeur'], ['name' => 'Professeur']);
        $teacher = User::factory()->create(['fullname' => 'Professeur Test']);
        SchoolUser::query()->create([
            'school_id' => $this->school->id,
            'user_id' => $teacher->id,
            'role_id' => $teacherRole->id,
            'status' => SchoolUser::STATUS_ACTIVE,
        ]);

        $request = $this->requestAs($teacher, []);

        $this->expectException(HttpException::class);
        $this->controller->index($request, $this->school);
    }

    public function test_leave_end_date_must_not_precede_start_date(): void
    {
        $request = $this->requestAs($this->director, [
            'user_id' => $this->staff->id,
            'leave_type' => SchoolStaffLeave::TYPE_ANNUAL,
            'starts_on' => '2026-10-10',
            'ends_on' => '2026-10-05',
        ]);

        $this->expectException(ValidationException::class);
        $this->controller->store($request, $this->school);
    }

    private function requestAs(User $user, array $data): Request
    {
        $request = Request::create('/schools/' . $this->school->id . '/hr/leaves', 'POST', $data);
        $request->setUserResolver(fn() => $user);

        return $request;
    }
}
