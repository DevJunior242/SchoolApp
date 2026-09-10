<?php

namespace App\Http\Controllers\Api;

use App\Models\Level;
use App\Models\School;
use App\Http\Controllers\Controller;

class LevelController extends Controller
{
    public function index()
    {
        return response()->json(
            Level::query()
                ->orderBy('order')
                ->get()
        );
    }

    /** Les niveaux des seules sections actives de l'école, pour la pré-inscription publique. */
 public function forSchool(School $school)
{
    return response()->json(
        Level::query()
            ->whereHas('section', function ($query) use ($school) {
                $query->whereHas('schools', function ($query) use ($school) {
                    $query
                        ->where('schools.id', $school->id)
                        ->where('school_sections.active', true);
                });
            })
            ->with('section')
            ->orderBy('order')
            ->get()
    );
}
}
