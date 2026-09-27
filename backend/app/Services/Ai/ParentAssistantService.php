<?php

namespace App\Services\Ai;

use App\Models\User;
use App\Models\Event;
use App\Models\Grade;
use App\Models\School;
use App\Models\Payment;
use App\Models\Student;
use App\Models\Attendance;
use App\Models\ClassStudent;
use App\Models\FeeStructure;
use App\Models\SchoolStudent;
use App\Models\TimetableSlot;
use Illuminate\Support\Carbon;
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
renvoyées par les outils que tu as appelés. Réponds en français, en quelques
phrases, sur un ton chaleureux et rassurant. Tu peux appeler plusieurs
outils si la question porte sur plusieurs sujets ou plusieurs enfants.

Tu n'as accès QU'aux informations concernant les enfants de ce parent
précis, jamais à celles d'un autre élève ni à des données globales de
l'école (finances de l'école, effectifs d'autres classes, etc.).

Absences et retards : chaque ligne indique la matière, le professeur, le
créneau horaire du cours prévu à l'emploi du temps et l'état du justificatif.
L'heure exacte d'arrivée d'un élève en retard n'est PAS enregistrée : si le
parent la demande, donne le créneau du cours concerné et précise que l'heure
d'arrivée précise n'est pas disponible. Si le créneau est null, dis que le
cours n'est pas planifié à l'emploi du temps. Quand un justificatif est
"non justifiée" ou "rejetée", indique au parent qu'il peut en déposer un
auprès de l'école.

Important : une liste ou un montant à zéro renvoyé par un outil signifie
qu'il n'y a AUCUNE absence/AUCUN impayé actuellement, pas que les données
sont indisponibles. Dans ce cas, annonce-le positivement.
Si l'outil renvoie une clé "error", explique ce message tel quel au parent
(ex: aucun enfant ne correspond à ce nom, précisez lequel).

Si la question ne concerne pas la scolarité de son/ses enfant(s) ou la vie
de l'école, n'appelle aucun outil et réponds directement, brièvement, en
rappelant que tu ne peux aider que sur ce sujet.
TXT;

    /** Nombre maximum d'allers-retours outils avant de forcer une réponse. */
    private const MAX_TOOL_ROUNDS = 3;

    private const EVENT_TYPE_LABELS = [
        Event::TYPE_REUNION => 'réunion',
        Event::TYPE_EXAMEN => 'examen',
        Event::TYPE_SORTIE => 'sortie',
        Event::TYPE_FERIE => 'jour férié',
        Event::TYPE_BULLETIN => 'remise des bulletins',
        Event::TYPE_AUTRE => 'autre',
    ];

    private const ATTENDANCE_TYPE_LABELS = [
        Attendance::STATUS_ABSENT => 'absence',
        Attendance::STATUS_RETARD => 'retard',
    ];

    private const JUSTIFICATION_LABELS = [
        Attendance::JUSTIFICATION_NON_JUSTIFIEE => 'non justifiée',
        Attendance::JUSTIFICATION_EN_ATTENTE => 'justificatif en attente de validation',
        Attendance::JUSTIFICATION_JUSTIFIEE => 'justifiée',
        Attendance::JUSTIFICATION_REJETEE => 'justificatif rejeté',
    ];

    private const JUSTIFICATION_FILTERS = [
        'non_justifiee' => Attendance::JUSTIFICATION_NON_JUSTIFIEE,
        'en_attente' => Attendance::JUSTIFICATION_EN_ATTENTE,
        'justifiee' => Attendance::JUSTIFICATION_JUSTIFIEE,
        'rejetee' => Attendance::JUSTIFICATION_REJETEE,
    ];

    private const DAY_LABELS = [
        TimetableSlot::DAY_LUNDI => 'lundi',
        TimetableSlot::DAY_MARDI => 'mardi',
        TimetableSlot::DAY_MERCREDI => 'mercredi',
        TimetableSlot::DAY_JEUDI => 'jeudi',
        TimetableSlot::DAY_VENDREDI => 'vendredi',
        TimetableSlot::DAY_SAMEDI => 'samedi',
        7 => 'dimanche',
    ];

    private const GRADE_TYPE_LABELS = [
        Grade::TYPE_DEVOIR => 'devoir',
        Grade::TYPE_INTERROGATION => 'interrogation',
        Grade::TYPE_COMPOSITION => 'composition',
        Grade::TYPE_EXAMEN => 'examen',
    ];

    private const PAYMENT_STATUS_LABELS = [
        Payment::STATUS_PENDING => 'en attente de confirmation',
        Payment::STATUS_CONFIRMED => 'confirmé',
        Payment::STATUS_REJECTED => 'rejeté',
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
            ['role' => 'system', 'content' => self::SYSTEM_PROMPT."\n\nNous sommes le ".$this->todayLabel().'.'],
            ['role' => 'user', 'content' => $question],
        ];
        $tools = $this->toolDefinitions($children);
        $tokenMap = [];

        $reply = $this->client->chat($messages, $tools, 'auto');

        for ($round = 0; $round < self::MAX_TOOL_ROUNDS && ($reply['tool_calls'] ?? []) !== []; $round++) {
            $messages[] = $reply;

            foreach ($reply['tool_calls'] as $toolCall) {
                $arguments = json_decode($toolCall['function']['arguments'] ?? '{}', true) ?: [];
                [$result, $tokens] = $this->runTool($school, $children, $toolCall['function']['name'], $arguments);
                $tokenMap += $tokens;

                $messages[] = [
                    'role' => 'tool',
                    'tool_call_id' => $toolCall['id'],
                    'content' => json_encode($result, JSON_UNESCAPED_UNICODE),
                ];
            }

            $reply = $this->client->chat($messages, $tools, 'auto');
        }

        if (($reply['tool_calls'] ?? []) !== []) {
            // Trop d'appels d'outils : on force une réponse finale sans outil.
            $reply = $this->client->chat($messages, $tools, 'none');
        }

        // strtr remplace les clés les plus longues d'abord (ENFANT_10 avant ENFANT_1).
        return strtr($reply['content'] ?? "Je n'ai pas pu formuler de réponse.", $tokenMap);
    }

    private function children(User $parent, School $school): Collection
    {
        return $parent->childStudents()
            ->whereHas('schoolStudents', fn ($query) => $query
                ->where('school_id', $school->id)
                ->where('status', SchoolStudent::STATUS_ACTIVE))
            ->with(['classStudents' => fn ($q) => $q->where('status', ClassStudent::STATUS_ACTIVE)->with('schoolClass.level.section')])
            ->get()
            ->values();
    }

    /**
     * @param  array<string, mixed>  $arguments
     * @return array{0: array<string, mixed>, 1: array<string, string>}
     */
    private function runTool(School $school, Collection $children, string $name, array $arguments): array
    {
        $nomEnfant = (string) ($arguments['nom_enfant'] ?? '');

        if ($name === 'evenements_a_venir') {
            return $this->toolEvenementsAVenir($school, $children, $nomEnfant);
        }

        $student = $this->findChild($children, $nomEnfant);

        if (! $student) {
            return [['error' => $this->childNotFoundMessage($children, $nomEnfant)], []];
        }

        // Jeton propre à chaque enfant : le vrai nom n'est jamais envoyé à
        // l'IA, et plusieurs enfants peuvent être évoqués dans une réponse.
        $token = 'ENFANT_'.($children->search(fn (Student $child) => $child->id === $student->id) + 1);
        $classStudent = $this->activeClassStudent($school, $student);

        $result = match ($name) {
            'assiduite_enfant' => $this->toolAssiduiteEnfant($classStudent, $student, $arguments),
            'notes_enfant' => $this->toolNotesEnfant($school, $classStudent, $student, $arguments),
            'emploi_du_temps_enfant' => $this->toolEmploiDuTempsEnfant($classStudent, $arguments),
            'paiements_enfant' => $this->toolPaiementsEnfant($school, $classStudent, $student),
            default => null,
        };

        if ($result === null) {
            return [['error' => 'Outil inconnu.'], []];
        }

        return [[
            'enfant' => $token,
            'classe' => $classStudent?->schoolClass?->name,
            'section' => $classStudent?->schoolClass?->level?->section?->name,
            ...$result,
        ], [$token => $student->fullname]];
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

    private function childNotFoundMessage(Collection $children, string $nomEnfant): string
    {
        return trim($nomEnfant) === ''
            ? "Précisez de quel enfant il s'agit (plusieurs enfants sont rattachés à votre compte)."
            : "Aucun enfant (ou plusieurs) ne correspond à « {$nomEnfant} ». Précisez le prénom de l'enfant concerné.";
    }

    private function activeClassStudent(School $school, Student $student): ?ClassStudent
    {
        return ClassStudent::query()
            ->where('student_id', $student->id)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->whereHas('schoolClass', fn ($query) => $query->where('school_id', $school->id))
            ->latest('created_at')
            ->with(['schoolClass.level.section'])
            ->first();
    }

    /**
     * Absences et retards de l'année en cours, avec la matière, le
     * professeur, le créneau du cours et l'état du justificatif.
     */
    private function toolAssiduiteEnfant(?ClassStudent $classStudent, Student $student, array $arguments): array
    {
        $type = $arguments['type'] ?? 'tous';
        $statuses = match ($type) {
            'absence' => [Attendance::STATUS_ABSENT],
            'retard' => [Attendance::STATUS_RETARD],
            default => [Attendance::STATUS_ABSENT, Attendance::STATUS_RETARD],
        };
        $matiere = trim((string) ($arguments['matiere'] ?? ''));
        $justification = self::JUSTIFICATION_FILTERS[$arguments['justification'] ?? ''] ?? null;
        $schoolYearId = $classStudent?->schoolClass?->school_year_id;

        $records = Attendance::query()
            ->where('student_id', $student->id)
            ->whereIn('status', $statuses)
            ->when($schoolYearId, fn ($query) => $query->whereHas(
                'classSubjectTeacher.schoolClass',
                fn ($q) => $q->where('school_year_id', $schoolYearId)
            ))
            ->when($matiere !== '', fn ($query) => $query->whereHas(
                'classSubjectTeacher.subject',
                fn ($q) => $q->where('name', 'like', '%'.$matiere.'%')
            ))
            ->when($justification !== null, fn ($query) => $query->where('justification_status', $justification))
            ->with(['classSubjectTeacher.subject', 'classSubjectTeacher.teacher', 'classSubjectTeacher.timetableSlots'])
            ->latest('date')
            ->get();

        $count = fn (int $status, ?int $justif = null) => $records
            ->where('status', $status)
            ->when($justif !== null, fn ($c) => $c->where('justification_status', $justif))
            ->count();

        $summary = [];
        foreach (self::ATTENDANCE_TYPE_LABELS as $status => $label) {
            if (! in_array($status, $statuses, true)) {
                continue;
            }
            $summary[$label.'s'] = [
                'total' => $count($status),
                'justifiees' => $count($status, Attendance::JUSTIFICATION_JUSTIFIEE),
                'en_attente' => $count($status, Attendance::JUSTIFICATION_EN_ATTENTE),
                'non_justifiees' => $count($status, Attendance::JUSTIFICATION_NON_JUSTIFIEE),
                'rejetees' => $count($status, Attendance::JUSTIFICATION_REJETEE),
            ];
        }

        $details = $records->take(25)->map(function (Attendance $attendance) {
            $cst = $attendance->classSubjectTeacher;
            $slot = $cst?->timetableSlots->firstWhere('day_of_week', $attendance->date->dayOfWeekIso);

            return [
                'date' => $attendance->date->format('d/m/Y'),
                'jour' => self::DAY_LABELS[$attendance->date->dayOfWeekIso] ?? null,
                'type' => self::ATTENDANCE_TYPE_LABELS[$attendance->status] ?? 'autre',
                'matiere' => $cst?->subject?->name,
                'professeur' => $cst?->teacher?->fullname,
                'creneau_cours' => $slot ? $this->timeRange($slot) : null,
                'salle' => $slot?->room,
                'justificatif' => self::JUSTIFICATION_LABELS[$attendance->justification_status] ?? 'non justifiée',
                'motif' => $attendance->justification_reason,
                'traite_le' => $attendance->justified_at?->format('d/m/Y'),
            ];
        });

        return [
            'filtres' => array_filter([
                'type' => $type,
                'matiere' => $matiere ?: null,
                'justification' => $arguments['justification'] ?? null,
            ]),
            'resume' => $summary,
            'details_recents' => $details->values()->all(),
            'details_tronques' => $records->count() > 25,
        ];
    }

    /**
     * Moyenne générale, moyenne par matière et dernières notes.
     */
    private function toolNotesEnfant(School $school, ?ClassStudent $classStudent, Student $student, array $arguments): array
    {
        $matiere = trim((string) ($arguments['matiere'] ?? ''));
        $schoolYearId = $classStudent?->schoolClass?->school_year_id;
        $score = $this->riskService->scoreFor($school, $student);

        $grades = Grade::query()
            ->where('student_id', $student->id)
            ->when($schoolYearId, fn ($query) => $query->whereHas(
                'classSubjectTeacher.schoolClass',
                fn ($q) => $q->where('school_year_id', $schoolYearId)
            ))
            ->when($matiere !== '', fn ($query) => $query->whereHas(
                'classSubjectTeacher.subject',
                fn ($q) => $q->where('name', 'like', '%'.$matiere.'%')
            ))
            ->with(['classSubjectTeacher.subject', 'season'])
            ->orderByDesc('graded_at')
            ->get();

        $bySubject = $grades
            ->groupBy(fn (Grade $grade) => $grade->classSubjectTeacher?->subject?->name ?? 'Autre')
            ->map(function (Collection $subjectGrades, string $subject) {
                $weight = $subjectGrades->sum('coefficient');

                return [
                    'matiere' => $subject,
                    'moyenne_sur_20' => $weight > 0
                        ? round($subjectGrades->sum(fn (Grade $g) => ($g->score / $g->max_score) * 20 * $g->coefficient) / $weight, 2)
                        : null,
                    'nombre_notes' => $subjectGrades->count(),
                ];
            })
            ->sortBy('moyenne_sur_20')
            ->values();

        return [
            'moyenne_generale_sur_20' => $score['average'],
            'moyennes_par_matiere' => $bySubject->all(),
            'dernieres_notes' => $grades->take(15)->map(fn (Grade $grade) => [
                'date' => $grade->graded_at?->format('d/m/Y'),
                'periode' => $grade->season?->label,
                'matiere' => $grade->classSubjectTeacher?->subject?->name,
                'type' => self::GRADE_TYPE_LABELS[$grade->evaluation_type] ?? $grade->evaluation_type,
                'intitule' => $grade->title,
                'note' => (float) $grade->score.'/'.(float) $grade->max_score,
                'coefficient' => (float) $grade->coefficient,
            ])->values()->all(),
            'absences_annee' => $score['absences'],
            'retards_annee' => $score['retards'],
        ];
    }

    /**
     * Cours d'une journée donnée pour la classe de l'enfant.
     */
    private function toolEmploiDuTempsEnfant(?ClassStudent $classStudent, array $arguments): array
    {
        $jour = mb_strtolower(trim((string) ($arguments['jour'] ?? 'aujourd_hui')));
        $day = match ($jour) {
            'demain' => now()->addDay()->dayOfWeekIso,
            'aujourd_hui', 'aujourd\'hui', '' => now()->dayOfWeekIso,
            default => array_search($jour, self::DAY_LABELS, true) ?: now()->dayOfWeekIso,
        };

        if (! $classStudent) {
            return ['error' => "L'enfant n'est inscrit dans aucune classe active."];
        }

        $slots = TimetableSlot::query()
            ->where('day_of_week', $day)
            ->whereHas('classSubjectTeacher', fn ($q) => $q->where('class_id', $classStudent->class_id))
            ->with(['classSubjectTeacher.subject', 'classSubjectTeacher.teacher'])
            ->orderBy('start_time')
            ->get();

        return [
            'jour' => self::DAY_LABELS[$day],
            'cours' => $slots->map(fn (TimetableSlot $slot) => [
                'horaire' => $this->timeRange($slot),
                'matiere' => $slot->classSubjectTeacher?->subject?->name,
                'professeur' => $slot->classSubjectTeacher?->teacher?->fullname,
                'salle' => $slot->room,
            ])->values()->all(),
        ];
    }

    private function toolPaiementsEnfant(School $school, ?ClassStudent $classStudent, Student $student): array
    {
        $fees = $classStudent
            ? FeeStructure::query()
                ->where('school_id', $school->id)
                ->where(fn ($query) => $query
                    ->where('level_id', $classStudent->schoolClass->level_id)
                    ->orWhereNull('level_id'))
                ->where('category', '!=', FeeStructure::CATEGORY_CAFETERIA_SUBSCRIPTION)
                ->where('school_year_id', $classStudent->schoolClass->school_year_id)
                ->orderBy('due_date')
                ->get()
            : collect();

        $totalDue = (float) $fees->sum('amount');

        $payments = Payment::query()
            ->where('school_id', $school->id)
            ->where('student_id', $student->id)
            ->with('feeStructure')
            ->latest('created_at')
            ->get();

        $totalConfirmed = (float) $payments->where('status', Payment::STATUS_CONFIRMED)->sum('amount');
        $nextDue = $fees->first(fn (FeeStructure $fee) => $fee->due_date && $fee->due_date->gte(today()));

        return [
            'total_du' => round($totalDue, 2),
            'total_paye' => round($totalConfirmed, 2),
            'solde_restant' => round($totalDue - $totalConfirmed, 2),
            'paiements_en_attente_de_confirmation' => round((float) $payments->where('status', Payment::STATUS_PENDING)->sum('amount'), 2),
            'prochaine_echeance' => $nextDue ? [
                'libelle' => $nextDue->label,
                'montant' => round((float) $nextDue->amount, 2),
                'date_limite' => $nextDue->due_date->format('d/m/Y'),
            ] : null,
            'derniers_paiements' => $payments->take(5)->map(fn (Payment $payment) => [
                'date' => ($payment->confirmed_at ?? $payment->created_at)?->format('d/m/Y'),
                'montant' => round((float) $payment->amount, 2),
                'frais' => $payment->feeStructure?->label,
                'statut' => self::PAYMENT_STATUS_LABELS[$payment->status] ?? 'inconnu',
                'recu' => $payment->receipt_number,
            ])->values()->all(),
        ];
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

    private function timeRange(TimetableSlot $slot): string
    {
        return substr((string) $slot->start_time, 0, 5).' - '.substr((string) $slot->end_time, 0, 5);
    }

    private function todayLabel(): string
    {
        $today = Carbon::today();

        return self::DAY_LABELS[$today->dayOfWeekIso].' '.$today->format('d/m/Y');
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
        $matiereProperty = [
            'matiere' => [
                'type' => 'string',
                'description' => 'Optionnel : nom (ou partie du nom) de la matière pour filtrer (ex: "maths", "anglais").',
            ],
        ];
        $required = $nomEnfantRequired ? ['nom_enfant'] : [];

        return [
            $this->tool(
                'assiduite_enfant',
                "Utilise cet outil pour toute question sur les ABSENCES ou RETARDS d'un enfant : combien, quand, à quel cours/matière, avec quel professeur, à quelle heure (créneau du cours), s'il y a eu un justificatif et s'il a été accepté. Porte sur l'année scolaire en cours.",
                $nomEnfantProperty + $matiereProperty + [
                    'type' => [
                        'type' => 'string',
                        'enum' => ['absence', 'retard', 'tous'],
                        'description' => "Filtrer sur les absences, les retards, ou les deux (par défaut 'tous').",
                    ],
                    'justification' => [
                        'type' => 'string',
                        'enum' => array_keys(self::JUSTIFICATION_FILTERS),
                        'description' => "Optionnel : ne garder que les absences/retards ayant cet état de justificatif.",
                    ],
                ],
                $required
            ),
            $this->tool(
                'notes_enfant',
                "Utilise cet outil quand la question porte sur la MOYENNE, les NOTES, les devoirs/interrogations/compositions d'un enfant, ou ses matières fortes/faibles. Retourne la moyenne générale, la moyenne par matière et les dernières notes.",
                $nomEnfantProperty + $matiereProperty,
                $required
            ),
            $this->tool(
                'emploi_du_temps_enfant',
                "Utilise cet outil quand la question porte sur l'EMPLOI DU TEMPS : quels cours l'enfant a aujourd'hui, demain ou un jour donné, à quelle heure, avec quel professeur, dans quelle salle.",
                $nomEnfantProperty + [
                    'jour' => [
                        'type' => 'string',
                        'enum' => ['aujourd_hui', 'demain', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
                        'description' => "Jour souhaité (par défaut 'aujourd_hui').",
                    ],
                ],
                $required
            ),
            $this->tool(
                'paiements_enfant',
                "Utilise cet outil quand la question porte sur les FRAIS DE SCOLARITÉ / PAIEMENTS / ce que doit un enfant du parent. Retourne le total dû, déjà payé, le solde restant, la prochaine échéance et les derniers paiements (avec leur statut).",
                $nomEnfantProperty,
                $required
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
