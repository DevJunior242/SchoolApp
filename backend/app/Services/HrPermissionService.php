<?php

namespace App\Services;

use App\Models\SchoolUser;

class HrPermissionService
{
    public function isHr(?SchoolUser $member): bool
    {
        return $member?->role?->slug === 'rh';
    }

    public function isOwner(?SchoolUser $member): bool
    {
        return $this->isHr($member) && (bool) ($member->is_owner ?? false);
    }

    public function canManage(?SchoolUser $actor, ?SchoolUser $target = null): bool
    {
        if (! $this->isOwner($actor)) {
            return false;
        }

        return $target === null || $this->isHr($target);
    }

    public function canAssignSections(?SchoolUser $actor, array $sectionIds): bool
    {
        if (! $this->isOwner($actor)) {
            return false;
        }

        $actorSectionIds = $actor->sections->pluck('id')->map(fn($id) => (string) $id)->all();

        if ($actorSectionIds === []) {
            return true;
        }

        return count(array_diff($sectionIds, $actorSectionIds)) === 0;
    }
}
