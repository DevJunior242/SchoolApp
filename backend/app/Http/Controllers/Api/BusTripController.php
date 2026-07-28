<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\Bus;
use App\Models\BusStop;
use App\Models\BusTrip;
use App\Models\BusTripStopEvent;
use App\Models\ParentStudent;
use App\Models\School;
use App\Models\SchoolStudent;
use App\Models\User;
use App\Notifications\BusApproachingNotification;
use Illuminate\Http\Request;

class BusTripController extends Controller
{
    use AuthorizesSchoolDirecteur;

    // Vitesse moyenne supposée pour l'estimation d'arrivée : pas d'itinéraire
    // routier calculé (pas d'API payante), juste distance à vol d'oiseau ÷
    // cette vitesse. Volontairement approximatif, annoncé comme tel côté UI.
    private const ASSUMED_SPEED_KMH = 25;

    private const REACHED_THRESHOLD_METERS = 150;

    private const NOTIFY_THRESHOLD_MINUTES = 5;

    public function start(Request $request, School $school, Bus $bus)
    {
        abort_if($bus->school_id !== $school->id, 404);
        $this->abortUnlessOwnBus($request, $bus);

        $validated = $request->validate([
            'direction' => ['required', 'in:'.BusTrip::DIRECTION_PICKUP.','.BusTrip::DIRECTION_DROPOFF],
        ]);

        $alreadyActive = BusTrip::query()
            ->where('bus_id', $bus->id)
            ->where('status', BusTrip::STATUS_IN_PROGRESS)
            ->exists();
        abort_if($alreadyActive, 422, 'Un trajet est déjà en cours pour ce bus.');

        $trip = BusTrip::query()->create([
            'bus_id' => $bus->id,
            'driver_id' => $request->user()->id,
            'direction' => $validated['direction'],
            'status' => BusTrip::STATUS_IN_PROGRESS,
            'started_at' => now(),
        ]);

        // Un événement par arrêt, créé d'avance : simplifie la recherche du
        // "prochain arrêt non atteint" à chaque ping.
        $stops = $bus->stops()->get();
        foreach ($stops as $stop) {
            BusTripStopEvent::query()->create(['bus_trip_id' => $trip->id, 'bus_stop_id' => $stop->id]);
        }

        return response()->json($trip, 201);
    }

    /**
     * Le navigateur du chauffeur envoie sa position ici toutes les
     * quelques secondes pendant que la page "Mon trajet" reste ouverte.
     */
    public function ping(Request $request, School $school, BusTrip $trip)
    {
        abort_if($trip->bus->school_id !== $school->id, 404);
        $this->abortUnlessOwnTrip($request, $trip);
        abort_unless($trip->status === BusTrip::STATUS_IN_PROGRESS, 422, 'Ce trajet est déjà terminé.');

        $validated = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $trip->update([
            'current_latitude' => $validated['latitude'],
            'current_longitude' => $validated['longitude'],
            'last_ping_at' => now(),
        ]);

        $this->evaluateNextStop($trip, (float) $validated['latitude'], (float) $validated['longitude']);

        return response()->json(['ok' => true]);
    }

    public function end(Request $request, School $school, BusTrip $trip)
    {
        abort_if($trip->bus->school_id !== $school->id, 404);
        $this->abortUnlessOwnTrip($request, $trip);

        $trip->update(['status' => BusTrip::STATUS_COMPLETED, 'ended_at' => now()]);

        return response()->json($trip);
    }

    /**
     * Vue générale d'un bus (staff/parent) : trajet actif s'il y en a un.
     */
    public function show(Request $request, School $school, Bus $bus)
    {
        abort_if($bus->school_id !== $school->id, 404);

        $trip = BusTrip::query()
            ->where('bus_id', $bus->id)
            ->where('status', BusTrip::STATUS_IN_PROGRESS)
            ->with('driver')
            ->latest('started_at')
            ->first();

        return response()->json(['bus' => $bus->load('stops'), 'trip' => $trip]);
    }

    /**
     * Vue parent : pour chacun de ses enfants, l'arrêt assigné et l'ETA du
     * bus vers CET arrêt précis (pas forcément le tout prochain arrêt du
     * trajet).
     */
    public function mine(Request $request, School $school)
    {
        $studentIds = ParentStudent::query()->where('parent_user_id', $request->user()->id)->pluck('student_id');

        $schoolStudents = SchoolStudent::query()
            ->where('school_id', $school->id)
            ->whereIn('student_id', $studentIds)
            ->with(['student', 'busStop.bus'])
            ->get();

        $result = $schoolStudents->map(function (SchoolStudent $ss) {
            if (! $ss->busStop) {
                return ['student' => $ss->student, 'status' => 'no_stop_assigned'];
            }

            $stop = $ss->busStop;
            $trip = BusTrip::query()
                ->where('bus_id', $stop->bus_id)
                ->where('status', BusTrip::STATUS_IN_PROGRESS)
                ->latest('started_at')
                ->first();

            if (! $trip) {
                return ['student' => $ss->student, 'bus' => $stop->bus, 'stop' => $stop, 'status' => 'no_active_trip'];
            }

            $event = BusTripStopEvent::query()
                ->where('bus_trip_id', $trip->id)
                ->where('bus_stop_id', $stop->id)
                ->first();

            if ($event?->reached_at) {
                return ['student' => $ss->student, 'bus' => $stop->bus, 'stop' => $stop, 'status' => 'passed'];
            }

            $eta = $this->etaToStop($trip, $stop);

            return [
                'student' => $ss->student,
                'bus' => $stop->bus,
                'stop' => $stop,
                'status' => 'en_route',
                'distance_km' => $eta['distance_km'] ?? null,
                'eta_minutes' => $eta['eta_minutes'] ?? null,
            ];
        });

        return response()->json($result->values());
    }

    private function evaluateNextStop(BusTrip $trip, float $lat, float $lng): void
    {
        $orderDirection = $trip->direction === BusTrip::DIRECTION_PICKUP ? 'asc' : 'desc';

        $nextEvent = BusTripStopEvent::query()
            ->where('bus_trip_id', $trip->id)
            ->whereNull('reached_at')
            ->whereHas('stop', fn ($query) => $query->whereNotNull('latitude')->whereNotNull('longitude'))
            ->with('stop')
            ->get()
            ->sortBy(fn ($event) => $event->stop->order, SORT_REGULAR, $orderDirection === 'desc')
            ->first();

        if (! $nextEvent) {
            return;
        }

        $stop = $nextEvent->stop;
        $distanceKm = $this->haversineKm($lat, $lng, (float) $stop->latitude, (float) $stop->longitude);

        if ($distanceKm * 1000 <= self::REACHED_THRESHOLD_METERS) {
            $nextEvent->update(['reached_at' => now()]);

            return;
        }

        $etaMinutes = (int) round($distanceKm / self::ASSUMED_SPEED_KMH * 60);

        if ($etaMinutes <= self::NOTIFY_THRESHOLD_MINUTES && ! $nextEvent->notified_at) {
            $nextEvent->update(['notified_at' => now()]);
            $this->notifyStopParents($stop, $etaMinutes);
        }
    }

    private function etaToStop(BusTrip $trip, BusStop $stop): array
    {
        if (! $trip->current_latitude || ! $stop->latitude || ! $stop->longitude) {
            return [];
        }

        $distanceKm = $this->haversineKm(
            (float) $trip->current_latitude,
            (float) $trip->current_longitude,
            (float) $stop->latitude,
            (float) $stop->longitude
        );

        return [
            'distance_km' => round($distanceKm, 2),
            'eta_minutes' => (int) round($distanceKm / self::ASSUMED_SPEED_KMH * 60),
        ];
    }

    private function haversineKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadiusKm = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadiusKm * $c;
    }

    private function notifyStopParents(BusStop $stop, int $etaMinutes): void
    {
        $studentIds = SchoolStudent::query()->where('bus_stop_id', $stop->id)->pluck('student_id');
        $parentIds = ParentStudent::query()->whereIn('student_id', $studentIds)->pluck('parent_user_id')->unique();
        $recipients = User::query()->whereIn('id', $parentIds)->get();

        foreach ($recipients as $recipient) {
            $recipient->notify(new BusApproachingNotification($stop, $etaMinutes));
        }
    }

    private function abortUnlessOwnBus(Request $request, Bus $bus): void
    {
        abort_unless($bus->driver_id === $request->user()->id, 403, "Vous n'êtes pas le chauffeur de ce bus.");
    }

    private function abortUnlessOwnTrip(Request $request, BusTrip $trip): void
    {
        abort_unless($trip->driver_id === $request->user()->id, 403, "Vous n'êtes pas le chauffeur de ce trajet.");
    }
}
