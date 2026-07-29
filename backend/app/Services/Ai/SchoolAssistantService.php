<?php

namespace App\Services\Ai;

use App\Models\Attendance;
use App\Models\ClassStudent;
use App\Models\Event;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolStudent;
use App\Models\Student;
use App\Services\SchoolSummaryService;
use App\Services\StudentRiskService;
use Illuminate\Support\Collection;

/**
 * Assistant IA du directeur : l'IA ne touche jamais la base de données
 * elle-même (pas de SQL généré par le modèle). Elle ne peut choisir que
 * parmi un jeu fixe d'outils ci-dessous ; chaque outil est une requête
 * Eloquent normale, scopée à l'école, exécutée côté serveur. Les listes
 * d'élèves envoyées au modèle sont anonymisées (noms remplacés par des
 * jetons "Élève A/B/C") ; le nom réel n'est réinjecté que dans la réponse
 * finale affichée au directeur, jamais renvoyé tel quel à l'API tierce.
 *
 * Limite assumée : quand le directeur nomme lui-même un élève dans sa
 * question ("Pourquoi Ali est absent ?"), ce nom fait partie du texte de
 * la question et part donc à l'API — il n'y a pas moyen d'anonymiser une
 * question en langage libre sans la dénaturer. On limite quand même
 * l'exposition supplémentaire en anonymisant les données renvoyées par
 * l'outil (le modèle ne revoit le nom qu'une fois, dans la question).
 */
class SchoolAssistantService
{
    private const SYSTEM_PROMPT = <<<'TXT'
Tu es l'assistant de direction d'une école africaine. Tu ne dois JAMAIS
inventer de chiffres : réponds uniquement à partir des données renvoyées
par l'outil que tu as appelé. Si les données ne permettent pas de répondre,
dis-le clairement plutôt que de deviner. Réponds en français, en quelques
phrases, sur un ton professionnel.
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
        private SchoolSummaryService $summaryService,
    ) {}

    public function ask(School $school, string $question): string
    {
        $messages = [
            ['role' => 'system', 'content' => self::SYSTEM_PROMPT],
            ['role' => 'user', 'content' => $question],
        ];

        $first = $this->client->chat($messages, $this->toolDefinitions(), 'required');
        $toolCalls = $first['tool_calls'] ?? [];

        if ($toolCalls === []) {
            return $first['content'] ?? "Je n'ai pas pu traiter cette question.";
        }

        $toolCall = $toolCalls[0];
        $arguments = json_decode($toolCall['function']['arguments'] ?? '{}', true) ?: [];

        [$result, $tokenMap] = $this->runTool($school, $toolCall['function']['name'], $arguments);

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

    /**
     * @param  array<string, mixed>  $arguments
     * @return array{0: array<string, mixed>, 1: array<string, string>}
     */
    private function runTool(School $school, string $name, array $arguments): array
    {
        return match ($name) {
            'eleves_a_risque' => $this->toolElevesARisque($school),
            'paiements_en_retard' => $this->toolPaiementsEnRetard($school),
            'absences_eleve' => $this->toolAbsencesEleve($school, $arguments['nom_eleve'] ?? ''),
            'moyenne_eleve' => $this->toolMoyenneEleve($school, $arguments['nom_eleve'] ?? ''),
            'moyenne_classe' => $this->toolMoyenneClasse($school, $arguments['nom_classe'] ?? ''),
            'resume_ecole' => $this->toolResumeEcole($school),
            'effectifs_par_classe' => $this->toolEffectifsParClasse($school),
            'evenements_a_venir' => $this->toolEvenementsAVenir($school),
            default => [['error' => 'Outil inconnu.'], []],
        };
    }

    private function toolElevesARisque(School $school): array
    {
        $report = $this->riskService->reportForSchool($school)
            ->filter(fn ($row) => $row['level'] !== StudentRiskService::RISK_LOW)
            ->take(10);

        [$anonymized, $tokenMap] = $this->anonymize($report);

        return [['eleves_a_risque' => $anonymized], $tokenMap];
    }

    private function toolPaiementsEnRetard(School $school): array
    {
        $report = $this->riskService->reportForSchool($school)
            ->filter(fn ($row) => $row['payment_delay'])
            ->take(10);

        [$anonymized, $tokenMap] = $this->anonymize($report);

        return [['paiements_en_retard' => $anonymized], $tokenMap];
    }

    private function toolAbsencesEleve(School $school, string $nomEleve): array
    {
        $student = $this->findStudent($school, $nomEleve);

        if (! $student) {
            return [['error' => "Aucun élève actif ne correspond de façon unique à « {$nomEleve} »."], []];
        }

        $token = 'ÉLÈVE_CIBLE';

        $dates = Attendance::query()
            ->where('student_id', $student->id)
            ->where('status', Attendance::STATUS_ABSENT)
            ->latest('date')
            ->limit(20)
            ->pluck('date')
            ->map(fn ($date) => $date->format('d/m/Y'))
            ->values();

        return [[
            'eleve' => $token,
            'nombre_absences' => $dates->count(),
            'dates_recentes' => $dates->all(),
        ], [$token => $student->fullname]];
    }

    private function toolMoyenneEleve(School $school, string $nomEleve): array
    {
        $student = $this->findStudent($school, $nomEleve);

        if (! $student) {
            return [['error' => "Aucun élève actif ne correspond de façon unique à « {$nomEleve} »."], []];
        }

        $token = 'ÉLÈVE_CIBLE';
        $score = $this->riskService->scoreFor($school, $student);

        return [[
            'eleve' => $token,
            'moyenne_generale' => $score['average'],
            'absences' => $score['absences'],
            'retards' => $score['retards'],
        ], [$token => $student->fullname]];
    }

    private function toolMoyenneClasse(School $school, string $nomClasse): array
    {
        $schoolClass = $this->findClass($school, $nomClasse);

        if (! $schoolClass) {
            return [['error' => "Aucune classe active ne correspond de façon unique à « {$nomClasse} »."], []];
        }

        $averages = ClassStudent::query()
            ->where('class_id', $schoolClass->id)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->with('student')
            ->get()
            ->map(fn (ClassStudent $classStudent) => $this->riskService->scoreFor($school, $classStudent->student)['average'])
            ->filter(fn ($average) => $average !== null);

        return [[
            'classe' => $schoolClass->name,
            'effectif' => ClassStudent::query()->where('class_id', $schoolClass->id)->where('status', ClassStudent::STATUS_ACTIVE)->count(),
            'moyenne_classe' => $averages->isNotEmpty() ? round($averages->avg(), 2) : null,
        ], []];
    }

    private function toolResumeEcole(School $school): array
    {
        return [$this->summaryService->summary($school), []];
    }

    private function toolEffectifsParClasse(School $school): array
    {
        // SchoolClass::students() infère une mauvaise clé pivot (jamais
        // utilisée ailleurs dans le code) : on compte via ClassStudent
        // directement, comme partout ailleurs dans le codebase.
        $classes = SchoolClass::query()
            ->where('school_id', $school->id)
            ->whereHas('schoolYear', fn ($query) => $query->where('is_current', true))
            ->get(['id', 'name'])
            ->map(fn (SchoolClass $schoolClass) => [
                'classe' => $schoolClass->name,
                'effectif' => ClassStudent::query()
                    ->where('class_id', $schoolClass->id)
                    ->where('status', ClassStudent::STATUS_ACTIVE)
                    ->count(),
            ]);

        return [['classes' => $classes->values()->all()], []];
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

    private function findClass(School $school, string $nomClasse): ?SchoolClass
    {
        if (trim($nomClasse) === '') {
            return null;
        }

        $matches = SchoolClass::query()
            ->where('school_id', $school->id)
            ->where('name', 'like', '%'.trim($nomClasse).'%')
            ->whereHas('schoolYear', fn ($query) => $query->where('is_current', true))
            ->limit(2)
            ->get();

        return $matches->count() === 1 ? $matches->first() : null;
    }

    private function findStudent(School $school, string $nomEleve): ?Student
    {
        if (trim($nomEleve) === '') {
            return null;
        }

        $matches = Student::query()
            ->where('fullname', 'like', '%'.trim($nomEleve).'%')
            ->whereHas('schoolStudents', fn ($query) => $query
                ->where('school_id', $school->id)
                ->where('status', SchoolStudent::STATUS_ACTIVE))
            ->limit(2)
            ->get();

        return $matches->count() === 1 ? $matches->first() : null;
    }

    /**
     * Remplace le nom de chaque ligne par un jeton "Élève A/B/C..." avant
     * envoi au modèle, et retire les identifiants internes (matricule,
     * student_id) qui n'ont rien à faire chez un tiers.
     *
     * @return array{0: array<int, array<string, mixed>>, 1: array<string, string>}
     */
    private function anonymize(Collection $rows): array
    {
        $tokenMap = [];
        $letters = range('A', 'Z');

        $anonymized = $rows->values()->map(function (array $row, int $index) use ($letters, &$tokenMap) {
            $token = 'Élève '.($letters[$index] ?? (string) ($index + 1));
            $tokenMap[$token] = $row['fullname'];

            unset($row['matricule'], $row['student_id']);
            $row['fullname'] = $token;

            return $row;
        })->values()->all();

        return [$anonymized, $tokenMap];
    }

    private function toolDefinitions(): array
    {
        return [
            $this->tool(
                'eleves_a_risque',
                "Retourne la liste des élèves présentant un risque moyen ou élevé d'abandon scolaire (absences, moyenne, retards, impayés), triée par score décroissant.",
                []
            ),
            $this->tool(
                'paiements_en_retard',
                'Retourne la liste des élèves ayant des paiements en retard (échéances dépassées non couvertes par un paiement confirmé).',
                []
            ),
            $this->tool(
                'absences_eleve',
                "Retourne le nombre et les dates d'absence d'un élève précis, désigné par son nom.",
                ['nom_eleve' => ['type' => 'string', 'description' => "Nom (ou partie du nom) de l'élève concerné."]],
                ['nom_eleve']
            ),
            $this->tool(
                'moyenne_eleve',
                "Retourne la moyenne générale et les indicateurs (absences, retards) d'un élève précis, désigné par son nom.",
                ['nom_eleve' => ['type' => 'string', 'description' => "Nom (ou partie du nom) de l'élève concerné."]],
                ['nom_eleve']
            ),
            $this->tool(
                'moyenne_classe',
                "Retourne la moyenne générale et l'effectif d'une classe précise, désignée par son nom.",
                ['nom_classe' => ['type' => 'string', 'description' => "Nom (ou partie du nom) de la classe concernée."]],
                ['nom_classe']
            ),
            $this->tool(
                'resume_ecole',
                "Retourne les chiffres clés de l'école : nombre d'élèves, d'enseignants, de classes, paiements en attente/confirmés, absences du jour, justifications en attente.",
                []
            ),
            $this->tool(
                'effectifs_par_classe',
                "Retourne le nombre d'élèves actifs dans chaque classe de l'année scolaire en cours.",
                []
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
                    'properties' => $properties,
                    'required' => $required,
                ],
            ],
        ];
    }
}
