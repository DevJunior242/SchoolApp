<?php

namespace App\Services\Auth;

use App\Models\LoginDevice;
use App\Models\User;
use App\Notifications\NewLoginNotification;
use App\Notifications\SessionUsedElsewhereNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Sessions de connexion (jetons Sanctum).
 * - Chaque jeton garde l'appareil et l'IP de connexion : liste « Appareils connectés ».
 * - Un jeton inutilisé pendant IDLE_DAYS jours ne marche plus (AppServiceProvider)
 *   et est supprimé chaque nuit : un jeton volé ne sert pas éternellement.
 * - Connexion depuis un appareil jamais vu sur ce compte : e-mail d'alerte.
 * - Session utilisée depuis un autre type d'appareil que celui de la connexion
 *   (jeton copié dans curl, dans un autre navigateur…) : signalée et e-mail d'alerte.
 */
class SessionService
{
    public const IDLE_DAYS = 30;

    /** En-tête envoyé par le front : identifiant aléatoire de ce navigateur. */
    public const CLIENT_HEADER = 'X-Client-Id';

    /** Crée le jeton de connexion et signale un appareil inconnu. */
    public function issue(User $user, Request $request, bool $alertNewDevice = true): string
    {
        $userAgent = Str::limit((string) $request->userAgent(), 500, '');
        $hash = $this->deviceHash($request);

        $token = $user->createToken('web');
        $token->accessToken->forceFill([
            'ip_address' => $request->ip(),
            'user_agent' => $userAgent ?: null,
            'device_hash' => $hash,
            'last_ip' => $request->ip(),
            'last_user_agent' => $userAgent ?: null,
        ])->save();

        $this->rememberDevice($user, $request, $hash, $alertNewDevice);

        return $token->plainTextToken;
    }

    /**
     * À chaque requête authentifiée (événement TokenAuthenticated de Sanctum) :
     * note la dernière IP et le dernier appareil, seulement s'ils changent.
     * Un autre type d'appareil que celui de la connexion = jeton probablement copié.
     */
    public function touch(PersonalAccessToken $token, Request $request): void
    {
        $userAgent = Str::limit((string) $request->userAgent(), 500, '') ?: null;
        if ($token->last_ip === $request->ip() && $token->last_user_agent === $userAgent) {
            return;
        }

        $changes = ['last_ip' => $request->ip(), 'last_user_agent' => $userAgent];
        $elsewhere = $token->user_agent !== null && self::describe($userAgent) !== self::describe($token->user_agent);

        if ($elsewhere && $token->flagged_at === null) {
            $changes['flagged_at'] = now();
            $user = $token->tokenable;
            if ($user instanceof User) {
                rescue(fn () => $user->notify(new SessionUsedElsewhereNotification(
                    self::describe($token->user_agent),
                    self::describe($userAgent),
                    (string) $request->ip(),
                )), report: true);
            }
        }

        // Sans toucher updated_at ni déclencher d'événements : simple suivi.
        PersonalAccessToken::query()->whereKey($token->getKey())->update($changes);
        $token->forceFill($changes)->syncOriginal();
    }

    /** Un jeton est encore valable s'il a servi dans les IDLE_DAYS derniers jours. */
    public static function isFresh(PersonalAccessToken $token): bool
    {
        $lastActivity = $token->last_used_at ?? $token->created_at;

        return $lastActivity === null || $lastActivity->gt(now()->subDays(self::IDLE_DAYS));
    }

    /** Supprime les jetons expirés (commande quotidienne). */
    public function pruneIdle(): int
    {
        $limit = now()->subDays(self::IDLE_DAYS);

        return PersonalAccessToken::query()
            ->where(fn ($query) => $query
                ->where('last_used_at', '<', $limit)
                ->orWhere(fn ($query) => $query->whereNull('last_used_at')->where('created_at', '<', $limit)))
            ->delete();
    }

    /** Sessions ouvertes du compte, la plus récente d'abord. */
    public function list(User $user, ?string $currentTokenId): array
    {
        return $user->tokens()
            ->orderByDesc('last_used_at')
            ->orderByDesc('created_at')
            ->get()
            ->filter(fn (PersonalAccessToken $token) => self::isFresh($token))
            ->map(fn (PersonalAccessToken $token) => [
                'id' => (string) $token->id,
                'device' => self::describe($token->user_agent),
                'ip_address' => $token->ip_address,
                'last_device' => self::describe($token->last_user_agent ?? $token->user_agent),
                'last_ip' => $token->last_ip ?? $token->ip_address,
                // Utilisée depuis un autre type d'appareil que celui de la connexion.
                'suspicious' => $token->flagged_at !== null,
                'created_at' => $token->created_at?->toIso8601String(),
                'last_used_at' => ($token->last_used_at ?? $token->created_at)?->toIso8601String(),
                'is_current' => (string) $token->id === (string) $currentTokenId,
            ])
            ->values()
            ->all();
    }

    /** « Chrome sur Android », « Safari sur iPhone »… (sans librairie : les cas courants suffisent). */
    public static function describe(?string $userAgent): string
    {
        $ua = (string) $userAgent;
        if ($ua === '') {
            return 'Appareil inconnu';
        }

        $system = match (true) {
            str_contains($ua, 'iPhone') => 'iPhone',
            str_contains($ua, 'iPad') => 'iPad',
            str_contains($ua, 'Android') => 'Android',
            str_contains($ua, 'Windows') => 'Windows',
            str_contains($ua, 'Mac OS X') || str_contains($ua, 'Macintosh') => 'Mac',
            str_contains($ua, 'CrOS') => 'Chromebook',
            str_contains($ua, 'Linux') => 'Linux',
            default => null,
        };

        $browser = match (true) {
            str_contains($ua, 'Edg/') => 'Edge',
            str_contains($ua, 'OPR/') || str_contains($ua, 'Opera') => 'Opera',
            str_contains($ua, 'SamsungBrowser') => 'Samsung Internet',
            str_contains($ua, 'Firefox') || str_contains($ua, 'FxiOS') => 'Firefox',
            str_contains($ua, 'CriOS') || str_contains($ua, 'Chrome') => 'Chrome',
            str_contains($ua, 'Safari') => 'Safari',
            str_contains($ua, 'curl') => 'curl',
            str_contains($ua, 'okhttp') || str_contains($ua, 'python') || str_contains($ua, 'Postman') => 'Programme',
            default => 'Navigateur',
        };

        return $system ? "{$browser} sur {$system}" : $browser;
    }

    /**
     * Empreinte de l'appareil : identifiant aléatoire gardé par le navigateur
     * (en-tête X-Client-Id), sinon le navigateur et le système. Jamais l'IP seule :
     * elle change à chaque connexion en données mobiles.
     */
    private function deviceHash(Request $request): string
    {
        $clientId = trim((string) $request->header(self::CLIENT_HEADER));
        $source = preg_match('/^[A-Za-z0-9-]{8,64}$/', $clientId)
            ? 'client:'.$clientId
            : 'ua:'.self::describe($request->userAgent());

        return hash('sha256', $source);
    }

    private function rememberDevice(User $user, Request $request, string $hash, bool $alertNewDevice): void
    {
        $now = Carbon::now();
        $label = self::describe($request->userAgent());
        $device = LoginDevice::query()->where('user_id', $user->id)->where('device_hash', $hash)->first();

        if ($device) {
            $device->forceFill(['last_seen_at' => $now, 'last_ip' => $request->ip(), 'label' => $label])->save();

            return;
        }

        // Premier appareil du compte (inscription, première connexion) : rien à signaler.
        $isFirst = ! LoginDevice::query()->where('user_id', $user->id)->exists();

        LoginDevice::query()->create([
            'user_id' => $user->id,
            'device_hash' => $hash,
            'label' => $label,
            'last_ip' => $request->ip(),
            'first_seen_at' => $now,
            'last_seen_at' => $now,
        ]);

        if ($alertNewDevice && ! $isFirst) {
            rescue(fn () => $user->notify(new NewLoginNotification($label, (string) $request->ip(), $now)), report: true);
        }
    }
}
