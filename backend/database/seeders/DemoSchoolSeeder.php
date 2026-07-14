<?php

namespace Database\Seeders;

use App\Models\Country;
use App\Models\School;
use Illuminate\Database\Seeder;

class DemoSchoolSeeder extends Seeder
{
    public function run(): void
    {
        $countries = [
            ['name' => "Côte d'Ivoire", 'iso_code' => 'CIV', 'phone_code' => '+225', 'currency' => 'XOF'],
            ['name' => 'Sénégal', 'iso_code' => 'SEN', 'phone_code' => '+221', 'currency' => 'XOF'],
            ['name' => 'Cameroun', 'iso_code' => 'CMR', 'phone_code' => '+237', 'currency' => 'XAF'],
        ];

        foreach ($countries as $country) {
            $country = Country::query()->firstOrCreate(['iso_code' => $country['iso_code']], $country);

            School::query()->firstOrCreate(
                ['name' => "Groupe Scolaire {$country->name}", 'country_id' => $country->id],
                ['status' => School::STATUS_ACTIVE]
            );
        }
    }
}
