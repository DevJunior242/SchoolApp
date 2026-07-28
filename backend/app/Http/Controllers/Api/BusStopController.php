<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\Bus;
use App\Models\School;
use Illuminate\Http\Request;

class BusStopController extends Controller
{
    use AuthorizesSchoolDirecteur;

    /**
     * Remplace la liste des arrêts d'un bus. Les arrêts existants (avec
     * `id`) sont mis à jour en place plutôt que supprimés/recréés : des
     * élèves y sont rattachés (school_students.bus_stop_id) et perdraient
     * leur affectation sinon à chaque modification du libellé d'un arrêt.
     */
    public function store(Request $request, School $school, Bus $bus)
    {
        $this->authorizeDirecteur($request, $school);
        abort_if($bus->school_id !== $school->id, 404);

        $validated = $request->validate([
            'stops' => ['required', 'array', 'min:1'],
            'stops.*.id' => ['nullable', 'uuid', 'exists:bus_stops,id'],
            'stops.*.label' => ['required', 'string', 'max:255'],
            'stops.*.latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'stops.*.longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $keptIds = [];

        foreach ($validated['stops'] as $index => $stopData) {
            $attributes = [
                'label' => $stopData['label'],
                'latitude' => $stopData['latitude'] ?? null,
                'longitude' => $stopData['longitude'] ?? null,
                'order' => $index + 1,
            ];

            $stop = empty($stopData['id'])
                ? $bus->stops()->create($attributes)
                : tap($bus->stops()->findOrFail($stopData['id']))->update($attributes);

            $keptIds[] = $stop->id;
        }

        // Ne supprime que les arrêts retirés de la liste : ceux conservés
        // gardent leurs élèves affectés.
        $bus->stops()->whereNotIn('id', $keptIds)->delete();

        return response()->json($bus->load('stops'), 201);
    }
}
