<?php

namespace App\Http\Controllers\Api;

use App\Models\School;
use App\Models\Section;
use App\Http\Controllers\Controller;

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
public function show(School $school)
{
    return response()->json(
        $school->sections()
            ->with(['levels' => fn ($query) => $query->orderBy('order')])
            ->get()
    );
}
}
