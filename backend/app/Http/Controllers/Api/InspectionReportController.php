<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\ValidatesSchoolSection;
use App\Http\Controllers\Controller;
use App\Models\ClassStudent;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolStudent;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Rapport des effectifs pour l'inspection : par niveau et par classe,
 * garçons / filles / total, dont PDI, dont handicap (par type), dont
 * redoublants. Uniquement des chiffres, jamais de noms.
 *
 * Version standard en attendant le formulaire officiel : ajuster les
 * colonnes ici et dans pages/InspectionReportPage.jsx quand on l'aura.
 */
class InspectionReportController extends Controller
{
    use AuthorizesSchoolDirecteur, ValidatesSchoolSection;

    public function show(Request $request, School $school)
    {
        $this->authorizeRoles(
            $request,
            $school,
            Student::SENSITIVE_VIEWER_ROLES,
            'Seuls l’administrateur et le secrétariat peuvent produire le rapport pour l’inspection.'
        );
        $sectionIds = $this->restrictedSectionIds($request, $school);

        $classes = SchoolClass::query()
            ->where('school_id', $school->id)
            ->whereHas('schoolYear', fn ($query) => $query->where('is_current', true))
            ->when($sectionIds, fn ($query, $ids) => $query->whereHas(
                'level',
                fn ($levelQuery) => $levelQuery->whereIn('section_id', $ids)
            ))
            ->with(['level.section', 'schoolYear'])
            ->get();

        $activeStudentIds = SchoolStudent::query()
            ->where('school_id', $school->id)
            ->where('status', SchoolStudent::STATUS_ACTIVE)
            ->pluck('student_id')
            ->flip();

        $enrollments = ClassStudent::query()
            ->whereIn('class_id', $classes->pluck('id'))
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->with('student')
            ->get()
            ->filter(fn (ClassStudent $enrollment) => $enrollment->student && $activeStudentIds->has($enrollment->student_id))
            ->groupBy('class_id');

        $levels = $classes
            ->groupBy('level_id')
            ->map(function (Collection $levelClasses) use ($enrollments) {
                $level = $levelClasses->first()->level;
                $rows = $levelClasses
                    ->sortBy('name', SORT_NATURAL)
                    ->map(fn (SchoolClass $class) => $this->row($class->name, $enrollments->get($class->id, collect())))
                    ->values();

                return [
                    'section' => $level?->section?->name,
                    'section_order' => $level?->section?->name ?? '',
                    'level' => $level?->name,
                    'level_order' => $level?->order ?? 0,
                    'classes' => $rows->all(),
                    'total' => $this->row(
                        'Total '.$level?->name,
                        $levelClasses->flatMap(fn (SchoolClass $class) => $enrollments->get($class->id, collect()))
                    ),
                ];
            })
            ->sortBy([['section_order', 'asc'], ['level_order', 'asc']])
            ->map(fn (array $level) => collect($level)->except(['section_order', 'level_order'])->all())
            ->values();

        return response()->json([
            'school_name' => $school->name,
            'school_year' => $classes->first()?->schoolYear?->label,
            'generated_at' => now()->toISOString(),
            'disability_types' => Student::DISABILITY_TYPES,
            'levels' => $levels->all(),
            'total' => $this->row('Total école', $enrollments->flatten(1)),
        ]);
    }

    /**
     * @param  Collection<int, ClassStudent>  $enrollments
     */
    private function row(string $label, Collection $enrollments): array
    {
        $count = fn (callable $filter) => $this->byGender($enrollments->filter($filter));

        $types = [];
        foreach (array_keys(Student::DISABILITY_TYPES) as $type) {
            $types[$type] = $count(fn (ClassStudent $e) => $e->student->has_disability && $e->student->disability_type === $type);
        }
        // Handicap déclaré sans type précisé : compté à part pour que la
        // somme des types reste égale au total « handicap ».
        $types['non_precise'] = $count(fn (ClassStudent $e) => $e->student->has_disability && ! $e->student->disability_type);

        return [
            'label' => $label,
            'effectif' => $this->byGender($enrollments),
            'pdi' => $count(fn (ClassStudent $e) => $e->student->is_displaced),
            'handicap' => $count(fn (ClassStudent $e) => $e->student->has_disability),
            'handicap_types' => $types,
            'redoublants' => $count(fn (ClassStudent $e) => $e->is_repeating),
        ];
    }

    /**
     * @param  Collection<int, ClassStudent>  $enrollments
     * @return array{garcons: int, filles: int, total: int}
     */
    private function byGender(Collection $enrollments): array
    {
        $gender = fn (ClassStudent $e) => strtoupper(mb_substr(trim((string) $e->student->gender), 0, 1));

        return [
            'garcons' => $enrollments->filter(fn ($e) => in_array($gender($e), ['M', 'G', 'H'], true))->count(),
            'filles' => $enrollments->filter(fn ($e) => $gender($e) === 'F')->count(),
            'total' => $enrollments->count(),
        ];
    }
}
