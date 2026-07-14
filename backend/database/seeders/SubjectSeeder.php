<?php

namespace Database\Seeders;

use App\Models\Subject;
use Illuminate\Database\Seeder;

class SubjectSeeder extends Seeder
{
    public function run(): void
    {
        $subjects = [
            ['name' => 'Mathématiques', 'code' => 'MATH'],
            ['name' => 'Français', 'code' => 'FR'],
            ['name' => 'Anglais', 'code' => 'ANG'],
            ['name' => 'Sciences de la Vie et de la Terre', 'code' => 'SVT'],
            ['name' => 'Physique-Chimie', 'code' => 'PC'],
            ['name' => 'Histoire-Géographie', 'code' => 'HG'],
            ['name' => 'Éducation Physique et Sportive', 'code' => 'EPS'],
            ['name' => 'Philosophie', 'code' => 'PHILO'],
            ['name' => 'Arts Plastiques', 'code' => 'ARTS'],
            ['name' => 'Éducation Civique et Morale', 'code' => 'ECM'],
        ];

        foreach ($subjects as $subject) {
            Subject::query()->firstOrCreate(['code' => $subject['code']], $subject);
        }
    }
}
