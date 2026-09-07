<?php

namespace Database\Seeders;

use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Seeder;

class PaymentDemoCleanupSeeder extends Seeder
{
    private const DEMO_EMAILS = [
        'directeur.test@eduafrique.test',
        'comptable.test@eduafrique.test',
        'secretaire.test@eduafrique.test',
        'rh.test@eduafrique.test',
        'professeur.test@eduafrique.test',
        'parent.awa@eduafrique.test',
        'parent.koffi@eduafrique.test',
        'parent.mariam@eduafrique.test',
        'eleve.amadou@eduafrique.test',
        'eleve.aicha@eduafrique.test',
        'eleve.koffi@eduafrique.test',
        'eleve.mariam@eduafrique.test',
    ];

    public function run(): void
    {
        $userIds = User::query()
            ->whereIn('email', self::DEMO_EMAILS)
            ->pluck('id');

        Student::query()->whereIn('user_id', $userIds)->delete();
        School::query()->where('name', 'École de Test Local')->delete();

        User::query()->whereIn('id', $userIds)->delete();
    }
}
