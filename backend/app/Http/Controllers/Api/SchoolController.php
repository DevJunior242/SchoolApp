<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\GeneratesSeasons;
use App\Http\Controllers\Api\Concerns\ResolvesMemberUser;
use App\Http\Controllers\Controller;
use App\Models\ActivationKey;
use App\Models\Grade;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolPricingPlan;
use App\Models\SchoolUser;
use App\Models\SchoolYear;
use App\Models\Season;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class SchoolController extends Controller
{
    use AuthorizesSchoolDirecteur, GeneratesSeasons, ResolvesMemberUser;

    public function index()
    {
        return response()->json(
            School::query()
                ->where('status', School::STATUS_ACTIVE)
                ->with('country')
                ->get()
        );
    }

    public function mine(Request $request)
    {
        return response()->json(
            SchoolUser::query()
                ->where('user_id', $request->user()->id)
                ->with(['school.country', 'role'])
                ->get()
        );
    }

    // Durée de l'essai gratuit pour une école créée sans clé d'activation
    // (une clé valide saute directement le trial, cf. store()).
    private const TRIAL_DAYS = 30;

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'country_id' => ['required', 'uuid', 'exists:countries,id'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'activation_key' => ['nullable', 'string', 'max:80'],
            'plan' => ['nullable', 'string', 'max:120'],
            'pricing_plan_id' => ['nullable', 'uuid', 'exists:school_pricing_plans,id'],
        ]);

        $pricingPlan = ! empty($validated['pricing_plan_id'])
            ? SchoolPricingPlan::query()->where('active', true)->find($validated['pricing_plan_id'])
            : SchoolPricingPlan::query()->where('active', true)->where('slug', $validated['plan'] ?? School::PLAN_ECOLE)->first();

        if (! $pricingPlan) {
            throw ValidationException::withMessages([
                'pricing_plan_id' => ['Le tarif sélectionné n’est pas disponible.'],
            ]);
        }

        $validated['pricing_plan_id'] = $pricingPlan->id;
        $validated['plan'] = $pricingPlan->slug;

        $rawKey = trim((string) ($validated['activation_key'] ?? ''));

        $user = $request->user();
        $directeurRole = Role::query()->where('slug', 'directeur')->firstOrFail();

        $school = DB::transaction(function () use ($validated, $rawKey, $user, $directeurRole) {
            $activationKey = $rawKey !== ''
                ? ActivationKey::query()->where('key', $rawKey)->lockForUpdate()->first()
                : null;

            if ($rawKey !== '' && (! $activationKey || $activationKey->status !== ActivationKey::STATUS_DISPONIBLE)) {
                throw ValidationException::withMessages([
                    'activation_key' => ["Cette clé d'activation est invalide ou déjà utilisée."],
                ]);
            }

            $school = School::query()->create([
                ...collect($validated)->except('activation_key')->all(),
                'status' => School::STATUS_ACTIVE,
                'academic_period_type' => Season::TYPE_TRIMESTRE,
                // Une clé d'activation valide donne un accès illimité ; sans
                // clé, l'école démarre un essai gratuit limité dans le temps.
                'trial_ends_at' => $activationKey ? null : now()->addDays(self::TRIAL_DAYS),
            ]);

            SchoolUser::query()->create([
                'school_id' => $school->id,
                'user_id' => $user->id,
                'role_id' => $directeurRole->id,
                'status' => SchoolUser::STATUS_ACTIVE,
            ]);

            $user->update(['current_school_id' => $school->id]);

            $this->createDefaultSchoolYear($school);

            if ($activationKey) {
                $activationKey->update([
                    'status' => ActivationKey::STATUS_UTILISEE,
                    'school_id' => $school->id,
                    'used_at' => now(),
                ]);
            }

            return $school;
        });

        return response()->json($school->load('country'), 201);
    }

    /**
     * Détail complet d'une école pour l'écran de paramètres (le directeur
     * uniquement, les autres rôles n'ont pas à modifier ces informations).
     */
    public function show(Request $request, School $school)
    {
        $this->authorizeDirecteur($request, $school);

        return response()->json($school->load('country'));
    }

    public function update(Request $request, School $school)
    {
        $this->authorizeDirecteur($request, $school);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'logo' => ['nullable', 'image', 'max:2048'],
            'slogan' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            'language' => ['required', 'in:'.School::LANGUAGE_FR.','.School::LANGUAGE_EN],
            'currency' => ['nullable', 'string', 'max:10'],
            'academic_period_type' => ['nullable', 'in:'.Season::TYPE_TRIMESTRE.','.Season::TYPE_SEMESTRE],
        ]);

        if ($request->hasFile('logo')) {
            if ($school->logo) {
                Storage::disk('public')->delete($school->logo);
            }
            $validated['logo'] = $request->file('logo')->store('schools/logos', 'public');
        } else {
            unset($validated['logo']);
        }

        if (! empty($validated['academic_period_type']) && $validated['academic_period_type'] !== $school->academic_period_type) {
            $this->changeAcademicPeriodType($school, $validated['academic_period_type']);
        }

        $school->update($validated);

        return response()->json($school->load('country'));
    }

    /**
     * On ne régénère les trimestres/semestres de l'année en cours que si
     * aucune note n'y est encore rattachée : sinon on risquerait de
     * supprimer des notes déjà saisies (cascade sur seasons -> grades).
     */
    private function changeAcademicPeriodType(School $school, string $newType): void
    {
        $currentYear = $school->schoolYears()->where('is_current', true)->first();

        if (! $currentYear) {
            return;
        }

        $seasonIds = $currentYear->seasons()->pluck('id');
        $hasGrades = Grade::query()->whereIn('season_id', $seasonIds)->exists();

        if ($hasGrades) {
            throw ValidationException::withMessages([
                'academic_period_type' => ["Impossible de changer ce réglage : des notes existent déjà pour l'année scolaire en cours."],
            ]);
        }

        $currentYear->seasons()->delete();
        $this->createSeasonsForYear($school, $currentYear, $newType);
    }

    public function switchTo(Request $request, School $school)
    {
        $belongs = $request->user()->schools()->where('schools.id', $school->id)->exists();

        if (! $belongs) {
            return response()->json(['message' => "Vous n'appartenez pas à cette école."], 403);
        }

        $request->user()->update(['current_school_id' => $school->id]);

        return response()->json($school->load('country'));
    }

    public function join(Request $request, School $school)
    {
        $validated = $request->validate([
            'role_id' => ['required', 'uuid', 'exists:roles,id'],
        ]);

        $this->guardAgainstRoleConflict($school, $request->user(), $validated['role_id']);

        $schoolUser = SchoolUser::query()->updateOrCreate(
            [
                'school_id' => $school->id,
                'user_id' => $request->user()->id,
            ],
            [
                'role_id' => $validated['role_id'],
                'status' => SchoolUser::STATUS_ACTIVE,
            ]
        );

        return response()->json($schoolUser->load('role', 'school'));
    }

    /**
     * La rentrée africaine se situe généralement en septembre : avant cette
     * date on considère qu'on est encore dans l'année scolaire précédente.
     */
    private function createDefaultSchoolYear(School $school): void
    {
        $now = Carbon::now();
        $startYear = $now->month >= 9 ? $now->year : $now->year - 1;

        $schoolYear = SchoolYear::query()->create([
            'school_id' => $school->id,
            'label' => "{$startYear}-".($startYear + 1),
            'start_date' => Carbon::create($startYear, 9, 1),
            'end_date' => Carbon::create($startYear + 1, 6, 30),
            'is_current' => true,
        ]);

        $this->createSeasonsForYear($school, $schoolYear, $school->academic_period_type);
    }
}
