<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\ResolvesEventAudience;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventRecap;
use App\Models\EventRecapPhoto;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\User;
use App\Notifications\EventRecapPublishedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class EventRecapController extends Controller
{
    use AuthorizesSchoolDirecteur;
    use ResolvesEventAudience;

    /**
     * Visible par tous les membres de l'école une fois publié ; le staff
     * peut voir/continuer un brouillon non encore publié.
     */
    public function show(Request $request, School $school, Event $event)
    {
        abort_if($event->school_id !== $school->id, 404);

        $recap = EventRecap::query()->where('event_id', $event->id)->with('photos')->first();

        if (! $recap) {
            return response()->json(status: 204);
        }

        if (! $recap->published_at && ! $this->canManageRecap($request, $school)) {
            return response()->json(status: 204);
        }

        return response()->json($recap->load('event'));
    }

    /**
     * Crée ou complète le brouillon (résumé, lien vidéo, ajout de photos).
     * `publish=true` le rend visible à tous et déclenche la notification,
     * une seule fois par événement (pas à chaque photo ajoutée).
     */
    public function store(Request $request, School $school, Event $event)
    {
        $this->authorizeEventManager($request, $school);
        abort_if($event->school_id !== $school->id, 404);

        $validated = $request->validate([
            'summary' => ['nullable', 'string', 'max:5000'],
            'video_url' => ['nullable', 'url', 'max:255'],
            'photos' => ['nullable', 'array', 'max:10'],
            'photos.*' => ['image', 'max:4096'],
            'publish' => ['nullable', 'boolean'],
        ]);

        $recap = EventRecap::query()->firstOrNew(['event_id' => $event->id]);
        $wasPublished = (bool) $recap->published_at;

        $recap->fill([
            'summary' => $validated['summary'] ?? $recap->summary,
            'video_url' => $validated['video_url'] ?? $recap->video_url,
        ]);

        if (! $recap->exists) {
            $recap->created_by = $request->user()->id;
        }

        if (($validated['publish'] ?? false) && ! $wasPublished) {
            $recap->published_at = now();
        }

        $recap->save();

        foreach ($request->file('photos', []) as $photo) {
            $recap->photos()->create(['path' => $photo->store("events/recaps/{$event->id}", 'public')]);
        }

        if (! $wasPublished && $recap->published_at) {
            $this->notifyAudience($event, $school, $recap, $request->user()->id);
        }

        return response()->json($recap->load('photos', 'event'), $recap->wasRecentlyCreated ? 201 : 200);
    }

    public function destroyPhoto(Request $request, School $school, Event $event, EventRecapPhoto $photo)
    {
        $this->authorizeEventManager($request, $school);
        abort_if($event->school_id !== $school->id, 404);
        abort_if($photo->eventRecap->event_id !== $event->id, 404);

        Storage::disk('public')->delete($photo->path);
        $photo->delete();

        return response()->json(status: 204);
    }

    private function canManageRecap(Request $request, School $school): bool
    {
        return SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->whereHas('role', fn ($query) => $query->whereIn('slug', ['directeur', 'censeur', 'secretaire']))
            ->exists();
    }

    private function notifyAudience(Event $event, School $school, EventRecap $recap, string $publisherId): void
    {
        $userIds = $this->eventAudienceUserIds($event, $school);
        $recipients = User::query()->whereIn('id', $userIds)->where('id', '!=', $publisherId)->get();

        foreach ($recipients as $recipient) {
            $recipient->notify(new EventRecapPublishedNotification($recap));
        }
    }
}
