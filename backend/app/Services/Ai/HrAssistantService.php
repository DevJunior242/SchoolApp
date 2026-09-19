<?php

namespace App\Services\Ai;

use App\Models\School;
use App\Models\SchoolStaffAttendance;
use App\Models\SchoolStaffLeave;
use App\Models\SchoolStaffProfile;
use App\Models\SchoolUser;
use App\Models\User;
use Illuminate\Support\Collection;

/** Assistant RH limité au personnel de l'école active. */
class HrAssistantService
{
    private const SYSTEM_PROMPT = <<<'TXT'
Tu es l'assistant RH d'une école. Réponds en français, brièvement et sans
inventer. Tu utilises uniquement les données renvoyées par tes outils.
Tu ne peux consulter que le personnel, les profils RH, les congés et les
pointages de cette école. Tu n'as jamais accès aux élèves, aux notes, aux
paiements scolaires, à la santé des élèves ou aux données d'une autre école.
Les salaires sont des informations confidentielles : ne les révèle que si la
question concerne explicitement la gestion RH et que la donnée est renvoyée.
TXT;

    public function __construct(private OpenAiClient $client) {}

    public function ask(User $actor, School $school, string $question): string
    {
        $staff = $this->staff($school);
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
        [$result, $tokenMap] = $this->runTool($school, $staff, $toolCall['function']['name'], $arguments);
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

    private function staff(School $school): Collection
    {
        return SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('status', SchoolUser::STATUS_ACTIVE)
            ->with(['user', 'role', 'staffProfile'])
            ->get();
    }

    private function runTool(School $school, Collection $staff, string $name, array $arguments): array
    {
        return match ($name) {
            'personnel_ecole' => [$this->staffResult($staff), []],
            'conges_personnel' => [$this->leaveResult($school, $staff), []],
            'pointages_personnel' => [$this->attendanceResult($school, $staff), []],
            default => [['error' => 'Outil inconnu.'], []],
        };
    }

    private function staffResult(Collection $staff): array
    {
        return ['personnel' => $staff->map(fn(SchoolUser $member) => [
            'nom' => $member->user?->fullname,
            'role' => $member->role?->name,
            'poste' => $member->staffProfile?->position,
            'departement' => $member->staffProfile?->department,
            'type_contrat' => SchoolStaffProfile::contractTypeLabel($member->staffProfile?->contract_type),
        ])->values()->all()];
    }

    private function leaveResult(School $school, Collection $staff): array
    {
        $leaves = SchoolStaffLeave::query()
            ->where('school_id', $school->id)
            ->whereIn('user_id', $staff->pluck('user_id'))
            ->with('user')
            ->where('ends_on', '>=', now()->toDateString())
            ->orderBy('starts_on')
            ->limit(100)
            ->get();

        return ['conges' => $leaves->map(fn(SchoolStaffLeave $leave) => [
            'nom' => $leave->user?->fullname,
            'type' => $leave->leave_type,
            'statut' => SchoolStaffLeave::statusLabel($leave->status),
            'du' => $leave->starts_on?->format('d/m/Y'),
            'au' => $leave->ends_on?->format('d/m/Y'),
        ])->values()->all()];
    }

    private function attendanceResult(School $school, Collection $staff): array
    {
        $rows = SchoolStaffAttendance::query()
            ->where('school_id', $school->id)
            ->whereIn('user_id', $staff->pluck('user_id'))
            ->with('user')
            ->whereBetween('attendance_date', [now()->startOfMonth(), now()->endOfMonth()])
            ->latest('attendance_date')
            ->limit(200)
            ->get();

        return ['pointages' => $rows->map(fn(SchoolStaffAttendance $row) => [
            'nom' => $row->user?->fullname,
            'date' => $row->attendance_date?->format('d/m/Y'),
            'arrivee' => $row->check_in?->format('H:i'),
            'depart' => $row->check_out?->format('H:i'),
        ])->values()->all()];
    }

    private function toolDefinitions(): array
    {
        return [
            $this->tool('personnel_ecole', 'Liste le personnel actif, son rôle et son poste.', []),
            $this->tool('conges_personnel', 'Liste les congés actuels ou à venir du personnel.', []),
            $this->tool('pointages_personnel', 'Liste les pointages du personnel pour le mois courant.', []),
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
