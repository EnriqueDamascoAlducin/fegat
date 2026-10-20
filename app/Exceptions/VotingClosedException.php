<?php

namespace App\Exceptions;

use RuntimeException;

class VotingClosedException extends RuntimeException
{
    public function __construct(public readonly string $opensAt, public readonly string $closesAt)
    {
        parent::__construct("La votación está cerrada. Horario: {$opensAt} a {$closesAt}.");
    }
}
