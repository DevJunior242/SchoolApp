<?php

namespace App\Http\Requests\Auth;

use App\Rules\StrongPassword;
use App\Rules\ValidTurnstileToken;
use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => is_string($this->email) ? strtolower(trim($this->email)) : $this->email,
            'fullname' => is_string($this->fullname) ? trim($this->fullname) : $this->fullname,
            'phone' => is_string($this->phone) ? trim($this->phone) : $this->phone,
        ]);
    }

    public function rules(): array
    {
        return [
            'fullname' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'phone:INTERNATIONAL'],
            'password' => ['required', 'string', 'max:255', new StrongPassword, 'confirmed'],
            'language' => ['nullable', 'string', 'size:2'],
            'terms_accepted' => ['required', 'accepted'],
            // 'turnstile_token' => [new ValidTurnstileToken],
        ];
    }
}