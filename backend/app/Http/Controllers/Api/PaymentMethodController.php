<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use App\Models\School;
use App\Models\SchoolUser;
use Illuminate\Http\Request;

class PaymentMethodController extends Controller
{
    use AuthorizesSchoolDirecteur;

    public function index(Request $request, School $school)
    {
        $this->authorizeMember($request, $school);

        return response()->json(
            PaymentMethod::query()
                ->where('school_id', $school->id)
                ->where('is_active', true)
                ->get()
        );
    }

    public function store(Request $request, School $school)
    {
        $this->authorizeRoles($request, $school, ['directeur', 'comptable'], "Seuls le directeur et le comptable peuvent gérer les moyens de paiement.");

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'number' => ['nullable', 'string', 'max:50'],
            'instructions' => ['nullable', 'string'],
        ]);

        $method = PaymentMethod::query()->create([...$validated, 'school_id' => $school->id]);

        return response()->json($method, 201);
    }

    public function update(Request $request, School $school, PaymentMethod $paymentMethod)
    {
        $this->authorizeRoles($request, $school, ['directeur', 'comptable'], "Seuls le directeur et le comptable peuvent gérer les moyens de paiement.");
        abort_if($paymentMethod->school_id !== $school->id, 404);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'number' => ['nullable', 'string', 'max:50'],
            'instructions' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $paymentMethod->update($validated);

        return response()->json($paymentMethod);
    }

    public function destroy(Request $request, School $school, PaymentMethod $paymentMethod)
    {
        $this->authorizeRoles($request, $school, ['directeur', 'comptable'], "Seuls le directeur et le comptable peuvent gérer les moyens de paiement.");
        abort_if($paymentMethod->school_id !== $school->id, 404);

        $paymentMethod->delete();

        return response()->json(status: 204);
    }

    private function authorizeMember(Request $request, School $school): void
    {
        $belongs = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->exists();

        abort_unless($belongs, 403, "Vous n'appartenez pas à cette école.");
    }
}
