<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\BookDocument;
use App\Models\ClassStudent;
use App\Models\ParentStudent;
use App\Models\School;
use App\Models\SchoolUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BookDocumentController extends Controller
{
    use AuthorizesSchoolDirecteur;

    /**
     * Vue bibliothécaire : tous les documents, pour gestion (pas de filtre
     * par niveau ici, contrairement à la vue élève/parent).
     */
    public function index(Request $request, School $school)
    {
        $this->authorizeLibrarian($request, $school);

        return response()->json(
            BookDocument::query()
                ->where('school_id', $school->id)
                ->with('book', 'level')
                ->orderByDesc('created_at')
                ->get()
        );
    }

    public function store(Request $request, School $school)
    {
        $this->authorizeLibrarian($request, $school);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'book_id' => ['nullable', 'uuid', 'exists:books,id'],
            'level_id' => ['nullable', 'uuid', 'exists:levels,id'],
            'file' => ['required', 'file', 'mimes:pdf', 'max:20480'],
        ]);

        $document = BookDocument::query()->create([
            'school_id' => $school->id,
            'book_id' => $validated['book_id'] ?? null,
            'title' => $validated['title'],
            'level_id' => $validated['level_id'] ?? null,
            'path' => $request->file('file')->store("schools/{$school->id}/documents", 'library'),
            'uploaded_by' => $request->user()->id,
        ]);

        return response()->json($document->load('book', 'level'), 201);
    }

    public function destroy(Request $request, School $school, BookDocument $document)
    {
        $this->authorizeLibrarian($request, $school);
        abort_if($document->school_id !== $school->id, 404);

        Storage::disk('library')->delete($document->path);
        $document->delete();

        return response()->json(status: 204);
    }

    /**
     * Un document restreint à un niveau n'est pas seulement masqué de la
     * liste élève/parent (voir BookLoanController::studentLibrarySummary) :
     * l'id étant devinable, la restriction doit aussi être vérifiée ici,
     * sinon un élève d'un autre niveau pourrait télécharger directement par
     * id malgré la restriction.
     */
    public function download(Request $request, School $school, BookDocument $document)
    {
        abort_if($document->school_id !== $school->id, 404);
        $this->abortUnlessAllowedToDownload($request, $school, $document);

        $document->increment('download_count');

        return Storage::disk('library')->response($document->path);
    }

    private function abortUnlessAllowedToDownload(Request $request, School $school, BookDocument $document): void
    {
        if (! $document->level_id) {
            return;
        }

        $user = $request->user();

        $isStaff = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $user->id)
            ->whereHas('role', fn ($query) => $query->whereIn('slug', ['directeur', 'bibliothecaire']))
            ->exists();
        if ($isStaff) {
            return;
        }

        $studentIds = collect([$user->studentProfile?->id])
            ->merge(ParentStudent::query()->where('parent_user_id', $user->id)->pluck('student_id'))
            ->filter();

        $hasAccess = ClassStudent::query()
            ->whereIn('student_id', $studentIds)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->whereHas('schoolClass', fn ($query) => $query
                ->where('school_id', $school->id)
                ->where('level_id', $document->level_id))
            ->exists();

        abort_unless($hasAccess, 403, "Ce document n'est pas accessible à ce niveau.");
    }
}
