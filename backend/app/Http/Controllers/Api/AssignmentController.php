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
}
