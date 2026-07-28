<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\School;
use App\Models\SchoolYear;
use App\Models\Season;
use Illuminate\Support\Carbon;

trait GeneratesSeasons
{
    /**
     * Découpe l'année scolaire en 3 trimestres ou 2 semestres selon le
     * réglage de l'école (chaque pays a sa propre convention).
     */
    private function createSeasonsForYear(School $school, SchoolYear $schoolYear, string $periodType): void
    {
        $startYear = $schoolYear->start_date->year;

        $periods = $periodType === Season::TYPE_SEMESTRE
            ? [
                ['label' => 'Semestre 1', 'start' => Carbon::create($startYear, 9, 1), 'end' => Carbon::create($startYear + 1, 1, 31)],
                ['label' => 'Semestre 2', 'start' => Carbon::create($startYear + 1, 2, 1), 'end' => Carbon::create($startYear + 1, 6, 30)],
            ]
            : [
                ['label' => 'Trimestre 1', 'start' => Carbon::create($startYear, 9, 1), 'end' => Carbon::create($startYear, 12, 20)],
                ['label' => 'Trimestre 2', 'start' => Carbon::create($startYear + 1, 1, 5), 'end' => Carbon::create($startYear + 1, 3, 31)],
                ['label' => 'Trimestre 3', 'start' => Carbon::create($startYear + 1, 4, 1), 'end' => Carbon::create($startYear + 1, 6, 30)],
            ];

        foreach ($periods as $order => $period) {
            Season::query()->create([
                'school_id' => $school->id,
                'school_year_id' => $schoolYear->id,
                'type' => $periodType,
                'label' => $period['label'],
                'order' => $order + 1,
                'start_date' => $period['start'],
                'end_date' => $period['end'],
            ]);
        }
    }
}
