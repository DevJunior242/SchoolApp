<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\Bus;
use App\Models\School;
use App\Models\SchoolUser;
use Illuminate\Http\Request;

class BusController extends Controller
{
    use AuthorizesSchoolDirecteur;

    /**
     * Visible par tout membre de l'école (le parent doit pouvoir voir la
     * liste pour repérer le bus de son enfant), la gestion reste réservée
     * au directeur.
     */
    public function index(Request $request, School $school)
    {
        $belongs = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->exists();
        abort_unless($belongs, 403, "Vous n'appartenez pas à cette école.");

        return response()->json(
            Bus::query()->where('school_id', $school->id)->with(['driver', 'stops'])->get()
        );
    }

    public function store(Request $request, School $school)
    {
        $this->authorizeDirecteur($request, $school);

        $validated = $request->validate([
            'label' => ['required', 'string', 'max:255'],
            'plate_number' => ['nullable', 'string', 'max:50'],
            'driver_id' => ['nullable', 'uuid', 'exists:users,id'],
        ]);

        if (! empty($validated['driver_id'])) {
            $this->abortUnlessDriver($school, $validated['driver_id']);
        }

        $bus = Bus::query()->create([...$validated, 'school_id' => $school->id]);

        return response()->json($bus->load('driver', 'stops'), 201);
    }

    public function update(Request $request, School $school, Bus $bus)
    {
        $this->authorizeDirecteur($request, $school);
        abort_if($bus->school_id !== $school->id, 404);

        $validated = $request->validate([
            'label' => ['required', 'string', 'max:255'],
            'plate_number' => ['nullable', 'string', 'max:50'],
            'driver_id' => ['nullable', 'uuid', 'exists:users,id'],
        ]);

        if (! empty($validated['driver_id'])) {
            $this->abortUnlessDriver($school, $validated['driver_id']);
        }

        $bus->update($validated);

        return response()->json($bus->load('driver', 'stops'));
    }

    public function destroy(Request $request, School $school, Bus $bus)
    {
        $this->authorizeDirecteur($request, $school);
        abort_if($bus->school_id !== $school->id, 404);

        $bus->delete();

        return response()->json(status: 204);
    }

    private function abortUnlessDriver(School $school, string $userId): void
    {
        $isDriver = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $userId)
            ->whereHas('role', fn ($query) => $query->where('slug', 'chauffeur'))
            ->exists();

        abort_unless($isDriver, 422, "Cet utilisateur n'a pas le rôle chauffeur dans cette école.");
    }
}
