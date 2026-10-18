<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\HomeContent;
use App\Models\HomeSection;
use App\Models\User;
use Database\Seeders\SiteContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SitePagesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Las páginas nuevas aún no están en el manifest del último build.
        $this->withoutVite();
    }

    public function test_each_page_shows_only_its_visible_sections()
    {
        HomeSection::query()->create(['page' => 'nosotros', 'title' => 'Visión', 'body' => 'Texto', 'position' => 2]);
        HomeSection::query()->create(['page' => 'nosotros', 'title' => 'Misión', 'body' => 'Texto', 'position' => 1]);
        HomeSection::query()->create(['page' => 'nosotros', 'title' => 'Borrador', 'body' => 'Texto', 'is_visible' => false]);
        HomeSection::query()->create(['page' => 'donar', 'title' => 'Cuenta bancaria', 'body' => 'Texto']);
        HomeSection::query()->create(['title' => 'Por qué volar', 'body' => 'Texto']);

        $this->get(route('page', 'nosotros'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('page')
            ->where('page.title', 'Quiénes somos')
            ->has('sections', 2)
            ->where('sections.0.title', 'Misión')
            ->where('sections.1.title', 'Visión'));

        $this->get(route('page', 'donar'))->assertInertia(fn (Assert $page) => $page
            ->has('sections', 1)
            ->where('sections.0.title', 'Cuenta bancaria')
            ->where('companies', []));

        $this->get(route('page', 'transparencia'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('sections', []));

        $this->get(route('home'))->assertInertia(fn (Assert $page) => $page
            ->has('sections', 1)
            ->where('sections.0.title', 'Por qué volar'));
    }

    public function test_unknown_pages_do_not_exist()
    {
        $this->get('/inicio')->assertNotFound();
        $this->get('/otra-cosa')->assertNotFound();
    }

    public function test_about_page_lists_the_active_associates()
    {
        Company::factory()->create(['name' => 'Volare', 'is_active' => true]);
        Company::factory()->create(['name' => 'Aerostat', 'is_active' => true]);
        Company::factory()->create(['name' => 'Inactiva', 'is_active' => false]);

        $this->get(route('page', 'nosotros'))->assertInertia(fn (Assert $page) => $page
            ->has('companies', 2)
            ->where('companies.0.name', 'Aerostat')
            ->where('companies.1.name', 'Volare'));
    }

    public function test_the_super_admin_edits_the_contact_details_shown_on_the_contact_page()
    {
        $this->actingAs(User::factory()->superAdmin()->create())->put(route('admin.home.update'), [
            'hero_title' => 'FEGAT',
            'semaphore_text' => 'Semáforo.',
            'contact_text' => 'Escríbenos.',
            'contact_email' => 'contacto@fegat.mx',
            'contact_phones' => '594 123 4567',
            'contact_hours' => 'Lunes a viernes de 9 a 17',
            'contact_address' => 'San Juan Teotihuacán, Edo. Méx.',
            'facebook_url' => 'https://facebook.com/fegat',
        ])->assertSessionHasNoErrors();

        auth()->logout();

        $this->get(route('contact.show'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('contact')
            ->where('text', 'Escríbenos.')
            ->where('details.contact_email', 'contacto@fegat.mx')
            ->where('details.contact_phones', '594 123 4567')
            ->where('details.facebook_url', 'https://facebook.com/fegat')
            ->where('details.instagram_url', null));
    }

    public function test_contact_links_must_be_valid()
    {
        $this->actingAs(User::factory()->superAdmin()->create())->put(route('admin.home.update'), [
            'hero_title' => 'FEGAT',
            'semaphore_text' => 'Semáforo.',
            'contact_text' => 'Escríbenos.',
            'contact_email' => 'no-es-correo',
            'instagram_url' => 'javascript:alert(1)',
        ])->assertSessionHasErrors(['contact_email', 'instagram_url']);

        $this->assertNull(HomeContent::current()->instagram_url);
    }

    public function test_sections_are_ordered_within_their_page()
    {
        $this->actingAs(User::factory()->superAdmin()->create());

        $this->post(route('admin.sections.store'), ['page' => 'nosotros', 'title' => 'Misión', 'body' => 'A', 'is_visible' => '1']);
        $this->post(route('admin.sections.store'), ['page' => 'proyectos', 'title' => 'Poligonal', 'body' => 'B', 'is_visible' => '1']);
        $this->post(route('admin.sections.store'), ['page' => 'nosotros', 'title' => 'Visión', 'body' => 'C', 'is_visible' => '1']);
        $this->post(route('admin.sections.store'), ['page' => 'otra', 'title' => 'X', 'body' => 'D'])->assertSessionHasErrors('page');

        $titles = fn (string $page) => HomeSection::query()->where('page', $page)->orderBy('position')->pluck('title')->all();
        $vision = HomeSection::query()->where('title', 'Visión')->sole();
        $polygon = HomeSection::query()->where('title', 'Poligonal')->sole();

        $this->assertSame(1, $polygon->position);

        $this->post(route('admin.sections.move', $vision), ['direction' => 'up']);
        $this->assertSame(['Visión', 'Misión'], $titles('nosotros'));

        // Al cambiarla de página queda al final de la nueva.
        $this->put(route('admin.sections.update', $polygon), ['page' => 'nosotros', 'title' => 'Poligonal', 'body' => 'B', 'is_visible' => '1']);
        $this->assertSame(['Visión', 'Misión', 'Poligonal'], $titles('nosotros'));
        $this->assertSame([], $titles('proyectos'));
    }

    public function test_the_site_content_seeder_fills_the_pages_once()
    {
        $this->seed(SiteContentSeeder::class);
        $this->seed(SiteContentSeeder::class);

        $this->assertSame(
            ['Misión', 'Visión', 'Valores', 'Historia'],
            HomeSection::query()->where('page', 'nosotros')->orderBy('position')->pluck('title')->all(),
        );
        $this->assertSame(1, HomeSection::query()->where('page', 'proyectos')->count());
        $this->assertStringContainsString('<strong>Seguridad:</strong>', HomeSection::query()->where('title', 'Valores')->sole()->body);
        $this->assertSame('Representación, desarrollo y liderazgo para el sector aerostático nacional.', HomeContent::current()->hero_text);
    }
}
