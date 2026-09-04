<?php

namespace App\Console\Commands;

use App\Models\School;
use App\Models\SchoolUser;
use App\Models\User;
use App\Notifications\StaffQuotaExpiredNotification;
use App\Notifications\StaffQuotaExpiringNotification;
use App\Notifications\TrialExpiredNotification;
use App\Notifications\TrialExpiringNotification;
use Illuminate\Console\Command;

class ExpireSchoolTrials extends Command
{
    protected $signature = 'schools:expire-trials';

    protected $description = "Relance les écoles dont l'essai gratuit se termine bientôt, et passe en lecture seule celles dont l'essai est terminé";

    private const REMINDER_DAYS_BEFORE = 7;

    public function handle(): int
    {
        $remindedCount = $this->sendReminders();
        $expiredCount = $this->expireSchools();
        $startedStaffQuotaGracePeriods = $this->startStaffQuotaGracePeriods();
        $staffQuotaRemindedCount = $this->sendStaffQuotaReminders();
        $staffQuotaExpiredCount = $this->expireStaffQuotaSchools();

        $this->info("{$remindedCount} rappel(s) d'essai envoyé(s), {$expiredCount} école(s) passée(s) en lecture seule, {$startedStaffQuotaGracePeriods} délai(s) de quota démarré(s), {$staffQuotaRemindedCount} rappel(s) de quota envoyé(s), {$staffQuotaExpiredCount} école(s) bloquée(s) pour dépassement du quota personnel.");

        return self::SUCCESS;
    }

    private function sendReminders(): int
    {
        $schools = School::query()
            ->where('status', School::STATUS_ACTIVE)
            ->whereNotNull('trial_ends_at')
            ->whereNull('trial_reminder_sent_at')
            ->where('trial_ends_at', '<=', now()->addDays(self::REMINDER_DAYS_BEFORE))
            ->where('trial_ends_at', '>', now())
            ->get();

        foreach ($schools as $school) {
            $this->notifyDirecteurs($school, new TrialExpiringNotification($school));
            $school->update(['trial_reminder_sent_at' => now()]);
        }

        return $schools->count();
    }

    private function expireSchools(): int
    {
        $schools = School::query()
            ->where('status', School::STATUS_ACTIVE)
            ->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '<=', now())
            ->get();

        foreach ($schools as $school) {
            $school->update(['status' => School::STATUS_READ_ONLY]);
            $this->notifyDirecteurs($school, new TrialExpiredNotification($school));
        }

        return $schools->count();
    }

    private function sendStaffQuotaReminders(): int
    {
        $schools = School::query()
            ->where('status', School::STATUS_ACTIVE)
            ->whereNotNull('staff_quota_deadline_at')
            ->whereNull('staff_quota_reminder_sent_at')
            ->where('staff_quota_deadline_at', '<=', now()->addDays(self::REMINDER_DAYS_BEFORE))
            ->where('staff_quota_deadline_at', '>', now())
            ->get();

        foreach ($schools as $school) {
            if (! $school->exceedsStaffQuota()) {
                $school->update([
                    'staff_quota_deadline_at' => null,
                    'staff_quota_reminder_sent_at' => null,
                ]);

                continue;
            }

            $daysLeft = max(0, now()->diffInDays($school->staff_quota_deadline_at, false));
            $this->notifyDirecteurs($school, new StaffQuotaExpiringNotification($school, $daysLeft));
            $school->update(['staff_quota_reminder_sent_at' => now()]);
        }

        return $schools->count();
    }

    private function startStaffQuotaGracePeriods(): int
    {
        $schools = School::query()
            ->where('status', School::STATUS_ACTIVE)
            ->where('plan', School::PLAN_ECOLE)
            ->whereNull('staff_quota_deadline_at')
            ->get();

        $startedCount = 0;

        foreach ($schools as $school) {
            if (! $school->exceedsStaffQuota()) {
                continue;
            }

            $deadline = now()->addDays(14);
            $created = School::query()
                ->whereKey($school->id)
                ->whereNull('staff_quota_deadline_at')
                ->update(['staff_quota_deadline_at' => $deadline]);

            if ($created > 0) {
                $school->staff_quota_deadline_at = $deadline;
                $this->notifyDirecteurs($school, new StaffQuotaExpiringNotification($school, 14));
                $startedCount++;
            }
        }

        return $startedCount;
    }

    private function expireStaffQuotaSchools(): int
    {
        $schools = School::query()
            ->where('status', School::STATUS_ACTIVE)
            ->whereNotNull('staff_quota_deadline_at')
            ->where('staff_quota_deadline_at', '<=', now())
            ->get();

        $expiredCount = 0;

        foreach ($schools as $school) {
            if (! $school->exceedsStaffQuota()) {
                $school->update([
                    'staff_quota_deadline_at' => null,
                    'staff_quota_reminder_sent_at' => null,
                ]);

                continue;
            }

            $school->update(['status' => School::STATUS_READ_ONLY]);
            $this->notifyDirecteurs($school, new StaffQuotaExpiredNotification($school));
            $expiredCount++;
        }

        return $expiredCount;
    }

    private function notifyDirecteurs(School $school, $notification): void
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
