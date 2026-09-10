<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\ValidatesSchoolSection;
use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\BookCopy;
use App\Models\School;
use Illuminate\Http\Request;

class BookController extends Controller
{
    use AuthorizesSchoolDirecteur, ValidatesSchoolSection;

    /**
     * Visible par tout membre de l'école (catalogue consultable par tous,
     * pas seulement le personnel de bibliothèque).
     */
    public function index(Request $request, School $school)
    {
        $sectionIds = $this->restrictedSectionIds($request, $school);

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
            ->when($sectionIds, fn ($query, $ids) => $query->where(fn ($levelQuery) => $levelQuery
                ->whereNull('level_id')
                ->orWhereHas('level', fn ($query) => $query->whereIn('section_id', $ids))))
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
        $level = $this->activeSchoolLevel($school, $validated['level_id'] ?? null);
        if ($level) {
            $this->authorizeLevelSection($request, $school, $level);
        }

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

        $level = $this->activeSchoolLevel($school, $validated['level_id'] ?? null);
        if ($level) {
            $this->authorizeLevelSection($request, $school, $level);
        }

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
