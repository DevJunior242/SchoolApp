<?php

namespace App\Policies;

use App\Models\School;
use App\Models\SchoolUser;
use App\Models\User;

class SchoolPolicy
{
    public function update(User $user, School $school): bool
    {
        if ($user->role?->slug === 'superadmin') {
            return true;
        }

        return SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $user->id)
            ->where('status', SchoolUser::STATUS_ACTIVE)
            ->whereHas('role', fn($query) => $query->whereIn('slug', ['directeur', 'fondateur']))
            ->exists();
    }
}
