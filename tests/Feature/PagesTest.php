<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Page;
use App\Models\User;
use App\Support\PageContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PagesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Las pantallas nuevas aún no están en el manifest del último build.
        $this->withoutVite();
        Storage::fake('public');
    }

    /**
     * @param  list<array<string, mixed>>  $blocks
     */
    private function page(string $slug, array $blocks = [], bool $active = true): Page
    {
        return Page::query()->create([
            'slug' => $slug,
            'title' => ucfirst($slug),
            'is_active' => $active,
            'content' => [...PageContent::empty(), 'blocks' => $blocks],
        ]);
    }

    /**
     * @param  array<string, mixed>  $settings
     * @return array<string, mixed>
     */
    private function block(string $type, array $settings = []): array
    {
        return ['id' => $type.'-1', 'type' => $type, 'enabled' => true, 'settings' => $settings];
    }

    public function test_the_migration_turns_the_old_site_into_block_pages()
    {
        $home = Page::home();

        $this->assertNotNull($home);
        $this->assertSame(['hero', 'semaphore', 'weather', 'posts', 'associates', 'cta'], array_column($home->content['blocks'], 'type'));
        $this->assertSame(
            ['contacto', 'donar', 'nosotros', 'proyectos', 'transparencia'],
            Page::query()->where('is_home', false)->orderBy('slug')->pluck('slug')->all(),
        );
        $this->assertSame(
            ['hero', 'rich_text', 'rich_text', 'rich_text', 'rich_text', 'associates'],
            array_column(Page::query()->where('slug', 'nosotros')->sole()->content['blocks'], 'type'),
        );

        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('page')
            ->where('page.is_home', true)
            ->has('content.blocks', 6)
            ->where('site.header.nav_items.1.label', 'Quiénes somos')
            ->where('site.header.nav_items.1.url', '/nosotros')
            ->where('site.footer.columns.0.title', 'La federación'));
    }

    public function test_pages_are_served_by_slug_and_drafts_only_for_the_super_admin()
    {
        $this->page('galeria', [$this->block('rich_text', ['title' => '<p>Fotos</p>'])]);
        $this->page('borrador', active: false);

        $this->get('/galeria')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('page')
            ->where('page.url', '/galeria')
            ->where('content.blocks.0.settings.title', '<p>Fotos</p>')
            // Sin bloques que los pidan, no se consultan el semáforo ni las empresas.
            ->where('semaphore', null)
            ->where('companies', []));

        $this->get('/borrador')->assertNotFound();
        $this->get('/no-existe')->assertNotFound();
        $this->get('/galeria/otra')->assertNotFound();
        $this->get('/dashboard')->assertRedirect(route('login'));

        $this->actingAs(User::factory()->superAdmin()->create())->get('/borrador')->assertOk();
    }

    public function test_hidden_blocks_are_not_sent_and_block_data_is_loaded_on_demand()
    {
        Company::factory()->create(['name' => 'Volare', 'is_active' => true]);
        $this->page('socios', [
            $this->block('associates'),
            ['id' => 'oculto', 'type' => 'rich_text', 'enabled' => false, 'settings' => ['title' => '<p>No</p>']],
        ]);

        $this->get('/socios')->assertInertia(fn (Assert $page) => $page
            ->has('content.blocks', 1)
            ->where('companies.0.name', 'Volare'));
    }

    public function test_the_super_admin_creates_and_edits_a_page()
    {
        $this->actingAs(User::factory()->superAdmin()->create());

        $response = $this->post(route('admin.pages.store'));
        $page = Page::query()->latest('id')->first();
        $response->assertRedirect(route('admin.pages.edit', $page));
        $this->assertFalse($page->is_active);

        $nosotros = Page::query()->where('slug', 'nosotros')->sole();

        $this->put(route('admin.pages.update', $page), [
            'title' => 'Galería',
            'slug' => 'galeria',
            'is_active' => true,
            'content' => [
                'theme' => ['primary' => '#123456', 'radius' => 99, 'variant' => 3],
                'blocks' => [
                    $this->block('hero', [
                        'title' => '<p onclick="x()">Hola <script>alert(1)</script><strong>mundo</strong></p>',
                        'image' => 'javascript:alert(1)',
                        'primary_label' => 'Conócenos',
                        'primary_link_type' => 'page',
                        'primary_ref_id' => $nosotros->id,
                        'primary_url' => '/nosotros',
                        'secondary_url' => 'javascript:alert(1)',
                    ]),
                    $this->block('gallery', ['images' => [['image' => '/storage/paginas/a.jpg', 'caption' => 'Uno <b>dos</b>']]]),
                ],
                'seo' => ['meta_title' => 'Fotos de FEGAT'],
            ],
        ])->assertSessionHasNoErrors();

        $page->refresh();
        $hero = $page->content['blocks'][0]['settings'];

        $this->assertSame('galeria', $page->slug);
        $this->assertTrue($page->is_active);
        $this->assertSame('<p>Hola <strong>mundo</strong></p>', $hero['title']);
        $this->assertSame('', $hero['image']);
        $this->assertSame('', $hero['secondary_url']);
        $this->assertSame('Uno <b>dos</b>', $page->content['blocks'][1]['settings']['images'][0]['caption']);
        $this->assertSame(['primary' => '#123456', 'radius' => 40, 'variant' => 3], array_intersect_key($page->content['theme'], array_flip(['primary', 'radius', 'variant'])));
        $this->assertSame('Fotos de FEGAT', $page->content['seo']['meta_title']);

        // Si «Quiénes somos» cambia de dirección, el botón sigue apuntando a ella.
        $nosotros->update(['slug' => 'quienes-somos']);
        $this->get('/galeria')->assertInertia(fn (Assert $inertia) => $inertia
            ->where('content.blocks.0.settings.primary_url', '/quienes-somos'));
    }

    public function test_slugs_must_be_free_and_not_used_by_the_system()
    {
        $this->actingAs(User::factory()->superAdmin()->create());
        $page = $this->page('nueva');
        $payload = fn (string $slug) => ['title' => 'X', 'slug' => $slug, 'content' => ['blocks' => []]];

        $this->put(route('admin.pages.update', $page), $payload('blog'))->assertSessionHasErrors('slug');
        $this->put(route('admin.pages.update', $page), $payload('dashboard'))->assertSessionHasErrors('slug');
        $this->put(route('admin.pages.update', $page), $payload('nosotros'))->assertSessionHasErrors('slug');
        $this->put(route('admin.pages.update', $page), $payload('Con Espacios'))->assertSessionHasErrors('slug');
        $this->put(route('admin.pages.update', $page), [...$payload('ok'), 'content' => ['blocks' => [['type' => 'video']]]])
            ->assertSessionHasErrors('content.blocks.0.type');

        $this->assertSame('nueva', $page->refresh()->slug);
    }

    public function test_the_home_cannot_be_deleted_and_can_be_replaced()
    {
        $this->actingAs(User::factory()->superAdmin()->create());
        $home = Page::home();
        $other = $this->page('nueva-portada', active: false);

        $this->delete(route('admin.pages.destroy', $home))->assertStatus(422);

        $this->post(route('admin.pages.make-home', $other))->assertRedirect(route('admin.pages.index'));

        $this->assertTrue($other->refresh()->is_home);
        $this->assertTrue($other->is_active);
        $this->assertFalse($home->refresh()->is_home);
        $this->assertSame('inicio', $home->slug);

        $this->delete(route('admin.pages.destroy', $home))->assertRedirect(route('admin.pages.index'));
        $this->assertModelMissing($home);
    }

    public function test_the_preview_shows_the_draft_without_saving_it()
    {
        $this->actingAs(User::factory()->superAdmin()->create());
        $page = $this->page('borrador', [$this->block('rich_text', ['title' => '<p>Guardado</p>'])], active: false);

        $url = $this->postJson(route('admin.pages.preview', $page), [
            'title' => 'Borrador',
            'slug' => 'borrador',
            'content' => ['blocks' => [$this->block('rich_text', ['title' => '<p>Sin guardar</p>'])]],
        ])->assertOk()->json('url');

        $this->get($url)->assertOk()->assertInertia(fn (Assert $inertia) => $inertia
            ->where('isPreview', true)
            ->where('content.blocks.0.settings.title', '<p>Sin guardar</p>'));

        $this->assertSame('<p>Guardado</p>', $page->refresh()->content['blocks'][0]['settings']['title']);
    }

    public function test_block_images_can_be_uploaded()
    {
        $this->actingAs(User::factory()->superAdmin()->create());
        $image = fn () => UploadedFile::fake()->createWithContent('foto.png', file_get_contents(public_path('icons/icon-192.png')));

        $this->postJson(route('admin.pages.upload-image'), ['image' => $image()])
            ->assertOk()
            ->assertJsonPath('width', 192);

        $this->postJson(route('admin.pages.upload-images'), ['images' => [$image(), $image()]])
            ->assertOk()
            ->assertJsonCount(2, 'urls');

        $this->assertCount(3, Storage::disk('public')->files('paginas'));

        $this->postJson(route('admin.pages.upload-image'), ['image' => UploadedFile::fake()->create('x.svg', 1, 'image/svg+xml')])
            ->assertUnprocessable();
    }

    public function test_only_the_super_admin_manages_pages()
    {
        $page = $this->page('nueva');
        $this->actingAs(User::factory()->forCompany()->create());

        $this->get(route('admin.pages.index'))->assertForbidden();
        $this->post(route('admin.pages.store'))->assertForbidden();
        $this->put(route('admin.pages.update', $page), ['title' => 'X', 'slug' => 'x', 'content' => ['blocks' => []]])->assertForbidden();
        $this->delete(route('admin.pages.destroy', $page))->assertForbidden();
        $this->get(route('admin.site.edit'))->assertForbidden();

        $this->assertModelExists($page);
    }
}
