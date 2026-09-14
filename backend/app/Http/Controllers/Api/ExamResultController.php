<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\ExamCandidate;
use App\Models\ExamResult;
use App\Models\ExamResultDetail;
use App\Models\School;

class ExamResultController extends Controller
{
    public function index(School $school, Exam $exam)
    {
        abort_unless($exam->school_id === $school->id, 404);

        return response()->json(
            $exam->examResults()
                ->with(['examCandidate.student', 'examCandidate.schoolClass.level.section'])
                ->orderBy('rank')
                ->get()
        );
    }

    public function show(School $school, Exam $exam, ExamCandidate $candidate)
    {
        abort_unless($exam->school_id === $school->id, 404);
        abort_unless($candidate->exam_id === $exam->id, 404);

        $result = ExamResult::query()
            ->where('exam_id', $exam->id)
            ->where('exam_candidate_id', $candidate->id)
            ->with(['examResultDetails.examSubject.subject', 'examCandidate.student'])
            ->firstOrFail();

        return response()->json($result);
    }

    public function calculate(School $school, Exam $exam)
    {
        abort_unless($exam->school_id === $school->id, 404);

        $candidates = $exam->examCandidates()->with(['examCandidateSubjects.examSubject'])->get();

        foreach ($candidates as $candidate) {
            $record = ExamResult::query()->firstOrNew([
                'exam_id' => $exam->id,
                'exam_candidate_id' => $candidate->id,
            ]);

            $totalScore = 0;
            $weightedTotal = 0;
            $details = [];

            foreach ($exam->examSubjects()->with('subject')->get() as $examSubject) {
                $candidateSubject = $candidate->examCandidateSubjects
                    ->first(fn($item) => $item->exam_subject_id === $examSubject->id);

                $score = $candidateSubject?->score ?? 0;
                $coefficient = $examSubject->coefficient ?? 1;

                $weightedTotal += $score * $coefficient;
                $totalScore += $coefficient;

                $details[] = [
                    'exam_subject_id' => $examSubject->id,
                    'subject_score' => $score,
                    'coefficient' => $coefficient,
                    'is_absent' => (bool) ($candidateSubject?->is_absent ?? false),
                    'remark' => $candidateSubject?->remark ?? null,
                ];
            }

            $average = $totalScore > 0 ? round($weightedTotal / $totalScore, 2) : 0;

            $record->fill([
                'total_score' => $weightedTotal,
                'average' => $average,
                'status' => $average >= 10 ? 'admis' : 'ajourne',
                'is_validated' => false,
            ]);
            $record->save();

            $record->examResultDetails()->delete();
            foreach ($details as $detail) {
                ExamResultDetail::query()->create([
                    'exam_result_id' => $record->id,
                    'exam_subject_id' => $detail['exam_subject_id'],
                    'subject_score' => $detail['subject_score'],
                    'coefficient' => $detail['coefficient'],
                    'is_absent' => $detail['is_absent'],
                    'remark' => $detail['remark'],
                ]);
            }
        }

        $results = ExamResult::query()
            ->where('exam_id', $exam->id)
            ->orderByDesc('average')
            ->orderBy('id')
            ->get();

        $rank = 1;
        foreach ($results as $result) {
            $result->update(['rank' => $rank]);
            $rank++;
        }

        return response()->json(
            ExamResult::query()
                ->where('exam_id', $exam->id)
                ->with(['examCandidate.student', 'examCandidate.schoolClass.level.section'])
                ->orderBy('rank')
                ->get()
        );
    }

    public function validate(School $school, Exam $exam)
    {
        abort_unless($exam->school_id === $school->id, 404);

        $updated = ExamResult::query()
            ->where('exam_id', $exam->id)
            ->update([
                'is_validated' => true,
                'validated_at' => now(),
                'status' => 'valide',
            ]);

        return response()->json([
            'message' => sprintf('%d résultat(s) validé(s).', $updated),
        ]);
    }
}
