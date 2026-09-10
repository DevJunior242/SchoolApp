<?php

namespace App\Services\Ai;

use App\Models\User;
use App\Models\Event;
use App\Models\School;
use App\Models\Payment;
use App\Models\Student;
use App\Models\Attendance;
use App\Models\ClassStudent;
use App\Models\FeeStructure;
use App\Models\SchoolStudent;
use Illuminate\Support\Collection;
use App\Services\StudentRiskService;

/**
 * Assistant IA d'un parent : périmètre strictement limité aux enfants
 * rattachés au parent connecté au sein de l'établissement.
 */
class ParentAssistantService
{
    private const SYSTEM_PROMPT = <<<'TXT'
Tu es l'assistant d'un parent d'élève dans une école africaine. Tu ne dois
JAMAIS inventer de chiffres : réponds uniquement à partir des données
renvoyées par l'outil que tu as appelé. Réponds en français, en quelques
phrases, sur un ton chaleureux et rassurant.

Tu n'as accès QU'aux informations concernant les enfants de ce parent
précis, jamais à celles d'un autre élève ni à des données globales de
l'école (finances de l'école, effectifs d'autres classes, etc.).

Important : une liste ou un montant à zéro renvoyé par un outil signifie
qu'il n'y a AUCUNE absence/AUCUN impayé actuellement, pas que les données
sont indisponibles. Dans ce cas, annonce-le positivement.
Si l'outil renvoie une clé "error", explique ce message tel quel au parent
(ex: aucun enfant ne correspond à ce nom, précisez lequel).

Si la question ne concerne pas la scolarité de son/ses enfant(s) ou la vie
de l'école, n'appelle aucun outil et réponds directement, brièvement, en
rappelant que tu ne peux aider que sur ce sujet.
TXT;

    private const EVENT_TYPE_LABELS = [
        Event::TYPE_REUNION => 'réunion',
        Event::TYPE_EXAMEN => 'examen',
        Event::TYPE_SORTIE => 'sortie',
        Event::TYPE_FERIE => 'jour férié',
        Event::TYPE_BULLETIN => 'remise des bulletins',
        Event::TYPE_AUTRE => 'autre',
    ];

    public function __construct(
        private OpenAiClient $client,
        private StudentRiskService $riskService,
    ) {}

    public function ask(User $parent, School $school, string $question): string
    {
        $children = $this->children($parent, $school);

        if ($children->isEmpty()) {
            return "Je ne trouve aucun enfant rattaché à votre compte dans cette école.";
        }

        $messages = [
            ['role' => 'system', 'content' => self::SYSTEM_PROMPT],
            ['role' => 'user', 'content' => $question],
        ];

        $first = $this->client->chat($messages, $this->toolDefinitions($children), 'auto');
        $toolCalls = $first['tool_calls'] ?? [];

        if ($toolCalls === []) {
            return $first['content'] ?? "Je n'ai pas pu traiter cette question.";
        }

        $toolCall = $toolCalls[0];
        $arguments = json_decode($toolCall['function']['arguments'] ?? '{}', true) ?: [];

        [$result, $tokenMap] = $this->runTool($school, $children, $toolCall['function']['name'], $arguments);

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

    private function children(User $parent, School $school): Collection
    {
        return $parent->childStudents()
            ->whereHas('schoolStudents', fn ($query) => $query
                ->where('school_id', $school->id)
                ->where('status', SchoolStudent::STATUS_ACTIVE))
            ->with(['classStudents' => fn ($q) => $q->where('status', ClassStudent::STATUS_ACTIVE)->with('schoolClass.level.section')])
            ->get();
    }

    /**
     * @param  array<string, mixed>  $arguments
     * @return array{0: array<string, mixed>, 1: array<string, string>}
     */
    private function runTool(School $school, Collection $children, string $name, array $arguments): array
    {
        return match ($name) {
            'absences_enfant' => $this->toolAbsencesEnfant($children, $arguments['nom_enfant'] ?? ''),
            'moyenne_enfant' => $this->toolMoyenneEnfant($school, $children, $arguments['nom_enfant'] ?? ''),
            'paiements_enfant' => $this->toolPaiementsEnfant($school, $children, $arguments['nom_enfant'] ?? ''),
            'evenements_a_venir' => $this->toolEvenementsAVenir($school, $children, $arguments['nom_enfant'] ?? ''),
            default => [['error' => 'Outil inconnu.'], []],
        };
    }

    private function findChild(Collection $children, string $nomEnfant): ?Student
    {
        if (trim($nomEnfant) === '') {
            return $children->count() === 1 ? $children->first() : null;
        }

        $matches = $children->filter(
            fn (Student $child) => str_contains(mb_strtolower($child->fullname), mb_strtolower(trim($nomEnfant)))
        );

        return $matches->count() === 1 ? $matches->first() : null;
    }

    private function toolAbsencesEnfant(Collection $children, string $nomEnfant): array
    {
        $student = $this->findChild($children, $nomEnfant);

        if (! $student) {
            return [['error' => "Précisez de quel enfant il s'agit (plusieurs enfants sont rattachés à votre compte)."], []];
        }

        $activeClassStudent = $student->classStudents->firstWhere('status', ClassStudent::STATUS_ACTIVE);
        $token = 'ENFANT_CIBLE';

        $dates = Attendance::query()
            ->where('student_id', $student->id)
            ->where('status', Attendance::STATUS_ABSENT)
            ->latest('date')
            ->limit(20)
            ->pluck('date')
            ->map(fn ($date) => $date->format('d/m/Y'))
            ->values();

        return [[
            'enfant' => $token,
            'classe' => $activeClassStudent?->schoolClass?->name,
            'section' => $activeClassStudent?->schoolClass?->level?->section?->name,
            'nombre_absences' => $dates->count(),
            'dates_recentes' => $dates->all(),
        ], [$token => $student->fullname]];
    }

    private function toolMoyenneEnfant(School $school, Collection $children, string $nomEnfant): array
    {
        $student = $this->findChild($children, $nomEnfant);

        if (! $student) {
            return [['error' => "Précisez de quel enfant il s'agit (plusieurs enfants sont rattachés à votre compte)."], []];
        }

        $token = 'ENFANT_CIBLE';
        $score = $this->riskService->scoreFor($school, $student);

        return [[
            'enfant' => $token,
            'classe' => $score['class_name'] ?? null,
            'section' => $score['section_name'] ?? null,
            'moyenne_generale' => $score['average'],
            'absences' => $score['absences'],
            'retards' => $score['retards'],
        ], [$token => $student->fullname]];
    }

    private function toolPaiementsEnfant(School $school, Collection $children, string $nomEnfant): array
    {
        $student = $this->findChild($children, $nomEnfant);

        if (! $student) {
            return [['error' => "Précisez de quel enfant il s'agit (plusieurs enfants sont rattachés à votre compte)."], []];
        }

        $token = 'ENFANT_CIBLE';

        $classStudent = ClassStudent::query()
            ->where('student_id', $student->id)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->whereHas('schoolClass', fn ($query) => $query->where('school_id', $school->id))
            ->latest('created_at')
            ->with(['schoolClass.level.section'])
            ->first();

        $totalDue = $classStudent
            ? FeeStructure::query()
                ->where('school_id', $school->id)
                ->where(fn ($query) => $query
                    ->where('level_id', $classStudent->schoolClass->level_id)
                    ->orWhereNull('level_id'))
                ->where('category', '!=', FeeStructure::CATEGORY_CAFETERIA_SUBSCRIPTION)
                ->where('school_year_id', $classStudent->schoolClass->school_year_id)
                ->sum('amount')
            : 0;

        $totalConfirmed = Payment::query()
            ->where('school_id', $school->id)
            ->where('student_id', $student->id)
            ->where('status', Payment::STATUS_CONFIRMED)
            ->sum('amount');

        return [[
            'enfant' => $token,
            'classe' => $classStudent?->schoolClass?->name,
            'section' => $classStudent?->schoolClass?->level?->section?->name,
            'total_du' => round((float) $totalDue, 2),
            'total_paye' => round((float) $totalConfirmed, 2),
            'solde_restant' => round((float) $totalDue - (float) $totalConfirmed, 2),
        ], [$token => $student->fullname]];
    }

    private function toolEvenementsAVenir(School $school, Collection $children, string $nomEnfant = ''): array
    {
        $student = $this->findChild($children, $nomEnfant);
        $activeClassStudent = $student?->classStudents->firstWhere('status', ClassStudent::STATUS_ACTIVE);
        $sectionId = $activeClassStudent?->schoolClass?->level?->section_id;

        $events = Event::query()
            ->where('school_id', $school->id)
            ->where('start_at', '>=', now())
            ->when($sectionId, function ($query) use ($sectionId) {
                $query->where(function ($q) use ($sectionId) {
                    $q->whereNull('section_id')
                      ->orWhere('section_id', $sectionId);
                });
            })
            ->orderBy('start_at')
            ->limit(5)
            ->get()
            ->map(fn (Event $event) => [
                'titre' => $event->title,
                'type' => self::EVENT_TYPE_LABELS[$event->type] ?? 'autre',
                'date' => $event->start_at->format('d/m/Y H:i'),
                'lieu' => $event->location,
            ]);

        return [['evenements_a_venir' => $events->values()->all()], []];
    }

    private function toolDefinitions(Collection $children): array
    {
        $nomEnfantRequired = $children->count() > 1;
        $nomEnfantProperty = [
            'nom_enfant' => [
                'type' => 'string',
                'description' => "Nom (ou partie du nom) de l'enfant concerné. " .
                    ($nomEnfantRequired
                        ? "Obligatoire : ce parent a plusieurs enfants dans cette école."
                        : "Optionnel : ce parent n'a qu'un seul enfant dans cette école."),
            ],
        ];

        return [
            $this->tool(
                'absences_enfant',
                "Utilise cet outil quand la question porte sur les ABSENCES d'un enfant du parent. Retourne la classe, la section, le nombre et les dates d'absence.",
                $nomEnfantProperty,
                $nomEnfantRequired ? ['nom_enfant'] : []
            ),
            $this->tool(
                'moyenne_enfant',
                "Utilise cet outil quand la question porte sur la MOYENNE/les NOTES d'un enfant du parent. Retourne sa classe, sa section, sa moyenne générale et ses indicateurs.",
                $nomEnfantProperty,
                $nomEnfantRequired ? ['nom_enfant'] : []
            ),
            $this->tool(
                'paiements_enfant',
                "Utilise cet outil quand la question porte sur les FRAIS DE SCOLARITÉ / PAIEMENTS / ce que doit un enfant du parent. Retourne le total dû, déjà payé et le solde restant.",
                $nomEnfantProperty,
                $nomEnfantRequired ? ['nom_enfant'] : []
            ),
            $this->tool(
                'evenements_a_venir',
                "Retourne les 5 prochains événements de l'école (réunions, examens, sorties, jours fériés...).",
                $nomEnfantProperty,
                []
            ),
        ];
    }

    private function tool(string $name, string $description, array $properties, array $required = []): array
    {
        return [
            'type' => 'function',
            'function' => [
                'name' => $name,
                'description' => $description,
                'parameters' => [
                    'type' => 'object',
                    'properties' => (object) $properties,
                    'required' => $required,
                ],
            ],
        ];
    }
}