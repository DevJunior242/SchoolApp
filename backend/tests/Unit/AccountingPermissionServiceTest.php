<?php

namespace Tests\Unit;

use App\Models\Role;
use App\Models\SchoolUser;
use App\Models\Section;
use App\Models\TreasuryAccount;
use App\Services\AccountingPermissionService;
use PHPUnit\Framework\TestCase;

class AccountingPermissionServiceTest extends TestCase
{
    protected AccountingPermissionService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new AccountingPermissionService();
    }

    public function test_first_accounting_owner_can_manage_global_accounts(): void
    {
        $owner = $this->makeAccountant(true, []);
        $account = new TreasuryAccount(['section_id' => null]);

        $this->assertTrue($this->service->isOwner($owner));
        $this->assertTrue($this->service->canManageAccount($owner, $account));
    }

    public function test_section_accountant_cannot_manage_global_or_other_section_account(): void
    {
        $accountant = $this->makeAccountant(true, ['section-1']);
        $globalAccount = new TreasuryAccount(['section_id' => null]);
        $otherSectionAccount = new TreasuryAccount(['section_id' => 'section-2']);
        $ownSectionAccount = new TreasuryAccount(['section_id' => 'section-1']);

        $this->assertFalse($this->service->canManageAccount($accountant, $globalAccount));
        $this->assertFalse($this->service->canManageAccount($accountant, $otherSectionAccount));
        $this->assertTrue($this->service->canManageAccount($accountant, $ownSectionAccount));
    }

    public function test_section_accountant_can_create_only_in_assigned_section(): void
    {
        $accountant = $this->makeAccountant(false, ['section-1']);

        $this->assertTrue($this->service->canManageSection($accountant, 'section-1'));
        $this->assertFalse($this->service->canManageSection($accountant, 'section-2'));
        $this->assertFalse($this->service->canManageSection($accountant, null));
    }

    private function makeAccountant(bool $isOwner, array $sectionIds): SchoolUser
    {
        $user = new SchoolUser(['is_owner' => $isOwner]);
        $user->setRelation('role', new Role(['slug' => 'comptable']));
        $user->setRelation('sections', collect($sectionIds)->map(function (string $id) {
            $section = new Section();
            $section->id = $id;
            return $section;
        }));

        return $user;
    }
}
