<?php

use App\Support\PageContent;
use App\Support\SiteLayout;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Constructor de páginas por bloques: crea la tabla, pasa el inicio y las secciones de cada
 * página fija a bloques, arma el menú y el footer, y elimina las secciones anteriores.
 */
return new class extends Migration
{
    /**
     * Páginas fijas anteriores: slug => [título, descripción del encabezado].
     */
    private const PAGES = [
        'nosotros' => ['Quiénes somos', 'Misión, visión, valores, historia y empresas asociadas a la federación.'],
        'proyectos' => ['Proyectos', 'Proyectos y programas de la federación para el sector aerostático.'],
        'transparencia' => ['Transparencia', 'Informes de actividades, información financiera y datos legales de la federación.'],
        'donar' => ['Donar', 'Cómo apoyar a la federación con donativos o aportaciones en especie.'],
        'contacto' => ['Contacto', 'Escríbenos y te responderemos a la brevedad.'],
    ];

    private int $sequence = 0;

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 80)->nullable()->unique();
            $table->string('title', 120);
            $table->boolean('is_home')->default(false);
            $table->boolean('is_active')->default(true);
            $table->longText('content')->nullable();
            $table->timestamps();
        });

        Schema::table('home_contents', function (Blueprint $table) {
            $table->longText('header')->nullable()->after('id');
            $table->longText('footer')->nullable()->after('header');
        });

        $this->importContent();

        Schema::dropIfExists('home_sections');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('home_sections', function (Blueprint $table) {
            $table->id();
            $table->string('page', 30)->default('inicio');
            $table->string('title');
            $table->text('body');
            $table->string('image_path')->nullable();
            $table->boolean('is_visible')->default(true);
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->index(['page', 'position']);
        });

        Schema::table('home_contents', function (Blueprint $table) {
            $table->dropColumn(['header', 'footer']);
        });

        Schema::dropIfExists('pages');
    }

    private function importContent(): void
    {
        $content = DB::table('home_contents')->first();
        $sections = Schema::hasTable('home_sections')
            ? DB::table('home_sections')->where('is_visible', true)->orderBy('position')->orderBy('id')->get()->groupBy('page')
            : collect();

        /** @var array<string, int> $ids */
        $ids = [];

        foreach (self::PAGES as $slug => [$title, $description]) {
            $ids[$slug] = $this->insert($slug, $title, []);
        }

        $page = fn (string $slug) => ['link_type' => 'page', 'ref_id' => $ids[$slug], 'url' => '/'.$slug];

        $heroImage = $content?->hero_image_path ? '/storage/'.$content->hero_image_path : '/images/fegat-icon.png';
        $ids['inicio'] = $this->insert(null, 'Inicio', [
            $this->block('hero', [
                'title' => $this->paragraph($content->hero_title ?? 'Federación de Globos Aerostáticos Teotihuacán A.C.'),
                'subtitle' => $this->paragraph($content->hero_text ?? 'Representación, desarrollo y liderazgo para el sector aerostático nacional.'),
                'image' => $heroImage,
                'image_alt' => 'Logotipo de FEGAT',
                'image_layout' => 'side',
                'align' => 'left',
                'primary_label' => 'Quiénes somos',
                'secondary_label' => 'Donar',
                ...$this->buttons($page('nosotros'), $page('donar')),
            ]),
            $this->block('semaphore', [
                'title' => '<p>Semáforo de vuelos</p>',
                'description' => $this->paragraph(($content->semaphore_text ?? '') ?: 'Las empresas asociadas evalúan las condiciones de cada jornada y deciden en conjunto si es viable volar.'),
            ], 'semaforo'),
            $this->block('weather', [
                'title' => '<p>Clima en Teotihuacán</p>',
                'description' => '<p>Condiciones actuales y pronóstico por hora para la mañana de vuelo.</p>',
            ], 'clima'),
            ...$this->sectionBlocks($sections->get('inicio', collect())),
            $this->block('posts', [
                'title' => '<p>Blog</p>',
                'description' => '<p>Noticias y artículos de la federación.</p>',
                'limit' => 3,
            ]),
            $this->block('associates', ['title' => '<p>Empresas asociadas</p>']),
            $this->block('cta', [
                'title' => '<p>Contacto</p>',
                'description' => $this->paragraph(($content->contact_text ?? '') ?: 'Contáctanos para cualquier duda y/o aclaración.'),
                'primary_label' => 'Escríbenos',
                ...$this->buttons($page('contacto'), null),
            ]),
        ], home: true);

        foreach (self::PAGES as $slug => [$title, $description]) {
            $blocks = [$this->block('hero', ['title' => $this->paragraph($title), 'subtitle' => $this->paragraph($description), 'align' => 'center'])];
            $pageSections = $sections->get($slug, collect());

            if ($pageSections->isEmpty()) {
                $pageSections = collect($this->defaultSections($slug));
            }

            $blocks = [...$blocks, ...$this->sectionBlocks($pageSections)];

            $blocks = [...$blocks, ...match ($slug) {
                'nosotros' => [$this->block('associates', ['title' => '<p>Asociados</p>', 'description' => '<p>Empresas que integran la federación.</p>'])],
                'proyectos' => [$this->block('cta', [
                    'title' => '<p>Semáforo de operación</p>',
                    'description' => '<p>Las empresas asociadas evalúan cada jornada si las condiciones permiten volar sobre la zona de las Pirámides.</p>',
                    'primary_label' => 'Ver el semáforo de hoy',
                    'primary_link_type' => 'custom',
                    'primary_url' => '/#semaforo',
                    'primary_ref_id' => null,
                ])],
                'contacto' => [$this->block('contact', ['title' => '', 'description' => ''])],
                default => $pageSections->isEmpty() ? [$this->block('rich_text', ['title' => '', 'body' => '<p>Estamos preparando esta información.</p>'])] : [],
            }];

            DB::table('pages')->where('id', $ids[$slug])->update(['content' => json_encode(
                [...PageContent::empty(), 'blocks' => $blocks],
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
            )]);
        }

        $link = fn (string $label, string $slug) => ['id' => $slug, 'label' => $label, 'open_in_new_tab' => false, ...$page($slug)];
        $home = ['id' => 'inicio', 'label' => 'Inicio', 'link_type' => 'page', 'ref_id' => $ids['inicio'], 'url' => '/', 'open_in_new_tab' => false];
        $blog = ['id' => 'blog', 'label' => 'Blog', 'link_type' => 'blog', 'ref_id' => null, 'url' => '/blog', 'open_in_new_tab' => false];

        $header = [
            ...SiteLayout::defaultHeader(),
            'nav_items' => array_map(fn (array $item) => [...$item, 'visible' => true, 'children' => []], [
                $home,
                $link('Quiénes somos', 'nosotros'),
                $link('Proyectos', 'proyectos'),
                $link('Transparencia', 'transparencia'),
                $link('Donar', 'donar'),
                $blog,
                $link('Contacto', 'contacto'),
            ]),
        ];

        $footer = [
            ...SiteLayout::defaultFooter(),
            'columns' => [
                ['id' => 'federacion', 'title' => 'La federación', 'links' => [
                    $link('Quiénes somos', 'nosotros'), $link('Proyectos', 'proyectos'), $link('Transparencia', 'transparencia'),
                ]],
                ['id' => 'participa', 'title' => 'Participa', 'links' => [$link('Donar', 'donar'), $blog, $link('Contacto', 'contacto')]],
            ],
        ];

        $values = [
            'header' => json_encode($header, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'footer' => json_encode($footer, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ];

        if ($content) {
            DB::table('home_contents')->where('id', $content->id)->update($values);
        } else {
            DB::table('home_contents')->insert([
                ...$values,
                'hero_title' => 'Federación de Globos Aerostáticos Teotihuacán A.C.',
                'semaphore_text' => '',
                'contact_text' => '',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * @param  list<array<string, mixed>>  $blocks
     */
    private function insert(?string $slug, string $title, array $blocks, bool $home = false): int
    {
        return DB::table('pages')->insertGetId([
            'slug' => $slug,
            'title' => $title,
            'is_home' => $home,
            'is_active' => true,
            'content' => json_encode([...PageContent::empty(), 'blocks' => $blocks], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Cada sección anterior es un bloque de texto; si tenía imagen, uno de imagen con texto.
     *
     * @param  iterable<object{title: string, body: string, image_path: string|null}>  $sections
     * @return list<array<string, mixed>>
     */
    private function sectionBlocks(iterable $sections): array
    {
        $blocks = [];

        foreach ($sections as $section) {
            $blocks[] = $section->image_path
                ? $this->block('image', [
                    'title' => $this->paragraph($section->title),
                    'description' => $section->body,
                    'image' => '/storage/'.$section->image_path,
                    'alt' => $section->title,
                    'layout' => 'split',
                ])
                : $this->block('rich_text', ['title' => $this->paragraph($section->title), 'body' => $section->body, 'width' => 'normal']);
        }

        return $blocks;
    }

    /**
     * Textos que entregó la federación, para las páginas que aún no tenían secciones.
     *
     * @return list<object{title: string, body: string, image_path: null}>
     */
    private function defaultSections(string $slug): array
    {
        $section = fn (string $title, string $body) => (object) ['title' => $title, 'body' => $body, 'image_path' => null];

        return match ($slug) {
            'nosotros' => [
                $section('Misión', '<p>Promover la integración del sector, defender los intereses de los socios, representar a la industria aerostática ante las autoridades y simplificar los trámites y regulaciones para hacer la actividad más accesible.</p>'),
                $section('Visión', '<p>Posicionar a México como el destino líder de turismo aerostático en América Latina, promoviendo un crecimiento económico sostenible a través de experiencias de vuelo seguras, memorables y de clase mundial que exalten la riqueza cultural de nuestras regiones.</p>'),
                $section('Valores', '<ul>'
                    .'<li><p><strong>Seguridad:</strong> es el eje transversal de toda actividad aerostática e implica el estricto cumplimiento de los estándares, certificaciones y el mantenimiento riguroso de las aeronaves para proteger la vida de los pasajeros y la tripulación.</p></li>'
                    .'<li><p><strong>Excelencia y profesionalismo:</strong> búsqueda constante de la mejora continua a través de la capacitación técnica especializada de pilotos y personal técnico de apoyo.</p></li>'
                    .'<li><p><strong>Trabajo en equipo y cooperación:</strong> fomento de la sinergia e integración entre los diferentes operadores, prestadores de servicios y autoridades aeronáuticas para alcanzar objetivos comunes dentro del sector.</p></li>'
                    .'<li><p><strong>Innovación y desarrollo sustentable:</strong> promoción y adopción de nuevas tecnologías, mejores prácticas internacionales y estrategias respetuosas con el medio ambiente.</p></li>'
                    .'<li><p><strong>Compromiso y responsabilidad social:</strong> dedicación enfocada en potenciar el turismo regional de manera ética y segura, impulsando el crecimiento económico local y proyectando a México de forma positiva en el escenario internacional.</p></li>'
                    .'</ul>'),
                $section('Historia', '<p>En noviembre de 2012 se creó <strong>PROGLOBO</strong>. A partir de 2017 los operadores comenzaron a reunirse para trabajar en la circular obligatoria que regula la actividad.</p>'
                    .'<p>El crecimiento de la industria aerostática en Teotihuacán impulsó la creación de la Federación de Globos Aerostáticos Teotihuacán.</p>'),
            ],
            'proyectos' => [
                $section('Poligonal de operación', '<p>Límites de la poligonal implementada para la operación de los globos aerostáticos que sobrevuelan el espacio aéreo de la zona de las Pirámides.</p>'),
            ],
            default => [],
        };
    }

    /**
     * @param  array<string, mixed>  $settings
     * @return array<string, mixed>
     */
    private function block(string $type, array $settings, ?string $id = null): array
    {
        return ['id' => $id ?? $type.'-'.(++$this->sequence), 'type' => $type, 'enabled' => true, 'settings' => $settings];
    }

    /**
     * @param  array<string, mixed>  $primary
     * @param  array<string, mixed>|null  $secondary
     * @return array<string, mixed>
     */
    private function buttons(array $primary, ?array $secondary): array
    {
        $fields = [];

        foreach (['primary' => $primary, 'secondary' => $secondary] as $prefix => $link) {
            $fields["{$prefix}_link_type"] = $link['link_type'] ?? 'custom';
            $fields["{$prefix}_ref_id"] = $link['ref_id'] ?? null;
            $fields["{$prefix}_url"] = $link['url'] ?? '';
        }

        return $fields;
    }

    private function paragraph(string $text): string
    {
        return '<p>'.e($text).'</p>';
    }
};
