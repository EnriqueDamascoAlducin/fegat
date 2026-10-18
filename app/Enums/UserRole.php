<?php

namespace App\Enums;

enum UserRole: string
{
    case SuperAdmin = 'super_admin';
    case CompanyAdmin = 'company_admin';

    /** Su voto es la decisión final: se publica sin considerar los votos de las empresas. */
    case Decider = 'decider';
}
