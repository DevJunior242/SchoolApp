<?php

namespace Database\Seeders;

use App\Models\School;
use App\Models\Country;
use Illuminate\Database\Seeder;

class SchoolDiscoveryDemoSeeder extends Seeder
{
    public function run(): void
    {
        $schools = [
            ['name' => 'École Horizon Test', 'iso_code' => 'CIV', 'city' => 'Abidjan'],
            ['name' => 'Groupe Scolaire Les Palmiers Test', 'iso_code' => 'CIV', 'city' => 'Bouaké'],
            ['name' => 'Institut Baobab Test', 'iso_code' => 'SEN', 'city' => 'Dakar'],
            ['name' => 'Collège La Réussite Test', 'iso_code' => 'CMR', 'city' => 'Douala'],
            ['name' => 'Établissement Lumière Test', 'iso_code' => 'SEN', 'city' => 'Thiès'],
        ];

        foreach ($schools as $schoolData) {
            $country = Country::query()->where('iso_code', $schoolData['iso_code'])->firstOrFail();

            School::query()->updateOrCreate(
                ['name' => $schoolData['name']],
                [
                    'country_id' => $country->id,
                    'city' => $schoolData['city'],
                    'status' => School::STATUS_ACTIVE,
                    'plan' => School::PLAN_ECOLE,
                    'language' => School::LANGUAGE_FR,
                    'currency' => $country->currency,
                ],
            );
        }
    }
}
