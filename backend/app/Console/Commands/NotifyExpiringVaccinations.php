<?php

namespace App\Console\Commands;

use App\Models\ClassStudent;
use App\Models\SchoolUser;
use App\Models\StudentVaccination;
use App\Models\User;
use App\Notifications\VaccinationExpiringNotification;
use Illuminate\Console\Command;

class NotifyExpiringVaccinations extends Command
{
    protected $signature = 'health:notify-expiring-vaccinations';

    protected $description = 'Notifie le directeur et l\'infirmier des vaccins expirant dans 30 jours';

    public function handle(): int
    {
        $today = now()->toDateString();
        $threshold = now()->addDays(30)->toDateString();

        $vaccinations = StudentVaccination::query()
            ->where('expiry_notified', false)
            ->whereNotNull('expires_at')
            ->whereDate('expires_at', '>=', $today)
            ->whereDate('expires_at', '<=', $threshold)
            ->with('student')
            ->get();

        foreach ($vaccinations as $vaccination) {
            $this->notifyForVaccination($vaccination);
            $vaccination->update(['expiry_notified' => true]);
        }

        $this->info(count($vaccinations).' vaccin(s) notifié(s).');

        return self::SUCCESS;
    }

    private function notifyForVaccination(StudentVaccination $vaccination): void
    {
        $schoolIds = ClassStudent::query()
            ->where('student_id', $vaccination->student_id)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->with('schoolClass')
            ->get()
            ->pluck('schoolClass.school_id')
            ->filter()
            ->unique();

        $userIds = SchoolUser::query()
            ->whereIn('school_id', $schoolIds)
            ->whereHas('role', fn ($query) => $query->whereIn('slug', ['directeur', 'infirmier']))
            ->pluck('user_id')
            ->unique();

        $recipients = User::query()->whereIn('id', $userIds)->get();

        foreach ($recipients as $recipient) {
            $recipient->notify(new VaccinationExpiringNotification($vaccination));
        }
    }
}
