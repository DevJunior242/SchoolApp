<?php

namespace App\Services\Ai;

use App\Models\Attendance;
use App\Models\ClassStudent;
use App\Models\Event;
use App\Models\Grade;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Assistant IA d'un professeur, limité à ses affectations dans l'école active.
 * Les données sont obtenues uniquement par des requêtes Eloquent prédéfinies.
 */
class TeacherAssistantService
{
    private const SYSTEM_PROMPT = <<<'TXT'
Tu es l'assistant pédagogique personnel d'un professeur.
Réponds en français, clairement et brièvement. Tu ne dois jamais inventer
une donnée et tu ne peux utiliser que les informations renvoyées par les
outils.

Tu n'as accès qu'aux classes et matières attribuées à ce professeur dans
l'école active. Tu ne dois jamais prétendre connaître les autres classes,
les finances de l'école, la paie, les données médicales ou les informations
personnelles sans rapport avec son enseignement.

Les noms envoyés par les outils peuvent être remplacés par des codes Élève A,
Élève B. Utilise ces codes dans ton raisonnement ; le nom réel sera rétabli
dans la réponse finale si nécessaire.
TXT;

    public function __construct(private OpenAiClient $client) {}

    public function ask(User $teacher, School $school, string $question): string
    {
        $assignments = $this->assignments($teacher, $school);

        if ($assignments->isEmpty()) {
            return "Aucune affectation pédagogique active n'est associée à votre compte dans cette école.";
        }

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
        $arguments = json_decode($toolCall['function']['arguments'] ?? '{}', true) ?: [];
        [$result, $tokenMap] = $this->runTool(
            $teacher,
            $school,
            $assignments,
            $toolCall['function']['name'],
            $arguments,
        );

        $messages[] = $first;
        $messages[] = [
            'role' => 'tool',
            'tool_call_id' => $toolCall['id'],
            'content' => json_encode($result, JSON_UNESCAPED_UNICODE),
        ];

        $second = $this->client->chat($messages);
        $answer = $second['content'] ?? "Je n'ai pas pu formuler de réponse.";

        foreach ($tokenMap as $token => $realName) {
            $answer = str_replace($token, $realName, $answer);
        }

        return $answer;
    }

    private function assignments(User $teacher, School $school): Collection
    {
        return $teacher->teachingAssignments()
            ->whereHas('schoolClass', fn($query) => $query
                ->where('school_id', $school->id)
                ->whereHas('schoolYear', fn($year) => $year->where('is_current', true)))
            ->with(['subject', 'schoolClass'])
            ->get();
    }

    private function runTool(
        User $teacher,
        School $school,
        Collection $assignments,
        string $name,
        array $arguments,
    ): array {
        return match ($name) {
            'mes_classes' => [$this->classesResult($assignments), []],
            'mes_eleves' => $this->studentsResult($assignments),
            'mes_moyennes' => [$this->averagesResult($assignments), []],
            'mes_absences' => [$this->absencesResult($assignments), []],
            'evenements_de_mes_classes' => [$this->eventsResult($teacher, $school, $assignments), []],
            default => [['error' => 'Outil inconnu.'], []],
        };
    }

    private function classesResult(Collection $assignments): array
    {
        return [
            'classes' => $assignments
                ->map(fn($assignment) => [
                    'classe' => $assignment->schoolClass?->name,
                    'matiere' => $assignment->subject?->name,
                ])
                ->unique(fn($row) => ($row['classe'] ?? '') . '|' . ($row['matiere'] ?? ''))
                ->values()
                ->all(),
        ];
    }

    private function studentsResult(Collection $assignments): array
    {
        $classIds = $assignments->pluck('class_id')->unique()->values();
        $students = ClassStudent::query()
            ->whereIn('class_id', $classIds)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->with(['student', 'schoolClass'])
            ->get();

        $tokenMap = [];
        $rows = $students->map(function (ClassStudent $enrollment, int $index) use (&$tokenMap) {
            $token = 'Élève ' . chr(65 + ($index % 26));
            $tokenMap[$token] = $enrollment->student?->fullname;

            return [
                'eleve' => $token,
                'classe' => $enrollment->schoolClass?->name,
            ];
        })->values()->all();

        return [['eleves' => $rows], $tokenMap];
    }

    private function averagesResult(Collection $assignments): array
    {
        $grades = Grade::query()
            ->whereIn('class_subject_teacher_id', $assignments->pluck('id'))
            ->with('classSubjectTeacher.schoolClass', 'classSubjectTeacher.subject')
            ->get();

        return [
            'moyennes' => $grades
                ->groupBy('class_subject_teacher_id')
                ->map(function (Collection $group) {
                    $assignment = $group->first()->classSubjectTeacher;
                    $weight = $group->sum('coefficient');

                    return [
                        'classe' => $assignment?->schoolClass?->name,
                        'matiere' => $assignment?->subject?->name,
                        'moyenne' => $weight > 0
                            ? round($group->sum(fn(Grade $grade) => ($grade->score / $grade->max_score) * 20 * $grade->coefficient) / $weight, 2)
                            : null,
                    ];
                })
                ->values()
                ->all(),
        ];
    }

    private function absencesResult(Collection $assignments): array
    {
        $assignmentIds = $assignments->pluck('id');
        $absences = Attendance::query()
            ->whereIn('class_subject_teacher_id', $assignmentIds)
            ->where('status', Attendance::STATUS_ABSENT)
            ->with('classSubjectTeacher.schoolClass')
            ->latest('date')
            ->limit(100)
            ->get();

        return [
            'absences' => $absences->groupBy('class_subject_teacher.schoolClass.name')
                ->map(fn(Collection $group, string $className) => [
                    'classe' => $className,
                    'nombre' => $group->count(),
                    'dernieres_dates' => $group->pluck('date')->map(fn($date) => $date->format('d/m/Y'))->values()->all(),
                ])
                ->values()
                ->all(),
        ];
    }

    private function eventsResult(User $teacher, School $school, Collection $assignments): array
    {
        $classIds = $assignments->pluck('class_id')->unique()->values();

        return [
            'evenements' => Event::query()
                ->where('school_id', $school->id)
                ->where(function ($query) use ($classIds) {
                    $query->whereNull('class_id')->orWhereIn('class_id', $classIds);
                })
                ->where('start_at', '>=', now())
                ->with('schoolClass')
                ->orderBy('start_at')
                ->limit(10)
                ->get()
                ->map(fn(Event $event) => [
                    'titre' => $event->title,
                    'classe' => $event->schoolClass?->name ?? 'Toute l’école',
                    'debut' => $event->start_at?->format('d/m/Y H:i'),
                ])
                ->all(),
        ];
    }

    private function toolDefinitions(): array
    {
        return [
            $this->tool('mes_classes', 'Liste les classes et matières attribuées à ce professeur.', []),
            $this->tool('mes_eleves', 'Liste les élèves des classes attribuées à ce professeur.', []),
            $this->tool('mes_moyennes', 'Calcule les moyennes des notes dans les matières et classes de ce professeur.', []),
            $this->tool('mes_absences', 'Donne les absences dans les classes et matières attribuées à ce professeur.', []),
            $this->tool('evenements_de_mes_classes', 'Donne les prochains événements globaux ou liés aux classes de ce professeur.', []),
        ];
    }

    private function tool(string $name, string $description, array $properties): array
    {
        return [
            'type' => 'function',
            'function' => [
                'name' => $name,
                'description' => $description,
                'parameters' => [
                    'type' => 'object',
                    'properties' => (object) $properties,
                    'required' => [],
                ],
            ],
        ];
    }
}
