<?php

namespace Database\Seeders;

use App\Enums\SitePage;
use App\Models\HomeContent;
use App\Models\HomeSection;
use Illuminate\Database\Seeder;

/**
 * Textos iniciales de las páginas públicas entregados por la federación.
 * No pisa nada: solo crea las secciones que falten y el eslogan si está vacío.
 */
class SiteContentSeeder extends Seeder
{
    public function run(): void
    {
        $content = HomeContent::current();

        if (blank($content->hero_text)) {
            $content->update(['hero_text' => 'Representación, desarrollo y liderazgo para el sector aerostático nacional.']);
        }

        $sections = [
            SitePage::About->value => [
                'Misión' => '<p>Promover la integración del sector, defender los intereses de los socios, representar a la industria aerostática ante las autoridades y simplificar los trámites y regulaciones para hacer la actividad más accesible.</p>',
                'Visión' => '<p>Posicionar a México como el destino líder de turismo aerostático en América Latina, promoviendo un crecimiento económico sostenible a través de experiencias de vuelo seguras, memorables y de clase mundial que exalten la riqueza cultural de nuestras regiones.</p>',
                'Valores' => '<ul>'
                    .'<li><p><strong>Seguridad:</strong> es el eje transversal de toda actividad aerostática e implica el estricto cumplimiento de los estándares, certificaciones y el mantenimiento riguroso de las aeronaves para proteger la vida de los pasajeros y la tripulación.</p></li>'
                    .'<li><p><strong>Excelencia y profesionalismo:</strong> búsqueda constante de la mejora continua a través de la capacitación técnica especializada de pilotos y personal técnico de apoyo.</p></li>'
                    .'<li><p><strong>Trabajo en equipo y cooperación:</strong> fomento de la sinergia e integración entre los diferentes operadores, prestadores de servicios y autoridades aeronáuticas para alcanzar objetivos comunes dentro del sector.</p></li>'
                    .'<li><p><strong>Innovación y desarrollo sustentable:</strong> promoción y adopción de nuevas tecnologías, mejores prácticas internacionales y estrategias respetuosas con el medio ambiente.</p></li>'
                    .'<li><p><strong>Compromiso y responsabilidad social:</strong> dedicación enfocada en potenciar el turismo regional de manera ética y segura, impulsando el crecimiento económico local y proyectando a México de forma positiva en el escenario internacional.</p></li>'
                    .'</ul>',
                'Historia' => '<p>En noviembre de 2012 se creó <strong>PROGLOBO</strong>. A partir de 2017 los operadores comenzaron a reunirse para trabajar en la circular obligatoria que regula la actividad.</p>'
                    .'<p>El crecimiento de la industria aerostática en Teotihuacán impulsó la creación de la Federación de Globos Aerostáticos Teotihuacán.</p>',
            ],
            SitePage::Projects->value => [
                'Poligonal de operación' => '<p>Límites de la poligonal implementada para la operación de los globos aerostáticos que sobrevuelan el espacio aéreo de la zona de las Pirámides.</p>',
            ],
        ];

        foreach ($sections as $page => $pageSections) {
            $position = (int) HomeSection::query()->where('page', $page)->max('position');

            foreach ($pageSections as $title => $body) {
                HomeSection::query()->firstOrCreate(
                    ['page' => $page, 'title' => $title],
                    ['body' => $body, 'is_visible' => true, 'position' => ++$position],
                );
            }
        }
    }
}
