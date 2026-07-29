<?php

namespace App\Services\Ai;

use App\Exceptions\AiNotConfiguredException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Fine wrapper autour de l'API "chat completions" (compatible OpenAI/Gemini
 * via base_url). Pas de dépendance SDK : un simple appel HTTP suffit et
 * évite d'ajouter un package de plus pour ça.
 */
class OpenAiClient
{
    /**
     * @param  array<int, array<string, mixed>>  $messages
     * @param  array<int, array<string, mixed>>  $tools
     * @return array<string, mixed> Le message brut renvoyé par le modèle.
     */
    public function chat(array $messages, array $tools = [], string|array|null $toolChoice = null): array
    {
        $key = config('services.openai.key');

        if (! $key) {
            throw new AiNotConfiguredException();
        }

        $payload = [
            'model' => config('services.openai.model'),
            'messages' => $messages,
            'temperature' => 0.3,
        ];

        if ($tools !== []) {
            $payload['tools'] = $tools;
            $payload['tool_choice'] = $toolChoice ?? 'auto';
        }

        $response = Http::withToken($key)
            ->timeout(30)
            ->post(rtrim(config('services.openai.base_url'), '/').'/chat/completions', $payload);

        if ($response->failed()) {
            throw new RuntimeException("L'appel à l'IA a échoué : ".$response->body());
        }

        return $response->json('choices.0.message');
    }
}
