<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassSubjectTeacher;
use App\Models\School;
use App\Models\SchoolUser;
use Illuminate\Http\Request;

class AssignmentController extends Controller
{
    /**
     * Les classes+matières qu'enseigne le professeur connecté dans cette
     * école (vue "mes cours" côté prof).
     */
    public function mine(Request $request, School $school)
    {
        $belongs = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->exists();

        abort_unless($belongs, 403, "Vous n'appartenez pas à cette école.");

        return response()->json(
            ClassSubjectTeacher::query()
                ->where('user_id', $request->user()->id)
                ->whereHas('schoolClass', fn ($query) => $query->where('school_id', $school->id))
                ->with(['subject', 'schoolClass.level'])
                ->get()
        );
    }

    /**
     * Détail d'un cours (matière + classe), pour donner du contexte aux
     * pages de saisie des notes/absences liées à un assignment précis.
     */
    public function show(Request $request, ClassSubjectTeacher $assignment)
    {
        $userId = $request->user()->id;

        if ($assignment->user_id !== $userId) {
            $isDirecteur = SchoolUser::query()
                ->where('school_id', $assignment->schoolClass->school_id)
                ->where('user_id', $userId)
                ->whereHas('role', fn ($query) => $query->where('slug', 'directeur'))
                ->exists();

            abort_unless($isDirecteur, 403, "Vous n'êtes pas autorisé à consulter ce cours.");
        }

        return response()->json($assignment->load('subject', 'schoolClass.level'));
    }
}
