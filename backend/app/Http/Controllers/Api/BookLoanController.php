<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\BookCopy;
use App\Models\BookDocument;
use App\Models\BookLoan;
use App\Models\BookReservation;
use App\Models\ClassStudent;
use App\Models\ParentStudent;
use App\Models\School;
use App\Models\Student;
use App\Notifications\BookReservationReadyNotification;
use Illuminate\Http\Request;

class BookLoanController extends Controller
{
    use AuthorizesSchoolDirecteur;

    /**
     * Étape 1 du prêt, après scan du badge élève : emprunts en cours (avec
     * retard éventuel) + réservations prêtes à retirer, pour vérifier la
     * situation de l'élève avant de lui prêter un nouveau livre.
     */
    public function lookup(Request $request, School $school, Student $student)
    {
        $this->authorizeLibrarian($request, $school);
        $this->abortUnlessEnrolled($school, $student);

        $activeLoans = BookLoan::query()
            ->where('student_id', $student->id)
            ->where('status', BookLoan::STATUS_ACTIVE)
            ->with('copy.book')
            ->get();

        $readyReservations = BookReservation::query()
            ->where('student_id', $student->id)
            ->where('status', BookReservation::STATUS_READY)
            ->with('book')
            ->get();

        return response()->json([
            'student' => $student,
            'active_loans' => $activeLoans,
            'ready_reservations' => $readyReservations,
        ]);
    }

    /**
     * Étape 1 du retour, après scan du QR de l'exemplaire : retrouve le prêt
     * en cours et l'élève concerné, pour confirmation avant de valider.
     */
    public function copyLookup(Request $request, School $school, BookCopy $copy)
    {
        $this->authorizeLibrarian($request, $school);
        $copy->loadMissing('book');
        abort_if($copy->book->school_id !== $school->id, 404);

        $loan = BookLoan::query()
            ->where('book_copy_id', $copy->id)
            ->where('status', BookLoan::STATUS_ACTIVE)
            ->with('student')
            ->first();

        return response()->json([
            'copy' => $copy,
            'loan' => $loan,
        ]);
    }

    /**
     * Étape 2 du prêt : `force: true` prête quand même malgré une
     * réservation en attente d'un autre élève (le bibliothécaire garde la
     * main plutôt qu'un blocage strict).
     */
    public function store(Request $request, School $school, Student $student)
    {
        $this->authorizeLibrarian($request, $school);
        $this->abortUnlessEnrolled($school, $student);

        $validated = $request->validate([
            'book_copy_id' => ['required', 'uuid', 'exists:book_copies,id'],
            'force' => ['nullable', 'boolean'],
        ]);

        $copy = BookCopy::query()->with('book')->findOrFail($validated['book_copy_id']);
        abort_if($copy->book->school_id !== $school->id, 404);
        abort_unless($copy->status === BookCopy::STATUS_AVAILABLE, 422, "Cet exemplaire n'est pas disponible.");

        $alreadyBorrowed = BookLoan::query()
            ->where('student_id', $student->id)
            ->where('status', BookLoan::STATUS_ACTIVE)
            ->whereHas('copy', fn ($query) => $query->where('book_id', $copy->book_id))
            ->exists();
        abort_if($alreadyBorrowed, 422, 'Cet élève a déjà un exemplaire de ce livre en cours.');

        $conflictingReservation = BookReservation::query()
            ->where('book_id', $copy->book_id)
            ->where('student_id', '!=', $student->id)
            ->whereIn('status', [BookReservation::STATUS_WAITING, BookReservation::STATUS_READY])
            ->with('student')
            ->oldest('reserved_at')
            ->first();

        if ($conflictingReservation && ! ($validated['force'] ?? false)) {
            return response()->json([
                'message' => "Ce livre est réservé pour {$conflictingReservation->student->fullname}.",
                'reservation' => $conflictingReservation,
            ], 422);
        }

        $loan = BookLoan::query()->create([
            'school_id' => $school->id,
            'book_copy_id' => $copy->id,
            'student_id' => $student->id,
            'status' => BookLoan::STATUS_ACTIVE,
            'borrowed_at' => now(),
            'due_at' => now()->addDays($school->library_loan_duration_days),
            'issued_by' => $request->user()->id,
        ]);

        $copy->update(['status' => BookCopy::STATUS_BORROWED]);

        $ownReservation = BookReservation::query()
            ->where('book_id', $copy->book_id)
            ->where('student_id', $student->id)
            ->whereIn('status', [BookReservation::STATUS_WAITING, BookReservation::STATUS_READY])
            ->first();
        $ownReservation?->update(['status' => BookReservation::STATUS_FULFILLED]);

        return response()->json($loan->load('copy.book', 'student'), 201);
    }

    /**
     * Retour : libère l'exemplaire, puis fait passer la réservation la plus
     * ancienne (s'il y en a une) au statut "prête à retirer" avec notification.
     */
    public function returnLoan(Request $request, School $school, BookLoan $loan)
    {
        $this->authorizeLibrarian($request, $school);
        abort_if($loan->school_id !== $school->id, 404);
        abort_unless($loan->status === BookLoan::STATUS_ACTIVE, 422, 'Ce prêt n\'est plus en cours.');

        $loan->update([
            'status' => BookLoan::STATUS_RETURNED,
            'returned_at' => now(),
            'returned_to' => $request->user()->id,
        ]);

        $copy = $loan->copy;
        $copy->update(['status' => BookCopy::STATUS_AVAILABLE]);

        $promoted = $this->promoteNextReservation($copy->book_id);

        return response()->json([
            'loan' => $loan->load('copy.book', 'student'),
            'promoted_reservation' => $promoted,
        ]);
    }

    public function markLost(Request $request, School $school, BookLoan $loan)
    {
        $this->authorizeLibrarian($request, $school);
        abort_if($loan->school_id !== $school->id, 404);
        abort_unless($loan->status === BookLoan::STATUS_ACTIVE, 422, 'Ce prêt n\'est plus en cours.');

        $loan->update(['status' => BookLoan::STATUS_LOST]);
        $loan->copy->update(['status' => BookCopy::STATUS_LOST]);

        return response()->json($loan->load('copy.book', 'student'));
    }

    /**
     * Vue élève (compte propre) : ses emprunts, réservations et les
     * documents numériques accessibles à son niveau.
     */
    public function mine(Request $request, School $school)
    {
        $student = $request->user()->studentProfile;
        abort_unless($student, 404);
        $this->abortUnlessEnrolled($school, $student);

        return response()->json($this->studentLibrarySummary($school, $student));
    }

    /**
     * Vue parent : la même chose, pour chacun de ses enfants inscrits dans
     * cette école.
     */
    public function forParent(Request $request, School $school)
    {
        $studentIds = ParentStudent::query()
            ->where('parent_user_id', $request->user()->id)
            ->pluck('student_id');

        $children = Student::query()
            ->whereIn('id', $studentIds)
            ->whereHas('classStudents', fn ($query) => $query
                ->where('status', ClassStudent::STATUS_ACTIVE)
                ->whereHas('schoolClass', fn ($q) => $q->where('school_id', $school->id)))
            ->get();

        return response()->json(
            $children->map(fn ($student) => [
                'student' => $student,
                ...$this->studentLibrarySummary($school, $student),
            ])->values()
        );
    }

    private function studentLibrarySummary(School $school, Student $student): array
    {
        $activeLoans = BookLoan::query()
            ->where('student_id', $student->id)
            ->where('status', BookLoan::STATUS_ACTIVE)
            ->with('copy.book')
            ->get();

        $reservations = BookReservation::query()
            ->where('student_id', $student->id)
            ->whereIn('status', [BookReservation::STATUS_WAITING, BookReservation::STATUS_READY])
            ->with('book')
            ->get();

        $levelId = ClassStudent::query()
            ->where('student_id', $student->id)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->whereHas('schoolClass', fn ($query) => $query->where('school_id', $school->id))
            ->with('schoolClass')
            ->first()
            ?->schoolClass
            ?->level_id;

        $documents = BookDocument::query()
            ->where('school_id', $school->id)
            ->where(fn ($query) => $query->whereNull('level_id')->orWhere('level_id', $levelId))
            ->with('book')
            ->orderByDesc('created_at')
            ->get();

        return [
            'active_loans' => $activeLoans,
            'reservations' => $reservations,
            'documents' => $documents,
        ];
    }

    /**
     * L'id de l'élève circule tel quel dans le QR (voir Student::$matricule) :
     * un id réel mais d'un autre établissement ne doit pas pouvoir emprunter
     * ni apparaître dans la recherche ici.
     */
    private function abortUnlessEnrolled(School $school, Student $student): void
    {
        $enrolled = ClassStudent::query()
            ->where('student_id', $student->id)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->whereHas('schoolClass', fn ($query) => $query->where('school_id', $school->id))
            ->exists();

        abort_unless($enrolled, 404);
    }

    private function promoteNextReservation(string $bookId): ?BookReservation
    {
        $next = BookReservation::query()
            ->where('book_id', $bookId)
            ->where('status', BookReservation::STATUS_WAITING)
            ->oldest('reserved_at')
            ->first();

        if (! $next) {
            return null;
        }

        $next->update(['status' => BookReservation::STATUS_READY, 'notified_at' => now()]);
        $next->loadMissing('book', 'student.parents');

        $recipients = $next->student->parents;
        foreach ($recipients as $parent) {
            $parent->notify(new BookReservationReadyNotification($next));
        }

        $studentUser = $next->student->user;
        if ($studentUser) {
            $studentUser->notify(new BookReservationReadyNotification($next));
        }

        return $next;
    }
}
