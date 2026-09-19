<?php

namespace App\Services;

use App\Models\SchoolUser;
use App\Models\TreasuryAccount;

class AccountingPermissionService
{
    public function isAccountant(?SchoolUser $member): bool
    {
        return $member?->role?->slug === 'comptable';
    }

    public function isOwner(?SchoolUser $member): bool
    {
        return $this->isAccountant($member) && (bool) ($member->is_owner ?? false);
    }

    public function canManageAccount(?SchoolUser $actor, ?TreasuryAccount $account = null): bool
    {
        if ($actor === null) {
            return false;
        }

        if (! in_array($actor->role?->slug, ['admin', 'comptable'], true)) {
            return false;
        }

        if ($actor->sections->isEmpty()) {
            return true;
        }

        return $this->canAccessAccountSections($actor, $account);
    }

    public function canManageSection(?SchoolUser $actor, ?string $sectionId): bool
    {
        if ($actor === null || ! in_array($actor->role?->slug, ['admin', 'comptable'], true)) {
            return false;
        }

        if ($actor->sections->isEmpty()) {
            return true;
        }

        return $sectionId !== null
            && $actor->sections->pluck('id')->map(fn($id) => (string) $id)->contains((string) $sectionId);
    }

    public function canAccessAccountSections(?SchoolUser $actor, ?TreasuryAccount $account): bool
    {
        if ($actor === null || $account === null) {
            return false;
        }

        $actorSectionIds = $actor->sections->pluck('id')->map(fn($id) => (string) $id)->all();
        if ($actorSectionIds === []) {
            return true;
        }

        if ($account->section_id === null) {
            return false;
        }

        return in_array((string) $account->section_id, $actorSectionIds, true);
    }
}
