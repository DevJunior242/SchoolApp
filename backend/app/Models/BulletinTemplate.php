<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modèle de bulletin d'une section. Les notes sont toujours enregistrées et
 * calculées sur 20 ; le barème (10 ou 20) ne change que l'affichage, et les
 * seuils (passage, distinctions) sont exprimés dans ce barème.
 */
class BulletinTemplate extends Model
{
    use HasUuids;

    const MODE_GRADE_COEFFICIENT = 'grade_coefficient';

    const MODE_TYPE_WEIGHTS = 'type_weights';

    const SCALES = [10, 20];

    const DISTINCTION_CONDITIONS = ['gte', 'lt'];

    /** Modèle « standard » : utilisé tant que l'école n'a rien réglé. */
    const DEFAULTS = [
        'grading_scale' => 20,
        'calculation_mode' => self::MODE_GRADE_COEFFICIENT,
        'evaluation_weights' => [
            Grade::TYPE_INTERROGATION => 1,
            Grade::TYPE_DEVOIR => 1,
            Grade::TYPE_COMPOSITION => 2,
            Grade::TYPE_EXAMEN => 3,
        ],
        'pass_threshold' => null,
        'pass_label' => 'Admis(e) en classe supérieure',
        'fail_label' => 'Doit redoubler',
        // Évaluées dans l'ordre : la première qui correspond est retenue.
        'distinctions' => [
            ['label' => 'Félicitations', 'condition' => 'gte', 'value' => 16],
            ['label' => 'Encouragements', 'condition' => 'gte', 'value' => 14],
            ['label' => 'Tableau d’honneur', 'condition' => 'gte', 'value' => 12],
            ['label' => 'Avertissement (travail)', 'condition' => 'lt', 'value' => 8],
        ],
        'show_teacher' => true,
        'show_coefficient' => true,
        'show_class_average' => true,
        'show_min_max' => false,
        'show_subject_rank' => false,
        'show_rank' => true,
        'show_appreciations' => true,
        'show_attendance' => true,
        'header_lines' => [],
        'motto' => null,
        'signatures' => ['Le titulaire', 'Le directeur', 'Le parent'],
    ];

    protected $fillable = [
        'school_id', 'section_id', 'grading_scale', 'calculation_mode', 'evaluation_weights',
        'pass_threshold', 'pass_label', 'fail_label', 'distinctions',
        'show_teacher', 'show_coefficient', 'show_class_average', 'show_min_max',
        'show_subject_rank', 'show_rank', 'show_appreciations', 'show_attendance',
        'header_lines', 'motto', 'signatures',
    ];

    protected function casts(): array
    {
        return [
            'grading_scale' => 'integer',
            'evaluation_weights' => 'array',
            'pass_threshold' => 'float',
            'distinctions' => 'array',
            'show_teacher' => 'boolean',
            'show_coefficient' => 'boolean',
            'show_class_average' => 'boolean',
            'show_min_max' => 'boolean',
            'show_subject_rank' => 'boolean',
            'show_rank' => 'boolean',
            'show_appreciations' => 'boolean',
            'show_attendance' => 'boolean',
            'header_lines' => 'array',
            'signatures' => 'array',
        ];
    }

    /** Modèle de la section, ou modèle standard (non enregistré) s'il n'existe pas. */
    public static function forSection(string $schoolId, ?string $sectionId): self
    {
        $template = $sectionId
            ? self::query()->where('school_id', $schoolId)->where('section_id', $sectionId)->first()
            : null;

        return $template ?? new self(['school_id' => $schoolId, 'section_id' => $sectionId] + self::DEFAULTS);
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }

    /** Seuil de passage dans le barème (moitié du barème par défaut). */
    public function passThreshold(): float
    {
        return $this->pass_threshold ?? $this->grading_scale / 2;
    }

    /** Poids d'une note selon le mode de calcul. */
    public function weightFor(Grade $grade): float
    {
        if ($this->calculation_mode === self::MODE_TYPE_WEIGHTS) {
            return (float) ($this->evaluation_weights[$grade->evaluation_type] ?? 1);
        }

        return (float) $grade->coefficient;
    }

    /** Première distinction dont la condition est remplie (valeurs dans le barème). */
    public function distinctionFor(?float $average): ?string
    {
        if ($average === null) {
            return null;
        }

        foreach ($this->distinctions ?? [] as $distinction) {
            $value = (float) ($distinction['value'] ?? 0);
            $matches = ($distinction['condition'] ?? 'gte') === 'lt' ? $average < $value : $average >= $value;

            if ($matches) {
                return $distinction['label'] ?? null;
            }
        }

        return null;
    }

    /** Champs de présentation envoyés avec chaque bulletin. */
    public function presentation(): array
    {
        return $this->only([
            'grading_scale', 'show_teacher', 'show_coefficient', 'show_class_average',
            'show_min_max', 'show_subject_rank', 'show_rank', 'show_appreciations', 'show_attendance',
            'header_lines', 'motto', 'signatures',
        ]);
    }
}
