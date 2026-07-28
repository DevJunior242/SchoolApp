<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\BookCopy;
use App\Models\BookReservation;
use App\Models\ClassStudent;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\Student;
use Illuminate\Http\Request;

class BookReservationController extends Controller
{
    use AuthorizesSchoolDirecteur;

    /**
     * Vue bibliothécaire : toute la file d'attente de l'école (ou d'un
     * livre précis), pour suivre qui attend quoi.
     */
    public function index(Request $request, School $school)
    {
        $this->authorizeLibrarian($request, $school);

        $reservations = BookReservation::query()
            ->where('school_id', $school->id)
            ->whereIn('status', [BookReservation::STATUS_WAITING, BookReservation::STATUS_READY])
            ->when($request->query('book_id'), fn ($query, $bookId) => $query->where('book_id', $bookId))
            ->with('book', 'student')
            ->oldest('reserved_at')
            ->get();

        return response()->json($reservations);
    }

    /**
     * Réservation possible uniquement quand aucun exemplaire n'est
     * disponible : sinon l'élève doit simplement emprunter directement.
     * Autorisé pour l'élève lui-même, un de ses parents, ou le personnel.
     */
    public function store(Request $request, School $school, Student $student)
    {
        $this->abortUnlessSelfParentOrStaff($request, $school, $student);
        $this->abortUnlessEnrolled($school, $student);

        $validated = $request->validate([
            'book_id' => ['required', 'uuid', 'exists:books,id'],
        ]);

        $book = Book::query()->findOrFail($validated['book_id']);
        abort_if($book->school_id !== $school->id, 404);

        $availableCopies = $book->copies()->where('status', BookCopy::STATUS_AVAILABLE)->count();
        abort_if($availableCopies > 0, 422, 'Ce livre est disponible, vous pouvez l\'emprunter directement.');

        $alreadyReserved = BookReservation::query()
            ->where('book_id', $book->id)
            ->where('student_id', $student->id)
            ->whereIn('status', [BookReservation::STATUS_WAITING, BookReservation::STATUS_READY])
            ->exists();
        abort_if($alreadyReserved, 422, 'Ce livre est déjà réservé pour cet élève.');

        $reservation = BookReservation::query()->create([
            'school_id' => $school->id,
            'book_id' => $book->id,
            'student_id' => $student->id,
            'status' => BookReservation::STATUS_WAITING,
            'reserved_at' => now(),
        ]);

        return response()->json($reservation->load('book'), 201);
    }

    public function cancel(Request $request, School $school, BookReservation $reservation)
    {
        abort_if($reservation->school_id !== $school->id, 404);
        $this->abortUnlessSelfParentOrStaff($request, $school, $reservation->student);

        abort_unless(
            in_array($reservation->status, [BookReservation::STATUS_WAITING, BookReservation::STATUS_READY], true),
            422,
            'Cette réservation ne peut plus être annulée.'
        );

        $reservation->update(['status' => BookReservation::STATUS_CANCELLED]);

        return response()->json($reservation);
    }

    private function abortUnlessSelfParentOrStaff(Request $request, School $school, Student $student): void
    {
        $user = $request->user();

        if ($student->user_id === $user->id) {
            return;
        }

        if ($student->parents()->where('parent_user_id', $user->id)->exists()) {
            return;
        }

        $isStaff = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $user->id)
            ->whereHas('role', fn ($query) => $query->whereIn('slug', ['directeur', 'bibliothecaire']))
            ->exists();

        abort_unless($isStaff, 403, "Vous n'avez pas accès à cette réservation.");
    }

    /**
     * Même garde que côté prêts : un id d'élève réel mais hors de cette
     * école ne doit pas pouvoir réserver ni apparaître ici.
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
}
