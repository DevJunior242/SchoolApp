<?php

namespace App\Exceptions;

use Exception;

class AiNotConfiguredException extends Exception
{
    public function __construct()
    {
        parent::__construct("L'assistant IA n'est pas encore configuré (clé API manquante).");
    }
}
