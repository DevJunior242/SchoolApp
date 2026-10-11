<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\ValidatesSchoolSection;
use App\Http\Controllers\Controller;
use App\Models\BulletinTemplate;
use App\Models\School;
use App\Models\Section;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Modèles de bulletin, un par section active de l'école, réglés par
 * l'administrateur (un administrateur de section ne règle que les siennes).
 */
class BulletinTemplateController extends Controller
{
    use AuthorizesSchoolDirecteur, ValidatesSchoolSection;

    public function index(Request $request, School $school)
    {
        $this->authorizeRoles($request, $school, ['admin'], 'Seul l’administrateur peut régler les bulletins.');
        $sectionIds = $this->restrictedSectionIds($request, $school);

        $sections = $school->sections()
            ->wherePivot('active', true)
            ->when($sectionIds, fn ($query, $ids) => $query->whereIn('sections.id', $ids))
            ->orderBy('name')
            ->get();

        return response()->json([
            'defaults' => BulletinTemplate::DEFAULTS,
            'evaluation_types' => array_keys(BulletinTemplate::DEFAULTS['evaluation_weights']),
            'sections' => $sections->map(fn (Section $section) => [
                'section' => ['id' => $section->id, 'name' => $section->name],
                'customized' => BulletinTemplate::query()
                    ->where('school_id', $school->id)
                    ->where('section_id', $section->id)
                    ->exists(),
                'template' => BulletinTemplate::forSection($school->id, $section->id)
                    ->only(array_keys(BulletinTemplate::DEFAULTS)),
            ])->values(),
        ]);
    }

    public function update(Request $request, School $school, Section $section)
    {
        $this->authorizeRoles($request, $school, ['admin'], 'Seul l’administrateur peut régler les bulletins.');
        $sectionIds = $this->restrictedSectionIds($request, $school);
        abort_if($sectionIds && ! in_array($section->id, $sectionIds, true), 403, "Vous n'avez pas accès à cette section.");
        abort_unless(
            $school->sections()->wherePivot('active', true)->where('sections.id', $section->id)->exists(),
            404
        );

        $scale = (int) $request->input('grading_scale', 20);
        $validated = $request->validate([
            'grading_scale' => ['required', Rule::in(BulletinTemplate::SCALES)],
            'calculation_mode' => ['required', Rule::in([BulletinTemplate::MODE_GRADE_COEFFICIENT, BulletinTemplate::MODE_TYPE_WEIGHTS])],
            'evaluation_weights' => ['nullable', 'array'],
            'evaluation_weights.*' => ['numeric', 'min:0', 'max:10'],
            'pass_threshold' => ['nullable', 'numeric', 'min:0', 'max:'.$scale],
            'pass_label' => ['required', 'string', 'max:100'],
            'fail_label' => ['required', 'string', 'max:100'],
            'distinctions' => ['nullable', 'array', 'max:10'],
            'distinctions.*.label' => ['required', 'string', 'max:60'],
            'distinctions.*.condition' => ['required', Rule::in(BulletinTemplate::DISTINCTION_CONDITIONS)],
            'distinctions.*.value' => ['required', 'numeric', 'min:0', 'max:'.$scale],
            'show_teacher' => ['boolean'],
            'show_coefficient' => ['boolean'],
            'show_class_average' => ['boolean'],
            'show_min_max' => ['boolean'],
            'show_subject_rank' => ['boolean'],
            'show_rank' => ['boolean'],
            'show_appreciations' => ['boolean'],
            'show_attendance' => ['boolean'],
            'header_lines' => ['nullable', 'array', 'max:6'],
            'header_lines.*' => ['nullable', 'string', 'max:120'],
            'motto' => ['nullable', 'string', 'max:150'],
            'signatures' => ['nullable', 'array', 'max:4'],
            'signatures.*' => ['nullable', 'string', 'max:60'],
        ], [
            'pass_threshold.max' => 'Le seuil de passage ne peut pas dépasser le barème ('.$scale.').',
            'distinctions.*.value.max' => 'Un seuil de distinction ne peut pas dépasser le barème ('.$scale.').',
        ]);

        // Seuls les types d'évaluation connus sont gardés.
        $weights = collect($validated['evaluation_weights'] ?? [])
            ->only(array_keys(BulletinTemplate::DEFAULTS['evaluation_weights']))
            ->map(fn ($weight) => (float) $weight)
            ->all();

        $template = BulletinTemplate::query()->updateOrCreate(
            ['school_id' => $school->id, 'section_id' => $section->id],
            [
                ...$validated,
                'evaluation_weights' => $weights ?: BulletinTemplate::DEFAULTS['evaluation_weights'],
                'distinctions' => array_values($validated['distinctions'] ?? []),
                'header_lines' => array_values(array_filter($validated['header_lines'] ?? [], fn ($line) => filled($line))),
                'signatures' => array_values(array_filter($validated['signatures'] ?? [], fn ($line) => filled($line))),
            ],
        );

        return response()->json($template->only(array_keys(BulletinTemplate::DEFAULTS)));
    }
}
