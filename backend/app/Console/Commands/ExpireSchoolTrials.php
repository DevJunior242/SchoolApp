<?php

namespace App\Console\Commands;

use App\Models\School;
use App\Models\SchoolUser;
use App\Models\User;
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

        $this->info("{$remindedCount} rappel(s) d'essai envoyé(s), {$expiredCount} école(s) passée(s) en lecture seule.");

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
