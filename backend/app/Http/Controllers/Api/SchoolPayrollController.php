<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\SchoolPayrollEntry;
use App\Models\SchoolPayrollType;
use App\Models\SchoolUser;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SchoolPayrollController extends Controller
{
    use AuthorizesSchoolDirecteur;

    public function types(Request $request, School $school)
    {
        $this->authorizeHrStaff($request, $school);

        return response()->json(
            SchoolPayrollType::query()
                ->where('school_id', $school->id)
                ->where('is_active', true)
                ->orderBy('kind')
                ->orderBy('name')
                ->get()
        );
    }

    public function storeType(Request $request, School $school)
    {
        $this->authorizeHrStaff($request, $school);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:100'],
            'kind' => ['required', 'in:gain,retention'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $validated['code'] = Str::slug($validated['code']);

        $exists = SchoolPayrollType::query()
            ->where('school_id', $school->id)
            ->where('code', $validated['code'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Ce code de type de paie existe déjà pour cette école.',
            ], 422);
        }

        $type = SchoolPayrollType::query()->create([
            'school_id' => $school->id,
            'name' => $validated['name'],
            'code' => $validated['code'],
            'kind' => $validated['kind'],
            'description' => $validated['description'] ?? null,
            'is_active' => true,
        ]);

        return response()->json($type, 201);
    }

    public function updateType(Request $request, School $school, SchoolPayrollType $type)
    {
        $this->authorizeHrStaff($request, $school);
        abort_unless($type->school_id === $school->id, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:100'],
            'kind' => ['required', 'in:gain,retention'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $validated['code'] = Str::slug($validated['code']);

        $duplicate = SchoolPayrollType::query()
            ->where('school_id', $school->id)
            ->where('code', $validated['code'])
            ->whereKeyNot($type->id)
            ->exists();

        if ($duplicate) {
            return response()->json([
                'message' => 'Ce code de type de paie existe déjà pour cette école.',
            ], 422);
        }

        $type->update([
            'name' => $validated['name'],
            'code' => $validated['code'],
            'kind' => $validated['kind'],
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json($type);
    }

    public function destroyType(Request $request, School $school, SchoolPayrollType $type)
    {
        $this->authorizeHrStaff($request, $school);
        abort_unless($type->school_id === $school->id, 404);

        if ($type->entries()->exists()) {
            return response()->json([
                'message' => 'Ce type de paie est déjà utilisé dans des lignes. Désactivez-le plutôt que de le supprimer.',
            ], 422);
        }

        $type->delete();

        return response()->json(['message' => 'Type supprimé.']);
    }

    public function summary(Request $request, School $school, $userId)
    {
        $this->authorizeHrStaff($request, $school);

        abort_unless(
            SchoolUser::query()->where('school_id', $school->id)->where('user_id', $userId)->exists(),
            404,
            'Employé introuvable dans cette école.'
        );

        $period = $request->query('period', now()->format('Y-m'));
        $entries = SchoolPayrollEntry::query()
            ->with('type')
            ->where('school_id', $school->id)
            ->where('user_id', $userId)
            ->where('period', $period)
            ->orderBy('created_at')
            ->get();

        $gains = $entries->where('type.kind', SchoolPayrollType::KIND_GAIN)->sum('amount');
        $retentions = $entries->where('type.kind', SchoolPayrollType::KIND_RETENTION)->sum('amount');

        return response()->json([
            'period' => $period,
            'gains' => (float) $gains,
            'retenues' => (float) $retentions,
            'net' => (float) ($gains - $retentions),
            'entries' => $entries,
        ]);
    }

    public function storeEntry(Request $request, School $school, $userId)
    {
        $this->authorizeHrStaff($request, $school);

        abort_unless(
            SchoolUser::query()->where('school_id', $school->id)->where('user_id', $userId)->exists(),
            404,
            'Employé introuvable dans cette école.'
        );

        $validated = $request->validate([
            'type_id' => ['required', 'uuid', 'exists:school_payroll_types,id'],
            'period' => ['required', 'string', 'max:7'],
            'label' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $type = SchoolPayrollType::query()->findOrFail($validated['type_id']);
        abort_unless($type->school_id === $school->id, 404, 'Type introuvable dans cette école.');

        $entry = SchoolPayrollEntry::query()->create([
            'school_id' => $school->id,
            'user_id' => $userId,
            'type_id' => $type->id,
            'period' => $validated['period'],
            'label' => $validated['label'],
            'amount' => $validated['amount'],
            'note' => $validated['note'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        return response()->json($entry->load('type'), 201);
    }
}
