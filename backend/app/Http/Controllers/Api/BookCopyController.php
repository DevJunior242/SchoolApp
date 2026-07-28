<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\BookCopy;
use App\Models\School;
use Illuminate\Http\Request;

class BookCopyController extends Controller
{
    use AuthorizesSchoolDirecteur;

    public function store(Request $request, School $school, Book $book)
    {
        $this->authorizeLibrarian($request, $school);
        abort_if($book->school_id !== $school->id, 404);

        $copy = $book->copies()->create(['status' => BookCopy::STATUS_AVAILABLE]);

        return response()->json($copy, 201);
    }

    /**
     * Sert surtout à basculer un exemplaire en "perdu" ou à le remettre
     * disponible (retrouvé) — pas de champ modifiable à part le statut.
     */
    public function update(Request $request, School $school, BookCopy $copy)
    {
        $this->authorizeLibrarian($request, $school);
        $copy->loadMissing('book');
        abort_if($copy->book->school_id !== $school->id, 404);

        $validated = $request->validate([
            'status' => ['required', 'integer', 'in:'.implode(',', [
                BookCopy::STATUS_AVAILABLE,
                BookCopy::STATUS_LOST,
            ])],
        ]);

        abort_if(
            $copy->status === BookCopy::STATUS_BORROWED,
            422,
            "Cet exemplaire est actuellement emprunté : traitez-le depuis le retour ou la perte du prêt en cours."
        );

        $copy->update($validated);

        return response()->json($copy);
    }

    public function destroy(Request $request, School $school, BookCopy $copy)
    {
        $this->authorizeLibrarian($request, $school);
        $copy->loadMissing('book');
        abort_if($copy->book->school_id !== $school->id, 404);
        abort_if($copy->status === BookCopy::STATUS_BORROWED, 422, "Cet exemplaire est actuellement emprunté.");

        $copy->delete();

        return response()->json(status: 204);
    }
}
