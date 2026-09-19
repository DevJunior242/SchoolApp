<?php

namespace App\Services\Ai;

use App\Models\School;
use App\Models\SchoolStudent;
use App\Models\Student;
use Illuminate\Support\Collection;

/** Assistant santé limité aux élèves actifs de l'école. */
class HealthAssistantService
{
    private const SYSTEM_PROMPT = <<<'TXT'
Tu es l'assistant santé scolaire réservé à l'infirmier. Réponds en français,
avec prudence et sans inventer. Tu utilises uniquement les données renvoyées
par tes outils Eloquent prédéfinis.

Tu ne poses jamais de diagnostic et tu ne remplaces pas un professionnel de
santé. Tu peux résumer des informations administratives de santé déjà
présentes dans le dossier scolaire : allergies, vaccinations, visites et
situations nécessitant une attention. Tu n'as accès qu'aux élèves actifs de
l'école courante, jamais aux élèves d'une autre école, aux finances, aux RH,
aux notes ou aux paiements.
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

    private function students(School $school): Collection
    {
        return SchoolStudent::query()
            ->where('school_id', $school->id)
            ->where('status', SchoolStudent::STATUS_ACTIVE)
            ->with(['student.healthProfile', 'student.allergies', 'student.vaccinations', 'student.medicalVisits'])
            ->get()
            ->pluck('student')
            ->filter();
    }

    private function runTool(School $school, string $name): array
    {
        return match ($name) {
            'synthese_sante' => [$this->healthSummary($this->students($school)), []],
            'allergies_eleves' => $this->allergies($this->students($school)),
            'visites_medicales_recentes' => $this->recentVisits($this->students($school)),
            default => [['error' => 'Outil inconnu.'], []],
        };
    }

    private function healthSummary(Collection $students): array
    {
        return [
            'eleves_actifs' => $students->count(),
            'dossiers_sante' => $students->filter(fn(Student $student) => $student->healthProfile)->count(),
            'eleves_avec_allergie' => $students->filter(fn(Student $student) => $student->allergies->isNotEmpty())->count(),
            'eleves_avec_vaccination' => $students->filter(fn(Student $student) => $student->vaccinations->isNotEmpty())->count(),
            'visites_medicales' => $students->sum(fn(Student $student) => $student->medicalVisits->count()),
        ];
    }

    private function allergies(Collection $students): array
    {
        $tokenMap = [];
        $rows = $students->filter(fn(Student $student) => $student->allergies->isNotEmpty())
            ->values()
            ->map(function (Student $student, int $index) use (&$tokenMap) {
                $token = 'Élève ' . chr(65 + ($index % 26));
                $tokenMap[$token] = $student->fullname;
                return [
                    'eleve' => $token,
                    'allergies' => $student->allergies->map(fn($allergy) => [
                        'libelle' => $allergy->label,
                        'gravite' => $allergy->severity,
                    ])->values()->all(),
                ];
            })->all();

        return [['allergies' => $rows], $tokenMap];
    }

    private function recentVisits(Collection $students): array
    {
        return ['visites' => $students->flatMap(fn(Student $student) => $student->medicalVisits->map(fn($visit) => [
            'eleve' => $student->fullname,
            'date' => $visit->visited_at?->format('d/m/Y H:i'),
            'motif' => $visit->reason,
            'urgence' => (bool) $visit->is_emergency,
        ]))->sortByDesc('date')->take(50)->values()->all()];
    }

    private function toolDefinitions(): array
    {
        return [
            $this->tool('synthese_sante', 'Donne les chiffres de synthèse des dossiers santé des élèves actifs.', []),
            $this->tool('allergies_eleves', 'Liste les élèves actifs ayant des allergies enregistrées.', []),
            $this->tool('visites_medicales_recentes', 'Liste les visites médicales récentes enregistrées.', []),
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
