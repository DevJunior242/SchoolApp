<?php

namespace Database\Seeders;

use App\Models\Country;
use App\Models\Level;
use Illuminate\Database\Seeder;

class LevelSeeder extends Seeder
{
    private const LEVELS = [
        ['name' => 'CP1', 'cycle' => Level::CYCLE_PRIMAIRE, 'order' => 1],
        ['name' => 'CP2', 'cycle' => Level::CYCLE_PRIMAIRE, 'order' => 2],
        ['name' => 'CE1', 'cycle' => Level::CYCLE_PRIMAIRE, 'order' => 3],
        ['name' => 'CE2', 'cycle' => Level::CYCLE_PRIMAIRE, 'order' => 4],
        ['name' => 'CM1', 'cycle' => Level::CYCLE_PRIMAIRE, 'order' => 5],
        ['name' => 'CM2', 'cycle' => Level::CYCLE_PRIMAIRE, 'order' => 6],
        ['name' => '6ème', 'cycle' => Level::CYCLE_1ER_CYCLE, 'order' => 7],
        ['name' => '5ème', 'cycle' => Level::CYCLE_1ER_CYCLE, 'order' => 8],
        ['name' => '4ème', 'cycle' => Level::CYCLE_1ER_CYCLE, 'order' => 9],
        ['name' => '3ème', 'cycle' => Level::CYCLE_1ER_CYCLE, 'order' => 10],
        ['name' => '2nde', 'cycle' => Level::CYCLE_2ND_CYCLE, 'order' => 11],
        ['name' => '1ère', 'cycle' => Level::CYCLE_2ND_CYCLE, 'order' => 12],
        ['name' => 'Terminale', 'cycle' => Level::CYCLE_2ND_CYCLE, 'order' => 13],
    ];

    public function run(): void
    {
        Country::all()->each(function (Country $country) {
            foreach (self::LEVELS as $level) {
                Level::query()->firstOrCreate(
                    ['country_id' => $country->id, 'name' => $level['name']],
                    ['cycle' => $level['cycle'], 'order' => $level['order']]
                );
            }
        });
    }
}
