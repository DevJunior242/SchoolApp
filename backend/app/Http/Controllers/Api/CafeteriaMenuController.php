<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\CafeteriaMenu;
use App\Models\School;
use App\Models\SchoolUser;
use Illuminate\Http\Request;

class CafeteriaMenuController extends Controller
{
    use AuthorizesSchoolDirecteur;

    private const STAFF_ROLE_SLUGS = ['directeur', 'comptable', 'secretaire'];

    /**
     * Visible par tous les membres de l'école (les parents doivent pouvoir
     * voir ce qu'il y a au menu), pas seulement le personnel de cantine.
     */
    public function show(Request $request, School $school)
    {
        $belongs = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->exists();

        abort_unless($belongs, 403, "Vous n'appartenez pas à cette école.");

        $date = $request->query('date', now()->toDateString());

        $menu = CafeteriaMenu::query()
            ->where('school_id', $school->id)
            ->where('date', $date)
            ->with('items')
            ->first();

        if (! $menu) {
            return response()->json(status: 204);
        }

        return response()->json($menu);
    }

    /**
     * Crée ou remplace le menu d'un jour donné : liste courte, plus simple
     * de tout remplacer que de diffé les items un par un.
     */
    public function store(Request $request, School $school)
    {
        $this->authorizeRoles($request, $school, self::STAFF_ROLE_SLUGS, "Vous n'avez pas accès à la gestion de la cantine.");

        $validated = $request->validate([
            'date' => ['required', 'date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.label' => ['required', 'string', 'max:255'],
            'items.*.price' => ['required', 'numeric', 'min:0'],
        ]);

        $menu = CafeteriaMenu::query()->updateOrCreate(
            ['school_id' => $school->id, 'date' => $validated['date']],
            ['created_by' => $request->user()->id]
        );

        $menu->items()->delete();
        $menu->items()->createMany($validated['items']);

        return response()->json($menu->load('items'), 201);
    }
}
