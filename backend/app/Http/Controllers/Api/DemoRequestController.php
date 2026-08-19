<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DemoRequest;
use App\Models\Role;
use App\Models\User;
use App\Notifications\DemoRequestNotification;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class DemoRequestController extends Controller
{
    /**
     * Formulaire public (pas de compte requis) accessible depuis la
     * homepage : un visiteur demande une démo de la plateforme.
     */
    public function store(Request $request)
    {
        // Honeypot anti-bot : champ caché côté formulaire, invisible et non
        // rempli par un humain. On répond un faux succès pour ne pas
        // signaler au bot que sa requête a été détectée.
        if ($request->filled('company')) {
            return response()->json(['message' => 'Demande envoyée.'], 201);
        }

        $validated = $request->validate([
            'school_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^[0-9+\s().-]{6,30}$/'],
            // Un message trop court n'aide pas le suivi commercial, et le
            // motif interdit les URLs — le vecteur de spam le plus courant
            // sur ce type de formulaire.
            'description' => ['required', 'string', 'min:10', 'max:1000', 'regex:/^(?!.*(https?:\/\/|www\.)).*$/is'],
        ], [
            'phone.regex' => 'Numéro de téléphone invalide.',
            'description.regex' => 'Le message ne doit pas contenir de lien. Décrivez simplement votre besoin.',
        ]);

        if (empty($validated['email']) && empty($validated['phone'])) {
            throw ValidationException::withMessages([
                'email' => ['Indiquez au moins un email ou un numéro de téléphone pour être recontacté.'],
            ]);
        }

        $demoRequest = DemoRequest::query()->create([
            ...$validated,
            'status' => DemoRequest::STATUS_PENDING,
        ]);

        $this->notifySuperAdmins($demoRequest);

        return response()->json($demoRequest, 201);
    }

    public function index(Request $request)
    {
        return response()->json(
            DemoRequest::query()
                ->when($request->query('search'), fn ($query, $search) => $query
                    ->where(fn ($q) => $q
                        ->where('school_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%")))
                ->latest('created_at')
                ->paginate($request->integer('per_page', 20))
        );
    }

    public function updateStatus(Request $request, DemoRequest $demoRequest)
    {
        $validated = $request->validate([
            'status' => ['required', 'integer', 'in:'.DemoRequest::STATUS_PENDING.','.DemoRequest::STATUS_CONTACTED.','.DemoRequest::STATUS_CLOSED],
        ]);

        $demoRequest->update($validated);

        return response()->json($demoRequest);
    }

    private function notifySuperAdmins(DemoRequest $demoRequest): void
    {
        $superAdminRoleId = Role::query()->where('slug', 'superadmin')->value('id');

        User::query()->where('role_id', $superAdminRoleId)->get()->each(
            fn (User $user) => $user->notify(new DemoRequestNotification($demoRequest))
        );
    }
}
