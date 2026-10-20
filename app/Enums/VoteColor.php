<?php

namespace App\Enums;

enum VoteColor: string
{
    case Green = 'green';
    case Yellow = 'yellow';
    case Red = 'red';

    public function label(): string
    {
        return match ($this) {
            self::Green => 'Verde',
            self::Yellow => 'Amarillo',
            self::Red => 'Rojo',
        };
    }

    /** Qué significa el color para los vuelos. */
    public function meaning(): string
    {
        return match ($this) {
            self::Green => 'Volamos',
            self::Yellow => 'En espera',
            self::Red => 'Se cancela',
        };
    }
}
