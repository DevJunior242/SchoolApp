<?php

namespace App\Services\Ai;

use App\Models\Attendance;
use App\Models\Event;
use App\Models\School;
use Illuminate\Support\Collection;

/** Assistant de vie scolaire pour le censeur et le surveillant. */
class AttendanceAssistantService
{
    private const SYSTEM_PROMPT = <<<'TXT'
Tu es l'assistant de vie scolaire d'une école. Réponds en français,
clairement et sans inventer. Tu utilises uniquement les données renvoyées
par tes outils Eloquent prédéfinis.

Tu n'as accès qu'aux absences, retards, justifications et événements de cette
école. Tu ne dois jamais répondre sur les paiements, la paie, la trésorerie,
les données médicales ou les informations d'une autre école.
TXT;

    public function __construct(private OpenAiClient $client) {}

    public function ask(School $school, string $question): string
    {
        $messages = [
            ['role' => 'system', 'content' => self::SYSTEM_PROMPT],
            ['role' => 'user', 'content' => $question],
        ];
        $first = $this->client->chat($messages, $this->toolDefinitions(), 'auto');
        $toolCalls = $first['tool_calls'] ?? [];
        if ($toolCalls === []) {
            return $first['content'] ?? "Je n'ai pas pu traiter cette question.";
        }

        $toolCall = $toolCalls[0];
        [$result, $tokenMap] = $this->runTool($school, $toolCall['function']['name']);
        $messages[] = $first;
        $messages[] = [
            'role' => 'tool',
            'tool_call_id' => $toolCall['id'],
            'content' => json_encode($result, JSON_UNESCAPED_UNICODE),
        ];
        $second = $this->client->chat($messages);
        $answer = $second['content'] ?? "Je n'ai pas pu formuler de réponse.";
        foreach ($tokenMap as $token => $name) {
            $answer = str_replace($token, $name, $answer);
        }
        return $answer;
    }

    private function runTool(School $school, string $name): array
    {
        return match ($name) {
            'absences_du_jour' => [$this->todayResult($school), []],
            'justifications_en_attente' => $this->pendingResult($school),
            'evenements_a_venir' => [$this->eventsResult($school), []],
            default => [['error' => 'Outil inconnu.'], []],
        };
    }

    private function schoolAttendance(School $school)
    {
        return Attendance::query()->whereHas(
            'classSubjectTeacher.schoolClass',
            fn($query) => $query->where('school_id', $school->id),
        );
    }

    private function todayResult(School $school): array
    {
        $rows = $this->schoolAttendance($school)
            ->whereDate('date', now()->toDateString())
            ->with(['student', 'classSubjectTeacher.schoolClass'])
            ->get();

        return ['absences_aujourd_hui' => $rows->where('status', Attendance::STATUS_ABSENT)->groupBy(
            fn(Attendance $row) => $row->classSubjectTeacher?->schoolClass?->name ?? 'Classe inconnue',
        )->map(fn(Collection $group, string $class) => [
            'classe' => $class,
            'nombre' => $group->count(),
            'eleves' => $group->pluck('student.fullname')->values()->all(),
        ])->values()->all()];
    }

    private function pendingResult(School $school): array
    {
        $rows = $this->schoolAttendance($school)
            ->where('justification_status', Attendance::JUSTIFICATION_EN_ATTENTE)
            ->with(['student', 'classSubjectTeacher.schoolClass'])
            ->latest('date')
            ->limit(100)
            ->get();

        $tokenMap = [];
        $items = $rows->map(function (Attendance $row, int $index) use (&$tokenMap) {
            $token = 'Élève ' . chr(65 + ($index % 26));
            $tokenMap[$token] = $row->student?->fullname;
            return [
                'eleve' => $token,
                'classe' => $row->classSubjectTeacher?->schoolClass?->name,
                'date' => $row->date?->format('d/m/Y'),
                'motif' => $row->justification_reason,
            ];
        })->values()->all();

        return [['justifications_en_attente' => $items], $tokenMap];
    }

    private function eventsResult(School $school): array
    {
        return ['evenements' => Event::query()
            ->where('school_id', $school->id)
            ->where('start_at', '>=', now())
            ->orderBy('start_at')
            ->limit(10)
            ->get(['title', 'start_at', 'location'])
            ->map(fn(Event $event) => [
                'titre' => $event->title,
                'debut' => $event->start_at?->format('d/m/Y H:i'),
                'lieu' => $event->location,
            ])->all()];
    }

    private function toolDefinitions(): array
    {
        return [
            $this->tool('absences_du_jour', 'Donne les absences du jour par classe.', []),
            $this->tool('justifications_en_attente', 'Liste les absences dont la justification est en attente.', []),
            $this->tool('evenements_a_venir', 'Donne les prochains événements de l’école.', []),
        ];
    }

    private function tool(string $name, string $description, array $properties): array
    {
        return ['type' => 'function', 'function' => [
            'name' => $name,
            'description' => $description,
            'parameters' => ['type' => 'object', 'properties' => (object) $properties, 'required' => []],
        ]];
    }
}
