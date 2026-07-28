<?php

namespace App\Console\Commands;

use App\Models\BookLoan;
use App\Models\ClassStudent;
use App\Models\SchoolUser;
use App\Models\User;
use App\Notifications\BookLoanDueSoonNotification;
use App\Notifications\BookLoanOverdueNotification;
use Illuminate\Console\Command;

class NotifyLibraryLoanDueDates extends Command
{
    protected $signature = 'library:notify-loan-due-dates';

    protected $description = "Notifie les parents/élèves des retours de livres proches ou en retard, et le personnel des retards";

    private const DUE_SOON_DAYS = 2;

    public function handle(): int
    {
        $dueSoonCount = $this->notifyDueSoon();
        $overdueCount = $this->notifyOverdue();

        $this->info("{$dueSoonCount} rappel(s) de retour envoyé(s), {$overdueCount} retard(s) notifié(s).");

        return self::SUCCESS;
    }

    private function notifyDueSoon(): int
    {
        $threshold = now()->addDays(self::DUE_SOON_DAYS)->toDateString();

        $loans = BookLoan::query()
            ->where('status', BookLoan::STATUS_ACTIVE)
            ->where('due_soon_notified', false)
            ->whereDate('due_at', '<=', $threshold)
            ->whereDate('due_at', '>=', now()->toDateString())
            ->with('student.parents', 'student.user')
            ->get();

        foreach ($loans as $loan) {
            foreach ($loan->student->parents as $parent) {
                $parent->notify(new BookLoanDueSoonNotification($loan));
            }
            $loan->student->user?->notify(new BookLoanDueSoonNotification($loan));

            $loan->update(['due_soon_notified' => true]);
        }

        return $loans->count();
    }

    private function notifyOverdue(): int
    {
        $loans = BookLoan::query()
            ->where('status', BookLoan::STATUS_ACTIVE)
            ->where('overdue_notified', false)
            ->whereDate('due_at', '<', now()->toDateString())
            ->with('student.parents', 'student.user', 'copy.book')
            ->get();

        foreach ($loans as $loan) {
            foreach ($loan->student->parents as $parent) {
                $parent->notify(new BookLoanOverdueNotification($loan));
            }
            $loan->student->user?->notify(new BookLoanOverdueNotification($loan));

            $this->notifyLibrarians($loan);

            $loan->update(['overdue_notified' => true]);
        }

        return $loans->count();
    }

    private function notifyLibrarians(BookLoan $loan): void
    {
        $schoolIds = ClassStudent::query()
            ->where('student_id', $loan->student_id)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->with('schoolClass')
            ->get()
            ->pluck('schoolClass.school_id')
            ->filter()
            ->unique();

        $userIds = SchoolUser::query()
            ->whereIn('school_id', $schoolIds)
            ->whereHas('role', fn ($query) => $query->whereIn('slug', ['directeur', 'bibliothecaire']))
            ->pluck('user_id')
            ->unique();

        User::query()->whereIn('id', $userIds)->get()->each(
            fn ($user) => $user->notify(new BookLoanOverdueNotification($loan))
        );
    }
}
