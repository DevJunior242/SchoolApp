<?php

namespace App\Console\Commands;

use App\Services\Auth\SessionService;
use Illuminate\Console\Command;

class PruneSessions extends Command
{
    protected $signature = 'auth:prune-sessions';

    protected $description = 'Supprime les sessions (jetons) inutilisées depuis 30 jours';

    public function handle(SessionService $sessions): int
    {
        $this->info($sessions->pruneIdle().' session(s) expirée(s) supprimée(s).');

        return self::SUCCESS;
    }
}
