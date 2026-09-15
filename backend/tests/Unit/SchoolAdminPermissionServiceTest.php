<?php

namespace Tests\Unit;

use App\Models\Role;
use App\Models\SchoolUser;
use App\Models\Section;
use App\Services\SchoolAdminPermissionService;
use PHPUnit\Framework\TestCase;

class SchoolAdminPermissionServiceTest extends TestCase
{
    protected SchoolAdminPermissionService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new SchoolAdminPermissionService();
    }

    public function test_admin_levels_are_explicitly_distinct(): void
    {
        $principal = $this->makeAdminUser(true, []);
        $general = $this->makeAdminUser(false, []);
        $sectionAdmin = $this->makeAdminUser(false, ['section-1']);

        $this->assertTrue($this->service->isPrincipal($principal));
        $this->assertTrue($this->service->isGeneral($general));
        $this->assertTrue($this->service->isSectionAdmin($sectionAdmin));
        $this->assertFalse($this->service->isSectionAdmin($general));
        $this->assertFalse($this->service->isGeneral($sectionAdmin));
    }

    public function test_principal_can_create_and_manage_everyone(): void
    {
        $principal = $this->makeAdminUser(true, []);
        $general = $this->makeAdminUser(false, []);
        $sectionAdmin = $this->makeAdminUser(false, ['section-1']);

        $this->assertTrue($this->service->canCreateAdmin($principal));
        $this->assertTrue($this->service->canManageMember($principal, $general));
        $this->assertTrue($this->service->canManageMember($principal, $sectionAdmin));
    }

    public function test_general_admin_can_create_section_admins(): void
    {
        $general = $this->makeAdminUser(false, []);
        $sectionAdmin = $this->makeAdminUser(false, ['section-1']);

        $this->assertTrue($this->service->canCreateAdmin($general, ['section-1']));
        $this->assertTrue($this->service->canManageMember($general, $sectionAdmin));
    }

    public function test_section_admin_cannot_create_or_manage_another_section(): void
    {
        $owner = $this->makeAdminUser(true, []);
        $sectionAdmin = $this->makeAdminUser(false, ['section-1']);
        $otherSectionAdmin = $this->makeAdminUser(false, ['section-2']);

        $this->assertTrue($this->service->canManageMember($owner, $otherSectionAdmin));
        $this->assertFalse($this->service->canCreateAdmin($sectionAdmin, ['section-2']));
        $this->assertFalse($this->service->canManageMember($sectionAdmin, $otherSectionAdmin));
    }

    protected function makeAdminUser(bool $isOwner, array $sectionIds): SchoolUser
    {
        $user = new SchoolUser([
            'is_owner' => $isOwner,
        ]);

        $user->setRelation('role', new Role(['slug' => 'admin']));

        $sections = collect($sectionIds)->map(function (string $id) {
            $section = new Section();
            $section->id = $id;

            return $section;
        });
        $user->setRelation('sections', $sections);

        return $user;
    }
}
