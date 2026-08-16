<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\User;
use App\Notifications\NewMessageNotification;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    use AuthorizesSchoolDirecteur;

    /**
     * Nombre de messages non lus, pour le badge de l'icône de messagerie.
     * Volontairement sans effet de bord (contrairement à index()/thread()) :
     * appelé en polling régulier, seule l'ouverture d'un fil marque la lecture.
     */
    public function unreadCount(Request $request, School $school)
    {
        $userId = $request->user()->id;

        $count = $this->isMessageStaff($request, $school)
            ? Message::query()
                ->where('school_id', $school->id)
                ->whereColumn('sender_id', 'user_id')
                ->whereNull('read_at')
                ->count()
            : Message::query()
                ->where('school_id', $school->id)
                ->where('user_id', $userId)
                ->where('sender_id', '!=', $userId)
                ->whereNull('read_at')
                ->count();

        return response()->json(['count' => $count]);
    }

    /**
     * Le fil de discussion de l'utilisateur connecté avec l'école (staff ou
     * non, chacun peut avoir son propre fil).
     */
    public function index(Request $request, School $school)
    {
        $userId = $request->user()->id;

        $messages = Message::query()
            ->where('school_id', $school->id)
            ->where('user_id', $userId)
            ->with('sender')
            ->orderBy('created_at')
            ->get();

        Message::query()
            ->where('school_id', $school->id)
            ->where('user_id', $userId)
            ->where('sender_id', '!=', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json($messages);
    }

    public function store(Request $request, School $school)
    {
        $validated = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        $message = Message::query()->create([
            'school_id' => $school->id,
            'user_id' => $request->user()->id,
            'sender_id' => $request->user()->id,
            'body' => $validated['body'],
        ]);

        $this->notifyStaff($school, $message);

        return response()->json($message->load('sender'), 201);
    }

    /**
     * Boîte de réception du staff : un fil par utilisateur ayant écrit à
     * l'école, trié par dernier message.
     */
    public function inbox(Request $request, School $school)
    {
        $this->authorizeMessageStaff($request, $school);

        $threadUserIds = Message::query()
            ->where('school_id', $school->id)
            ->distinct()
            ->pluck('user_id');

        $threads = User::query()
            ->whereIn('id', $threadUserIds)
            ->get()
            ->map(function (User $threadUser) use ($school) {
                $latest = Message::query()
                    ->where('school_id', $school->id)
                    ->where('user_id', $threadUser->id)
                    ->latest('created_at')
                    ->first();

                $unread = Message::query()
                    ->where('school_id', $school->id)
                    ->where('user_id', $threadUser->id)
                    ->where('sender_id', $threadUser->id)
                    ->whereNull('read_at')
                    ->count();

                return [
                    'user' => ['id' => $threadUser->id, 'fullname' => $threadUser->fullname],
                    'last_message' => $latest?->body,
                    'last_message_at' => $latest?->created_at,
                    'unread_count' => $unread,
                ];
            })
            ->sortByDesc('last_message_at')
            ->values();

        return response()->json($threads);
    }

    /**
     * Fil de discussion d'un utilisateur précis, vu par le staff.
     */
    public function thread(Request $request, School $school, User $user)
    {
        $this->authorizeMessageStaff($request, $school);
        $this->abortUnlessSchoolMember($school, $user);

        $messages = Message::query()
            ->where('school_id', $school->id)
            ->where('user_id', $user->id)
            ->with('sender')
            ->orderBy('created_at')
            ->get();

        Message::query()
            ->where('school_id', $school->id)
            ->where('user_id', $user->id)
            ->where('sender_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'user' => ['id' => $user->id, 'fullname' => $user->fullname],
            'messages' => $messages,
        ]);
    }

    public function reply(Request $request, School $school, User $user)
    {
        $this->authorizeMessageStaff($request, $school);
        $this->abortUnlessSchoolMember($school, $user);

        $validated = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        $message = Message::query()->create([
            'school_id' => $school->id,
            'user_id' => $user->id,
            'sender_id' => $request->user()->id,
            'body' => $validated['body'],
        ]);

        $user->notify(new NewMessageNotification($message));

        return response()->json($message->load('sender'), 201);
    }

    /**
     * Retire un message qu'on a soi-même envoyé (soft delete : il reste en
     * base pour garder une trace en cas de litige, juste masqué du fil —
     * voir SoftDeletes sur le modèle Message, qui l'exclut automatiquement
     * des requêtes ci-dessus). Utilisable aussi bien par le staff que par
     * un utilisateur classique, chacun sur ses propres messages seulement.
     */
    public function destroy(Request $request, School $school, Message $message)
    {
        abort_if($message->school_id !== $school->id, 404);
        abort_unless($message->sender_id === $request->user()->id, 403, "Vous ne pouvez retirer que vos propres messages.");

        $message->delete();

        return response()->json(['message' => 'Message retiré.']);
    }

    private function isMessageStaff(Request $request, School $school): bool
    {
        return SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->whereHas('role', fn ($query) => $query->whereIn('slug', ['directeur', 'secretaire']))
            ->exists();
    }

    private function abortUnlessSchoolMember(School $school, User $user): void
    {
        abort_unless(
            SchoolUser::query()->where('school_id', $school->id)->where('user_id', $user->id)->exists(),
            404
        );
    }

    private function notifyStaff(School $school, Message $message): void
    {
        $staffIds = SchoolUser::query()
            ->where('school_id', $school->id)
            ->whereHas('role', fn ($query) => $query->whereIn('slug', ['directeur', 'secretaire']))
            ->pluck('user_id');

        $recipients = User::query()->whereIn('id', $staffIds)->where('id', '!=', $message->user_id)->get();

        foreach ($recipients as $recipient) {
            $recipient->notify(new NewMessageNotification($message));
        }
    }
}
