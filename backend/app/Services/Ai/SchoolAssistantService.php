<?php

namespace App\Services\Ai;

use App\Models\Attendance;
use App\Models\BookLoan;
use App\Models\CafeteriaMealService;
use App\Models\ClassStudent;
use App\Models\ClassSubjectTeacher;
use App\Models\EnrollmentRequest;
use App\Models\Event;
use App\Models\Expense;
use App\Models\Payment;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolStudent;
use App\Models\Student;
use App\Models\TreasuryAccount;
use App\Services\SchoolSummaryService;
use App\Services\StudentRiskService;
use App\Services\TreasuryService;
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
par l'outil que tu as appelé. Réponds en français, en quelques phrases,
sur un ton professionnel.

Important : une liste vide renvoyée par un outil (ex: "eleves_a_risque": [])
signifie qu'il n'y a AUCUN élève/paiement concerné en ce moment, pas que
les données sont indisponibles. Dans ce cas, annonce-le positivement
(ex: "Aucun élève ne présente de risque élevé ou moyen actuellement.").
Si l'outil renvoie une clé "error", explique ce message tel quel au
directeur (ex: élève ou classe introuvable).

Si la question ne concerne pas la gestion de l'école (élèves, notes,
absences, paiements, classes, événements), n'appelle aucun outil et
réponds directement, brièvement.
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
        private TreasuryService $treasuryService,
    ) {}

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
            'solde_tresorerie' => $this->toolSoldeTresorerie($school),
            'depenses_par_categorie' => $this->toolDepensesParCategorie($school),
            'paiements_par_categorie' => $this->toolPaiementsParCategorie($school),
            'cantine_du_jour' => $this->toolCantineDuJour($school),
            'emprunts_en_retard' => $this->toolEmpruntsEnRetard($school),
            'charge_enseignants' => $this->toolChargeEnseignants($school),
            'eleves_transport' => $this->toolElevesTransport($school),
            'meilleurs_eleves' => $this->toolMeilleursEleves($school),
            'taux_presence' => $this->toolTauxPresence($school),
            'demandes_preinscription_en_attente' => $this->toolDemandesPreinscription($school),
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

    /**
     * Meilleures moyennes de l'école, complément "positif" de
     * toolElevesARisque — même source de données (reportForSchool), juste
     * triée dans l'autre sens et sans le filtre sur le niveau de risque.
     */
    private function toolMeilleursEleves(School $school): array
    {
        $report = $this->riskService->reportForSchool($school)
            ->filter(fn ($row) => $row['average'] !== null)
            ->sortByDesc('average')
            ->take(10);

        [$anonymized, $tokenMap] = $this->anonymize($report);

        return [['meilleurs_eleves' => $anonymized], $tokenMap];
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

    private function toolSoldeTresorerie(School $school): array
    {
        $accounts = TreasuryAccount::query()
            ->where('school_id', $school->id)
            ->where('is_active', true)
            ->get();

        $comptes = $accounts->map(fn (TreasuryAccount $account) => [
            'nom' => $account->name,
            'type' => $account->type === TreasuryAccount::TYPE_CASH ? 'caisse' : 'banque',
            'solde' => $this->treasuryService->balance($account),
        ]);

        return [[
            'comptes' => $comptes->values()->all(),
            'solde_total' => round($comptes->sum('solde'), 2),
        ], []];
    }

    /**
     * Répartition des dépenses confirmées du mois en cours, par catégorie —
     * ne remonte que ce qui est réellement confirmé et daté ce mois-ci,
     * pas d'estimation.
     */
    private function toolDepensesParCategorie(School $school): array
    {
        $expenses = Expense::query()
            ->where('school_id', $school->id)
            ->where('status', Expense::STATUS_CONFIRMED)
            ->whereBetween('expense_date', [now()->startOfMonth(), now()->endOfMonth()])
            ->with('expenseCategory')
            ->get();

        $parCategorie = $expenses
            ->groupBy(fn (Expense $expense) => $expense->expenseCategory?->name ?? 'Sans catégorie')
            ->map(fn (Collection $group, string $categorie) => [
                'categorie' => $categorie,
                'montant' => round((float) $group->sum('amount'), 2),
            ])
            ->sortByDesc('montant')
            ->values();

        return [['depenses_par_categorie_ce_mois' => $parCategorie->all()], []];
    }

    /**
     * Répartition des paiements confirmés du mois en cours, par catégorie de
     * frais — miroir de toolDepensesParCategorie côté recettes.
     */
    private function toolPaiementsParCategorie(School $school): array
    {
        $payments = Payment::query()
            ->where('school_id', $school->id)
            ->where('status', Payment::STATUS_CONFIRMED)
            ->whereBetween('confirmed_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->with('feeStructure.feeCategory')
            ->get();

        $parCategorie = $payments
            ->groupBy(fn (Payment $payment) => $payment->feeStructure?->feeCategory?->name ?? 'Sans catégorie')
            ->map(fn (Collection $group, string $categorie) => [
                'categorie' => $categorie,
                'montant' => round((float) $group->sum('amount'), 2),
            ])
            ->sortByDesc('montant')
            ->values();

        return [['recettes_par_categorie_ce_mois' => $parCategorie->all()], []];
    }

    private function toolCantineDuJour(School $school): array
    {
        $services = CafeteriaMealService::query()
            ->where('school_id', $school->id)
            ->whereDate('served_at', now()->toDateString())
            ->get();

        return [[
            'repas_servis_aujourd_hui' => $services->count(),
            'via_portefeuille' => $services->where('covered_by', CafeteriaMealService::COVERED_BY_WALLET)->count(),
            'via_abonnement' => $services->where('covered_by', CafeteriaMealService::COVERED_BY_SUBSCRIPTION)->count(),
        ], []];
    }

    /**
     * Emprunts actifs dont la date de retour est dépassée. Les noms d'élèves
     * sont anonymisés comme partout ailleurs pour cette même raison.
     */
    private function toolEmpruntsEnRetard(School $school): array
    {
        $loans = BookLoan::query()
            ->where('school_id', $school->id)
            ->where('status', BookLoan::STATUS_ACTIVE)
            ->where('due_at', '<', now()->toDateString())
            ->with(['student', 'copy.book'])
            ->orderBy('due_at')
            ->limit(15)
            ->get();

        $rows = collect($loans->map(fn (BookLoan $loan) => [
            'fullname' => $loan->student?->fullname ?? 'Élève inconnu',
            'livre' => $loan->copy?->book?->title ?? 'Titre inconnu',
            'jours_de_retard' => now()->diffInDays($loan->due_at),
        ]));

        [$anonymized, $tokenMap] = $this->anonymize($rows);

        return [['emprunts_en_retard' => $anonymized], $tokenMap];
    }

    /**
     * Nombre de cours (classe+matière) assignés à chaque enseignant pour
     * l'année scolaire en cours — pas de nom d'élève ici, donc pas
     * d'anonymisation nécessaire (des enseignants, pas des élèves).
     */
    private function toolChargeEnseignants(School $school): array
    {
        $assignments = ClassSubjectTeacher::query()
            ->whereHas('schoolClass', fn ($query) => $query
                ->where('school_id', $school->id)
                ->whereHas('schoolYear', fn ($q) => $q->where('is_current', true)))
            ->with('teacher')
            ->get();

        $parEnseignant = $assignments
            ->groupBy(fn (ClassSubjectTeacher $a) => $a->teacher?->fullname ?? 'Enseignant inconnu')
            ->map(fn (Collection $group, string $nom) => [
                'enseignant' => $nom,
                'nombre_de_cours' => $group->count(),
            ])
            ->sortByDesc('nombre_de_cours')
            ->values();

        return [['charge_par_enseignant' => $parEnseignant->all()], []];
    }

    private function toolElevesTransport(School $school): array
    {
        $total = SchoolStudent::query()
            ->where('school_id', $school->id)
            ->where('status', SchoolStudent::STATUS_ACTIVE)
            ->count();

        $avecBus = SchoolStudent::query()
            ->where('school_id', $school->id)
            ->where('status', SchoolStudent::STATUS_ACTIVE)
            ->whereNotNull('bus_stop_id')
            ->count();

        return [[
            'effectif_total' => $total,
            'eleves_avec_arret_bus' => $avecBus,
            'eleves_sans_arret_bus' => $total - $avecBus,
        ], []];
    }

    /**
     * Taux de présence global (tous cours confondus) sur le mois en cours —
     * complète le nombre brut d'absences du jour déjà présent dans
     * resume_ecole par une vue en pourcentage sur une période plus large.
     */
    private function toolTauxPresence(School $school): array
    {
        $query = Attendance::query()
            ->whereHas('classSubjectTeacher.schoolClass', fn ($q) => $q->where('school_id', $school->id))
            ->whereBetween('date', [now()->startOfMonth(), now()->endOfMonth()]);

        $total = (clone $query)->count();
        $presents = (clone $query)->where('status', Attendance::STATUS_PRESENT)->count();

        return [[
            'taux_presence_ce_mois' => $total > 0 ? round(($presents / $total) * 100, 1) : null,
            'total_appels_ce_mois' => $total,
        ], []];
    }

    /**
     * Demandes de pré-inscription reçues depuis la page publique de l'école
     * (formulaire home page / chatbot) et pas encore traitées.
     */
    private function toolDemandesPreinscription(School $school): array
    {
        $count = EnrollmentRequest::query()
            ->where('school_id', $school->id)
            ->where('status', EnrollmentRequest::STATUS_PENDING)
            ->count();

        return [['demandes_preinscription_en_attente' => $count], []];
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
                "Utilise cet outil UNIQUEMENT quand la question porte sur le risque d'ABANDON scolaire ou les élèves en DIFFICULTÉ de façon générale (combinaison absences+moyenne+retards+impayés). Ne pas utiliser pour une question qui porte spécifiquement sur les paiements/frais de scolarité, ou sur la moyenne d'une classe : ce sont d'autres outils. Retourne la liste des élèves à risque moyen ou élevé, triée par score décroissant.",
                []
            ),
            $this->tool(
                'meilleurs_eleves',
                "Utilise cet outil quand la question porte sur les MEILLEURS élèves / les meilleures moyennes de l'école (ex: \"qui sont les meilleurs élèves ?\", \"quels sont les élèves les plus performants ?\"). Retourne les 10 meilleures moyennes générales.",
                []
            ),
            $this->tool(
                'paiements_en_retard',
                "Utilise cet outil quand la question porte spécifiquement sur les PAIEMENTS, FRAIS DE SCOLARITÉ ou IMPAYÉS (ex: \"qui n'a pas payé ?\", \"paiements en retard\"). Retourne la liste des élèves ayant des échéances de paiement dépassées non couvertes par un paiement confirmé.",
                []
            ),
            $this->tool(
                'absences_eleve',
                "Utilise cet outil quand la question porte sur les absences d'UN élève précis, désigné par son nom (pas une classe entière, pas la liste des élèves à risque). Retourne le nombre et les dates d'absence de cet élève.",
                ['nom_eleve' => ['type' => 'string', 'description' => "Nom (ou partie du nom) de l'élève concerné."]],
                ['nom_eleve']
            ),
            $this->tool(
                'moyenne_eleve',
                "Utilise cet outil quand la question porte sur la moyenne/les notes d'UN élève précis, désigné par son nom (pas une classe entière). Retourne sa moyenne générale et ses indicateurs (absences, retards).",
                ['nom_eleve' => ['type' => 'string', 'description' => "Nom (ou partie du nom) de l'élève concerné."]],
                ['nom_eleve']
            ),
            $this->tool(
                'moyenne_classe',
                "Utilise cet outil quand la question porte sur la moyenne d'une CLASSE ENTIÈRE désignée par son nom (ex: \"6ème A\"), pas sur un élève individuel. Le paramètre nom_classe est obligatoire et doit être extrait de la question. Retourne la moyenne générale de la classe et son effectif.",
                ['nom_classe' => ['type' => 'string', 'description' => "Nom (ou partie du nom) de la classe concernée, ex: '6ème A'."]],
                ['nom_classe']
            ),
            $this->tool(
                'resume_ecole',
                "Utilise cet outil pour une vue d'ensemble générale de l'école (chiffres clés) : nombre d'élèves, d'enseignants, de classes, paiements en attente/confirmés (montants globaux, pas la liste des élèves concernés), absences du jour, justifications en attente.",
                []
            ),
            $this->tool(
                'effectifs_par_classe',
                "Utilise cet outil quand la question porte sur le NOMBRE D'ÉLÈVES par classe (effectifs), pas sur les moyennes ni les élèves à risque. Retourne le nombre d'élèves actifs dans chaque classe de l'année scolaire en cours.",
                []
            ),
            $this->tool(
                'evenements_a_venir',
                "Retourne les 5 prochains événements de l'école (réunions, examens, sorties, jours fériés...).",
                []
            ),
            $this->tool(
                'solde_tresorerie',
                "Utilise cet outil quand la question porte sur la TRÉSORERIE : le solde d'une caisse, d'un compte bancaire, ou le total disponible (ex: \"combien y a-t-il en caisse ?\", \"quel est notre solde bancaire ?\"). Ne pas utiliser pour les recettes/dépenses globales : c'est resume_ecole. Retourne le solde de chaque compte de trésorerie actif et le total.",
                []
            ),
            $this->tool(
                'depenses_par_categorie',
                "Utilise cet outil quand la question porte sur la RÉPARTITION des dépenses par catégorie ce mois-ci (ex: \"sur quoi dépense-t-on le plus ?\", \"combien pour les salaires ce mois ?\"). Ne pas utiliser pour un montant total unique : c'est resume_ecole. Retourne le montant confirmé par catégorie de dépense pour le mois en cours.",
                []
            ),
            $this->tool(
                'paiements_par_categorie',
                "Utilise cet outil quand la question porte sur la RÉPARTITION des recettes/paiements par catégorie de frais ce mois-ci (ex: \"quelles sont nos recettes par catégorie ?\", \"combien a rapporté la cantine ce mois ?\"). Ne pas utiliser pour un montant total unique : c'est resume_ecole. Retourne le montant confirmé par catégorie de frais pour le mois en cours.",
                []
            ),
            $this->tool(
                'cantine_du_jour',
                "Utilise cet outil quand la question porte sur la CANTINE aujourd'hui (ex: \"combien d'élèves ont mangé aujourd'hui ?\"). Retourne le nombre de repas servis aujourd'hui, répartis entre paiement au portefeuille et couverture par abonnement.",
                []
            ),
            $this->tool(
                'emprunts_en_retard',
                "Utilise cet outil quand la question porte sur les LIVRES EMPRUNTÉS EN RETARD à la bibliothèque (ex: \"quels livres ne sont pas encore rendus ?\", \"y a-t-il des retards à la bibliothèque ?\"). Retourne la liste des emprunts actifs dont la date de retour est dépassée.",
                []
            ),
            $this->tool(
                'charge_enseignants',
                "Utilise cet outil quand la question porte sur la CHARGE DE TRAVAIL des enseignants (nombre de cours/classes assignés à chacun) pour l'année scolaire en cours (ex: \"quel enseignant a le plus de cours ?\", \"combien de cours a M. Diallo ?\").",
                []
            ),
            $this->tool(
                'eleves_transport',
                "Utilise cet outil quand la question porte sur le TRANSPORT SCOLAIRE / BUS (ex: \"combien d'élèves prennent le bus ?\", \"combien n'ont pas d'arrêt assigné ?\"). Retourne le nombre d'élèves actifs avec et sans arrêt de bus assigné.",
                []
            ),
            $this->tool(
                'taux_presence',
                "Utilise cet outil quand la question porte sur le TAUX DE PRÉSENCE GLOBAL ce mois-ci, en pourcentage (ex: \"quel est notre taux de présence ?\", \"est-ce que l'assiduité est bonne ce mois-ci ?\"). Ne pas utiliser pour un nombre d'absences précis : ce sont d'autres outils (absences_eleve, resume_ecole pour aujourd'hui).",
                []
            ),
            $this->tool(
                'demandes_preinscription_en_attente',
                "Utilise cet outil quand la question porte sur les DEMANDES DE PRÉ-INSCRIPTION reçues via le site public et pas encore traitées (ex: \"combien de demandes d'inscription en attente ?\", \"y a-t-il de nouvelles demandes ?\").",
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
