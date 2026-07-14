<?php

namespace Database\Seeders;

use App\Models\Country;
use Illuminate\Database\Seeder;

class CountrySeeder extends Seeder
{
    private const COUNTRIES = [
        ['name' => 'Algérie', 'iso_code' => 'DZA', 'phone_code' => '+213', 'currency' => 'DZD'],
        ['name' => 'Angola', 'iso_code' => 'AGO', 'phone_code' => '+244', 'currency' => 'AOA'],
        ['name' => 'Bénin', 'iso_code' => 'BEN', 'phone_code' => '+229', 'currency' => 'XOF'],
        ['name' => 'Botswana', 'iso_code' => 'BWA', 'phone_code' => '+267', 'currency' => 'BWP'],
        ['name' => 'Burkina Faso', 'iso_code' => 'BFA', 'phone_code' => '+226', 'currency' => 'XOF'],
        ['name' => 'Burundi', 'iso_code' => 'BDI', 'phone_code' => '+257', 'currency' => 'BIF'],
        ['name' => 'Cabo Verde', 'iso_code' => 'CPV', 'phone_code' => '+238', 'currency' => 'CVE'],
        ['name' => 'Cameroun', 'iso_code' => 'CMR', 'phone_code' => '+237', 'currency' => 'XAF'],
        ['name' => 'République centrafricaine', 'iso_code' => 'CAF', 'phone_code' => '+236', 'currency' => 'XAF'],
        ['name' => 'Tchad', 'iso_code' => 'TCD', 'phone_code' => '+235', 'currency' => 'XAF'],
        ['name' => 'Comores', 'iso_code' => 'COM', 'phone_code' => '+269', 'currency' => 'KMF'],
        ['name' => 'Congo', 'iso_code' => 'COG', 'phone_code' => '+242', 'currency' => 'XAF'],
        ['name' => 'République démocratique du Congo', 'iso_code' => 'COD', 'phone_code' => '+243', 'currency' => 'CDF'],
        ['name' => "Côte d'Ivoire", 'iso_code' => 'CIV', 'phone_code' => '+225', 'currency' => 'XOF'],
        ['name' => 'Djibouti', 'iso_code' => 'DJI', 'phone_code' => '+253', 'currency' => 'DJF'],
        ['name' => 'Égypte', 'iso_code' => 'EGY', 'phone_code' => '+20', 'currency' => 'EGP'],
        ['name' => 'Guinée équatoriale', 'iso_code' => 'GNQ', 'phone_code' => '+240', 'currency' => 'XAF'],
        ['name' => 'Érythrée', 'iso_code' => 'ERI', 'phone_code' => '+291', 'currency' => 'ERN'],
        ['name' => 'Eswatini', 'iso_code' => 'SWZ', 'phone_code' => '+268', 'currency' => 'SZL'],
        ['name' => 'Éthiopie', 'iso_code' => 'ETH', 'phone_code' => '+251', 'currency' => 'ETB'],
        ['name' => 'Gabon', 'iso_code' => 'GAB', 'phone_code' => '+241', 'currency' => 'XAF'],
        ['name' => 'Gambie', 'iso_code' => 'GMB', 'phone_code' => '+220', 'currency' => 'GMD'],
        ['name' => 'Ghana', 'iso_code' => 'GHA', 'phone_code' => '+233', 'currency' => 'GHS'],
        ['name' => 'Guinée', 'iso_code' => 'GIN', 'phone_code' => '+224', 'currency' => 'GNF'],
        ['name' => 'Guinée-Bissau', 'iso_code' => 'GNB', 'phone_code' => '+245', 'currency' => 'XOF'],
        ['name' => 'Kenya', 'iso_code' => 'KEN', 'phone_code' => '+254', 'currency' => 'KES'],
        ['name' => 'Lesotho', 'iso_code' => 'LSO', 'phone_code' => '+266', 'currency' => 'LSL'],
        ['name' => 'Liberia', 'iso_code' => 'LBR', 'phone_code' => '+231', 'currency' => 'LRD'],
        ['name' => 'Libye', 'iso_code' => 'LBY', 'phone_code' => '+218', 'currency' => 'LYD'],
        ['name' => 'Madagascar', 'iso_code' => 'MDG', 'phone_code' => '+261', 'currency' => 'MGA'],
        ['name' => 'Malawi', 'iso_code' => 'MWI', 'phone_code' => '+265', 'currency' => 'MWK'],
        ['name' => 'Mali', 'iso_code' => 'MLI', 'phone_code' => '+223', 'currency' => 'XOF'],
        ['name' => 'Maroc', 'iso_code' => 'MAR', 'phone_code' => '+212', 'currency' => 'MAD'],
        ['name' => 'Maurice', 'iso_code' => 'MUS', 'phone_code' => '+230', 'currency' => 'MUR'],
        ['name' => 'Mauritanie', 'iso_code' => 'MRT', 'phone_code' => '+222', 'currency' => 'MRU'],
        ['name' => 'Mozambique', 'iso_code' => 'MOZ', 'phone_code' => '+258', 'currency' => 'MZN'],
        ['name' => 'Namibie', 'iso_code' => 'NAM', 'phone_code' => '+264', 'currency' => 'NAD'],
        ['name' => 'Niger', 'iso_code' => 'NER', 'phone_code' => '+227', 'currency' => 'XOF'],
        ['name' => 'Nigéria', 'iso_code' => 'NGA', 'phone_code' => '+234', 'currency' => 'NGN'],
        ['name' => 'Ouganda', 'iso_code' => 'UGA', 'phone_code' => '+256', 'currency' => 'UGX'],
        ['name' => 'Rwanda', 'iso_code' => 'RWA', 'phone_code' => '+250', 'currency' => 'RWF'],
        ['name' => 'Sao Tomé-et-Principe', 'iso_code' => 'STP', 'phone_code' => '+239', 'currency' => 'STN'],
        ['name' => 'Sénégal', 'iso_code' => 'SEN', 'phone_code' => '+221', 'currency' => 'XOF'],
        ['name' => 'Seychelles', 'iso_code' => 'SYC', 'phone_code' => '+248', 'currency' => 'SCR'],
        ['name' => 'Sierra Leone', 'iso_code' => 'SLE', 'phone_code' => '+232', 'currency' => 'SLL'],
        ['name' => 'Somalie', 'iso_code' => 'SOM', 'phone_code' => '+252', 'currency' => 'SOS'],
        ['name' => 'Afrique du Sud', 'iso_code' => 'ZAF', 'phone_code' => '+27', 'currency' => 'ZAR'],
        ['name' => 'Soudan du Sud', 'iso_code' => 'SSD', 'phone_code' => '+211', 'currency' => 'SSP'],
        ['name' => 'Soudan', 'iso_code' => 'SDN', 'phone_code' => '+249', 'currency' => 'SDG'],
        ['name' => 'Tanzanie', 'iso_code' => 'TZA', 'phone_code' => '+255', 'currency' => 'TZS'],
        ['name' => 'Togo', 'iso_code' => 'TGO', 'phone_code' => '+228', 'currency' => 'XOF'],
        ['name' => 'Tunisie', 'iso_code' => 'TUN', 'phone_code' => '+216', 'currency' => 'TND'],
        ['name' => 'Zambie', 'iso_code' => 'ZMB', 'phone_code' => '+260', 'currency' => 'ZMW'],
        ['name' => 'Zimbabwe', 'iso_code' => 'ZWE', 'phone_code' => '+263', 'currency' => 'ZWL'],
    ];

    public function run(): void
    {
        foreach (self::COUNTRIES as $country) {
            Country::query()->firstOrCreate(['iso_code' => $country['iso_code']], $country);
        }
    }
}
