<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\School;
use App\Models\SchoolUser;
use App\Models\User;
use App\Notifications\StaffQuotaExpiringNotification;

trait EnforcesStaffQuota
{
    /**
     * Le palier École limite le nombre de comptes personnel (cf. page
     * tarifs) — parents et élèves n'entrent pas dans ce quota, ce ne sont
     * pas des comptes "personnel".
     */
    private function syncStaffQuota(School $school): void
    {
        $max = $school->maxStaffAccounts();

        if ($max === null) {
            $school->updateQuietly([
                'staff_quota_deadline_at' => null,
                'staff_quota_reminder_sent_at' => null,
            ]);

            return;
        }

        if (! $school->exceedsStaffQuota()) {
            $school->updateQuietly([
                'staff_quota_deadline_at' => null,
                'staff_quota_reminder_sent_at' => null,
            ]);

            return;
        }

        $deadline = now()->addDays(14);
        $created = School::query()
            ->whereKey($school->id)
            ->whereNull('staff_quota_deadline_at')
            ->update(['staff_quota_deadline_at' => $deadline]);

        if ($created > 0) {
            $school->staff_quota_deadline_at = $deadline;
            $this->notifyDirecteurs($school, new StaffQuotaExpiringNotification($school, 14));
        }
    }

    private function notifyDirecteurs(School $school, object $notification): void
    {
        $userIds = SchoolUser::query()
            ->where('school_id', $school->id)
            ->whereHas('role', fn ($query) => $query->where('slug', 'directeur'))
            ->pluck('user_id');

        User::query()->whereIn('id', $userIds)->get()->each(
            fn (User $user) => $user->notify($notification)
        );
    }
}
