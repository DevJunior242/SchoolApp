<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Section;

class SectionController extends Controller
{
    /**
     * Liste toutes les sections globales disponibles avec leurs niveaux.
     */
    public function index()
    {
        return response()->json(
            Section::query()
                ->with(['levels' => fn ($query) => $query->orderBy('order')])
                ->get()
        );
    }

    /**
     * Affiche une section spécifique et ses niveaux.
     */
    public function show(Section $section)
    {
        return response()->json(
            $section->load(['levels' => fn ($query) => $query->orderBy('order')])
        );
    }
}
