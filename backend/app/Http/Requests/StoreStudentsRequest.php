<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStudentsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'students' => ['required', 'array', 'min:1'],
            'students.*.fullname' => ['required', 'string', 'max:255', "regex:/^[\p{L}\p{M}0-9 .,_'’()\/-]+$/u"],
            'students.*.date_of_birth' => ['required', 'date', 'before:today'],
            'students.*.gender' => ['required', 'string', 'max:10', "regex:/^[\p{L}\p{M} -]+$/u"],
            'students.*.birth_place' => ['nullable', 'string', 'max:255', "regex:/^[\p{L}\p{M}0-9 .,_'’()\/-]+$/u"],
            'students.*.blood_type' => ['nullable', 'string', 'max:10', 'regex:/^[A-Za-z0-9+-]+$/'],
            'students.*.medical_notes' => ['nullable', 'string'],

            'students.*.class_id' => ['required', 'uuid', 'exists:classes,id'],
            'students.*.matricule' => ['nullable', 'string', 'max:50', 'regex:/^[A-Za-z0-9._\/-]+$/'],
            'students.*.previous_school' => ['nullable', 'string', 'max:255', "regex:/^[\p{L}\p{M}0-9 .,_'’()\/-]+$/u"],

            'students.*.student_email' => ['nullable', 'email'],

            'students.*.parent_fullname' => ['nullable', 'string', 'max:255', "regex:/^[\p{L}\p{M}0-9 .,_'’()\/-]+$/u"],
            'students.*.parent_email' => ['nullable', 'required_without:students.*.parent_phone', 'email'],
            'students.*.parent_phone' => ['nullable', 'required_without:students.*.parent_email', 'string', 'max:30', 'regex:/^[0-9+().\/ -]+$/'],
            'students.*.parent_relationship' => ['required', 'string', 'max:30', "regex:/^[\p{L}\p{M} .,_'’()\/-]+$/u"],
        ];
    }

    public function messages(): array
    {
        return [
            'students.*.parent_email.required_without' => 'Renseignez l’email ou le téléphone du parent.',
            'students.*.parent_email.email' => 'L’email du parent doit être valide.',
            'students.*.parent_phone.required_without' => 'Renseignez le téléphone ou l’email du parent.',
            'students.*.parent_relationship.required' => 'Indiquez le lien entre le parent et l’élève.',
            'students.*.fullname.regex' => 'Le nom de l’élève contient des caractères non autorisés.',
            'students.*.parent_phone.regex' => 'Le numéro de téléphone contient des caractères non autorisés.',
        ];
    }
}
