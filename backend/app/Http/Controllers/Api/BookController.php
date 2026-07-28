<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\BookCopy;
use App\Models\School;
use Illuminate\Http\Request;

class BookController extends Controller
{
    use AuthorizesSchoolDirecteur;

    /**
     * Visible par tout membre de l'école (catalogue consultable par tous,
     * pas seulement le personnel de bibliothèque).
     */
    public function index(Request $request, School $school)
    {
        $books = Book::query()
            ->where('school_id', $school->id)
            ->when(
                $request->query('search'),
                fn ($query, $search) => $query->where(fn ($q) => $q
                    ->where('title', 'like', "%{$search}%")
                    ->orWhere('author', 'like', "%{$search}%")
                    ->orWhere('isbn', 'like', "%{$search}%"))
            )
            ->when($request->query('category'), fn ($query, $category) => $query->where('category', $category))
            ->when($request->query('level_id'), fn ($query, $levelId) => $query->where('level_id', $levelId))
            ->withCount([
                'copies as copies_count',
                'copies as available_copies_count' => fn ($query) => $query->where('status', BookCopy::STATUS_AVAILABLE),
            ])
            ->with('level')
            ->orderBy('title')
            ->paginate($request->integer('per_page', 20));

        return response()->json($books);
    }

    public function show(Request $request, School $school, Book $book)
    {
        abort_if($book->school_id !== $school->id, 404);

        return response()->json($book->load('level', 'copies'));
    }

    public function store(Request $request, School $school)
    {
        $this->authorizeLibrarian($request, $school);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'author' => ['nullable', 'string', 'max:255'],
            'publisher' => ['nullable', 'string', 'max:255'],
            'isbn' => ['nullable', 'string', 'max:50'],
            'category' => ['nullable', 'string', 'max:100'],
            'language' => ['nullable', 'string', 'max:50'],
            'level_id' => ['nullable', 'uuid', 'exists:levels,id'],
            'description' => ['nullable', 'string'],
            'copies_count' => ['nullable', 'integer', 'min:0', 'max:100'],
        ]);

        $copiesCount = $validated['copies_count'] ?? 1;
        unset($validated['copies_count']);

        $book = Book::query()->create(['school_id' => $school->id, ...$validated]);

        for ($i = 0; $i < $copiesCount; $i++) {
            $book->copies()->create(['status' => BookCopy::STATUS_AVAILABLE]);
        }

        return response()->json($book->load('level', 'copies'), 201);
    }

    public function update(Request $request, School $school, Book $book)
    {
        $this->authorizeLibrarian($request, $school);
        abort_if($book->school_id !== $school->id, 404);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'author' => ['nullable', 'string', 'max:255'],
            'publisher' => ['nullable', 'string', 'max:255'],
            'isbn' => ['nullable', 'string', 'max:50'],
            'category' => ['nullable', 'string', 'max:100'],
            'language' => ['nullable', 'string', 'max:50'],
            'level_id' => ['nullable', 'uuid', 'exists:levels,id'],
            'description' => ['nullable', 'string'],
        ]);

        $book->update($validated);

        return response()->json($book->load('level', 'copies'));
    }

    public function destroy(Request $request, School $school, Book $book)
    {
        $this->authorizeLibrarian($request, $school);
        abort_if($book->school_id !== $school->id, 404);

        $book->delete();

        return response()->json(status: 204);
    }
}
