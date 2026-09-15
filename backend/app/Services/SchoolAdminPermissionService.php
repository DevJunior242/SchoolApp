<?php

namespace App\Services;

use App\Models\SchoolUser;

class SchoolAdminPermissionService
{
    public function isAdmin(?SchoolUser $schoolUser): bool
    {
        return $schoolUser !== null && $schoolUser->role?->slug === 'admin';
    }

    public function isPrincipal(?SchoolUser $schoolUser): bool
    {
        return $this->isAdmin($schoolUser) && (bool) ($schoolUser->is_owner ?? false);
    }

    public function isGeneral(?SchoolUser $schoolUser): bool
    {
        if (! $this->isAdmin($schoolUser)) {
            return false;
        }

        return ! $this->isPrincipal($schoolUser) && $schoolUser->sections->isEmpty();
    }

    public function isSectionAdmin(?SchoolUser $schoolUser): bool
    {
        if (! $this->isAdmin($schoolUser)) {
            return false;
        }

        return ! $this->isPrincipal($schoolUser) && $schoolUser->sections->isNotEmpty();
    }

    public function isOwner(?SchoolUser $schoolUser): bool
    {
        return $this->isPrincipal($schoolUser);
    }

    public function canCreateAdmin(?SchoolUser $actor, array $sectionIds = []): bool
    {
        if (! $this->isAdmin($actor)) {
            return false;
        }

        if ($this->isPrincipal($actor)) {
            return true;
        }

        if ($this->isGeneral($actor)) {
            return true;
        }

        return $this->canAssignSections($actor, $sectionIds);
    }

    public function canManageMember(?SchoolUser $actor, ?SchoolUser $target): bool
    {
        if ($actor === null || $target === null) {
            return false;
        }

        if ($this->isPrincipal($actor)) {
            return ! $this->isPrincipal($target);
        }

        if (! $this->isAdmin($actor)) {
            return false;
        }

        if ($this->isPrincipal($target)) {
            return false;
        }

        if ($this->isGeneral($actor)) {
            return true;
        }

        $actorSectionIds = $this->sectionIds($actor);
        $targetSectionIds = $this->sectionIds($target);

        if ($targetSectionIds === []) {
            return false;
        }

        return ! empty(array_intersect($actorSectionIds, $targetSectionIds));
    }

    public function canAssignSections(?SchoolUser $actor, array $sectionIds): bool
    {
        if ($actor === null) {
            return false;
        }

        if ($this->isPrincipal($actor)) {
            return true;
        }

        if (! $this->isAdmin($actor)) {
            return false;
        }

        if ($this->isGeneral($actor)) {
            return true;
        }

        if ($sectionIds === []) {
            return true;
        }

        $actorSectionIds = $this->sectionIds($actor);

        return count(array_diff($sectionIds, $actorSectionIds)) === 0;
    }

    private function sectionIds(SchoolUser $schoolUser): array
    {
        return collect($schoolUser->sections ?? [])
            ->pluck('id')
            ->filter(fn($id) => $id !== null && $id !== '')
            ->map(fn($id) => (string) $id)
            ->values()
            ->all();
    }
}
