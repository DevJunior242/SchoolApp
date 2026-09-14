<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\Subject;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    public function index(Request $request, ?School $school = null)
    {
        $query = Subject::query()->orderBy('name');

        if ($school) {
            $query->where(function ($query) use ($school) {
                $query->where('school_id', $school->id)
                    ->orWhereNull('school_id');
            });
        }

        return response()->json($query->get());
    }

    public function store(Request $request, School $school)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
        ]);

        $subject = Subject::query()->create([
            'school_id' => $school->id,
            'name' => $validated['name'],
            'code' => $validated['code'] ?? null,
        ]);

        return response()->json($subject, 201);
    }
}
