<?php

namespace App\Enums;

/**
 * Páginas del sitio público donde se pueden colocar secciones informativas.
 */
enum SitePage: string
{
    case Home = 'inicio';
    case About = 'nosotros';
    case Projects = 'proyectos';
    case Transparency = 'transparencia';
    case Donate = 'donar';

    public function label(): string
    {
        return match ($this) {
            self::Home => 'Inicio',
            self::About => 'Quiénes somos',
            self::Projects => 'Proyectos',
            self::Transparency => 'Transparencia',
            self::Donate => 'Donar',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Home => 'Federación de Globos Aerostáticos Teotihuacán: semáforo de vuelos y clima del día.',
            self::About => 'Misión, visión, valores, historia y empresas asociadas a la federación.',
            self::Projects => 'Proyectos y programas de la federación para el sector aerostático.',
            self::Transparency => 'Informes de actividades, información financiera y datos legales de la federación.',
            self::Donate => 'Cómo apoyar a la federación con donativos o aportaciones en especie.',
        };
    }

    /**
     * Páginas con dirección propia (el inicio vive en «/»).
     *
     * @return list<string>
     */
    public static function routable(): array
    {
        return array_values(array_map(
            fn (self $page) => $page->value,
            array_filter(self::cases(), fn (self $page) => $page !== self::Home),
        ));
    }
}
