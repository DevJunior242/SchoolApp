<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivationKey;
use App\Models\EnrollmentRequest;
use App\Models\School;
use App\Models\User;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    /**
     * Chiffres clés pour le tableau de bord du superadmin de la plateforme
     * (toutes écoles confondues, pas une école en particulier).
     */
    public function stats()
    {
        return response()->json([
            'schools_count' => School::query()->count(),
            'schools_active_count' => School::query()->where('status', School::STATUS_ACTIVE)->count(),
            'users_count' => User::query()->count(),
            'activation_keys' => [
                'disponible' => ActivationKey::query()->where('status', ActivationKey::STATUS_DISPONIBLE)->count(),
                'utilisee' => ActivationKey::query()->where('status', ActivationKey::STATUS_UTILISEE)->count(),
                'revoquee' => ActivationKey::query()->where('status', ActivationKey::STATUS_REVOQUEE)->count(),
            ],
            'enrollment_requests_pending_count' => EnrollmentRequest::query()
                ->where('status', EnrollmentRequest::STATUS_PENDING)
                ->count(),
        ]);
    }

    /**
     * Liste de toutes les écoles de la plateforme, actives ou non (contrairement
     * à GET /schools qui ne montre que les écoles actives au grand public).
     */
    public function schools(Request $request)
    {
        return response()->json(
            School::query()
                ->with('country')
                ->when(
                    $request->query('search'),
                    fn ($query, $search) => $query->where('name', 'like', "%{$search}%")
                )
                ->latest('created_at')
                ->paginate($request->integer('per_page', 20))
        );
    }

    /**
     * Permet au superadmin de désactiver une école (litige, abus, impayé...)
     * sans avoir à supprimer ses données, et de la réactiver ensuite.
     */
    public function toggleSchoolStatus(School $school)
    {
        $school->update([
            'status' => $school->status === School::STATUS_ACTIVE
                ? School::STATUS_INACTIVE
                : School::STATUS_ACTIVE,
        ]);

        return response()->json($school->load('country'));
    }
}
