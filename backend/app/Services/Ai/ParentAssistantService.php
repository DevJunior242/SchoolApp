<?php

namespace App\Services\Ai;

use App\Models\Attendance;
use App\Models\ClassStudent;
use App\Models\Event;
use App\Models\FeeStructure;
use App\Models\Payment;
use App\Models\School;
use App\Models\SchoolStudent;
use App\Models\Student;
use App\Models\User;
use App\Services\StudentRiskService;
use Illuminate\Support\Collection;

/**
 * Assistant IA d'un parent : même principe que SchoolAssistantService (pas
 * de SQL généré par le modèle, un jeu fixe d'outils exécutés côté serveur),
 * mais volontairement une classe séparée plutôt qu'un "mode" partagé — le
 * périmètre de données est totalement différent (les enfants de CE parent
 * uniquement, jamais les autres élèves ni les données globales de l'école
 * comme la trésorerie), et séparer le code réduit le risque qu'un futur outil
 * ajouté côté direction se retrouve accessible à un parent par erreur.
 *
 * Chaque outil ne cherche l'élève concerné que parmi les enfants du parent
 * (jamais dans toute l'école) : c'est la frontière de sécurité de tout ce
 * service.
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
            'evenements_a_venir' => $this->toolEvenementsAVenir($school),
            default => [['error' => 'Outil inconnu.'], []],
        };
    }

    /**
     * Ne cherche que parmi les enfants du parent (jamais toute l'école) :
     * c'est la frontière de sécurité de ce service. Si un seul enfant et
     * aucun nom fourni, on le prend directement (pas besoin de désambiguïser).
     */
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
            'moyenne_generale' => $score['average'],
            'absences' => $score['absences'],
            'retards' => $score['retards'],
        ], [$token => $student->fullname]];
    }

    /**
     * Même calcul que PaymentController::forStudent (frais applicables au
     * niveau de l'élève pour l'année en cours, hors abonnement cantine qui a
     * son propre circuit) — même source de vérité que la page de paiements.
     */
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
            ->with('schoolClass')
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
            'total_du' => round((float) $totalDue, 2),
            'total_paye' => round((float) $totalConfirmed, 2),
            'solde_restant' => round((float) $totalDue - (float) $totalConfirmed, 2),
        ], [$token => $student->fullname]];
    }

    private function toolEvenementsAVenir(School $school): array
    {
        $events = Event::query()
            ->where('school_id', $school->id)
            ->where('start_at', '>=', now())
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
        // Le paramètre nom_enfant n'est requis que si le parent a plusieurs
        // enfants dans cette école : avec un seul, findChild() le prend
        // directement sans qu'il ait besoin d'être nommé dans la question.
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
                "Utilise cet outil quand la question porte sur les ABSENCES d'un enfant du parent. Retourne le nombre et les dates d'absence.",
                $nomEnfantProperty,
                $nomEnfantRequired ? ['nom_enfant'] : []
            ),
            $this->tool(
                'moyenne_enfant',
                "Utilise cet outil quand la question porte sur la MOYENNE/les NOTES d'un enfant du parent. Retourne sa moyenne générale et ses indicateurs (absences, retards).",
                $nomEnfantProperty,
                $nomEnfantRequired ? ['nom_enfant'] : []
            ),
            $this->tool(
                'paiements_enfant',
                "Utilise cet outil quand la question porte sur les FRAIS DE SCOLARITÉ / PAIEMENTS / ce que doit un enfant du parent (ex: \"combien je dois encore payer ?\", \"est-ce que j'ai fini de payer ?\"). Retourne le total dû, déjà payé et le solde restant.",
                $nomEnfantProperty,
                $nomEnfantRequired ? ['nom_enfant'] : []
            ),
            $this->tool(
                'evenements_a_venir',
                "Retourne les 5 prochains événements de l'école (réunions, examens, sorties, jours fériés...).",
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
                    // (object) force l'encodage JSON en "{}" plutôt qu'en "[]"
                    // quand $properties est vide : Groq valide le schéma plus
                    // strictement qu'OpenAI et rejette un tableau à cet endroit.
                    'properties' => (object) $properties,
                    'required' => $required,
                ],
            ],
        ];
    }
}
