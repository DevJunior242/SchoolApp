<?php

namespace Database\Seeders;

use App\Models\Level;
use App\Models\Section;
use Illuminate\Support\Str;
use Illuminate\Database\Seeder;
class SectionAndLevelSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
  public function run(): void
    {
        $structure = [
            [
                'section' => [
                    'name' => 'Maternelle',
                    'code' => 'MAT',
                ],
                'levels' => [
                    ['name' => 'Petite Section', 'code' => 'PS', 'order' => 1],
                    ['name' => 'Moyenne Section', 'code' => 'MS', 'order' => 2],
                    ['name' => 'Grande Section', 'code' => 'GS', 'order' => 3],
                ],
            ],
            [
                'section' => [
                    'name' => 'Primaire',
                    'code' => 'PRIM',
                ],
                'levels' => [
                    ['name' => 'Cours Préparatoire (CP)', 'code' => 'CP', 'order' => 1],
                    ['name' => 'Cours Élémentaire 1ère année (CE1)', 'code' => 'CE1', 'order' => 2],
                    ['name' => 'Cours Élémentaire 2ème année (CE2)', 'code' => 'CE2', 'order' => 3],
                    ['name' => 'Cours Moyen 1ère année (CM1)', 'code' => 'CM1', 'order' => 4],
                    ['name' => 'Cours Moyen 2ème année (CM2)', 'code' => 'CM2', 'order' => 5],
                ],
            ],
            [
                'section' => [
                    'name' => 'Collège / Post-Primaire',
                    'code' => 'COL',
                ],
                'levels' => [
                    ['name' => 'Sixième', 'code' => '6EME', 'order' => 1],
                    ['name' => 'Cinquième', 'code' => '5EME', 'order' => 2],
                    ['name' => 'Quatrième', 'code' => '4EME', 'order' => 3],
                    ['name' => 'Troisième', 'code' => '3EME', 'order' => 4],
                ],
            ],
            [
                'section' => [
                    'name' => 'Lycée / Secondaire',
                    'code' => 'LYC',
                ],
                'levels' => [
                    ['name' => 'Seconde', 'code' => '2NDE', 'order' => 1],
                    ['name' => 'Première', 'code' => '1ERE', 'order' => 2],
                    ['name' => 'Terminale', 'code' => 'TLE', 'order' => 3],
                ],
            ],
        ];

        foreach ($structure as $item) {
            $section = Section::firstOrCreate(
                ['code' => $item['section']['code']],
                [
                    'id' => (string) Str::uuid(),
                    'name' => $item['section']['name'],
                ]
            );

            foreach ($item['levels'] as $levelData) {
                Level::firstOrCreate(
                    [
                        'section_id' => $section->id,
                        'code' => $levelData['code'],
                    ],
                    [
                        'id' => (string) Str::uuid(),
                        'name' => $levelData['name'],
                        'order' => $levelData['order'],
                    ]
                );
            }
        }
    }
}
