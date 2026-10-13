<?php

namespace Tests\Feature;

use App\Models\HomeContent;
use App\Models\HomeSection;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HomeContentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
    }

    private function image(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('foto.png', file_get_contents(public_path('icons/icon-192.png')));
    }

    public function test_the_home_page_starts_with_the_original_texts()
    {
        $this->get(route('home'))->assertInertia(fn (Assert $page) => $page
            ->where('content.hero_title', 'Federación de Globos Aerostáticos Teotihuacan A.C')
            ->where('content.contact_text', 'Contáctanos para cualquier duda y/o aclaración.')
            ->where('sections', []));
    }

    public function test_the_super_admin_can_edit_the_home_texts_and_hero_image()
    {
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)->put(route('admin.home.update'), [
            'hero_title' => 'FEGAT Teotihuacan',
            'hero_text' => 'Vuela seguro con empresas certificadas.',
            'semaphore_text' => 'Texto del semáforo.',
            'contact_text' => 'Escríbenos.',
            'hero_image' => $this->image(),
        ])->assertRedirect(route('admin.home.edit'))->assertSessionHasNoErrors();

        $path = HomeContent::current()->hero_image_path;
        Storage::disk('public')->assertExists($path);
        auth()->logout();

        $this->get(route('home'))->assertInertia(fn (Assert $page) => $page
            ->where('content.hero_title', 'FEGAT Teotihuacan')
            ->where('content.hero_text', 'Vuela seguro con empresas certificadas.')
            ->where('heroImage', '/storage/'.$path));
    }

    public function test_sections_can_be_added_hidden_reordered_and_deleted()
    {
        $admin = User::factory()->superAdmin()->create();
        $this->actingAs($admin);

        $this->post(route('admin.sections.store'), ['title' => 'Por qué elegirnos', 'body' => 'Seguridad.', 'is_visible' => '1', 'image' => $this->image()]);
        $this->post(route('admin.sections.store'), ['title' => 'Historia', 'body' => 'Desde 2010.', 'is_visible' => '1']);
        $this->post(route('admin.sections.store'), ['title' => 'Borrador', 'body' => 'Pendiente.']);

        [$why, $history, $draft] = HomeSection::query()->orderBy('position')->get()->all();
        Storage::disk('public')->assertExists($why->image_path);

        $titles = fn () => HomeSection::query()->orderBy('position')->pluck('title')->all();
        $this->assertSame(['Por qué elegirnos', 'Historia', 'Borrador'], $titles());

        $this->post(route('admin.sections.move', $history), ['direction' => 'up']);
        $this->assertSame(['Historia', 'Por qué elegirnos', 'Borrador'], $titles());

        $this->post(route('admin.sections.move', $history), ['direction' => 'up']);
        $this->assertSame(['Historia', 'Por qué elegirnos', 'Borrador'], $titles());

        auth()->logout();
        $this->get(route('home'))->assertInertia(fn (Assert $page) => $page
            ->has('sections', 2)
            ->where('sections.0.title', 'Historia')
            ->where('sections.1.title', 'Por qué elegirnos')
            ->where('sections.1.image_url', '/storage/'.$why->image_path));

        $this->actingAs($admin)->delete(route('admin.sections.destroy', $why));

        $this->assertDatabaseMissing('home_sections', ['id' => $why->id]);
        Storage::disk('public')->assertMissing($why->image_path);
        $this->assertFalse($draft->refresh()->is_visible);
    }

    public function test_only_the_super_admin_can_edit_the_home_page()
    {
        $user = User::factory()->forCompany()->create();
        $section = HomeSection::query()->create(['title' => 'Historia', 'body' => 'Texto']);

        $this->actingAs($user)->get(route('admin.home.edit'))->assertForbidden();
        $this->actingAs($user)->put(route('admin.home.update'), ['hero_title' => 'X'])->assertForbidden();
        $this->actingAs($user)->post(route('admin.sections.store'), ['title' => 'X', 'body' => 'Y'])->assertForbidden();
        $this->actingAs($user)->delete(route('admin.sections.destroy', $section))->assertForbidden();

        $this->assertSame('Federación de Globos Aerostáticos Teotihuacan A.C', HomeContent::current()->hero_title);
        $this->assertSame(1, HomeSection::query()->count());
    }

    public function test_the_section_text_is_sanitized_and_cannot_be_empty()
    {
        $this->actingAs(User::factory()->superAdmin()->create());

        $this->post(route('admin.sections.store'), [
            'title' => 'Con formato',
            'body' => '<h3>Hola</h3><p onclick="x()">Texto <strong>fuerte</strong> <a href="https://fegat.mx">sitio</a> <a href="javascript:alert(1)">malo</a></p><script>alert(1)</script><ul><li>Uno</li></ul>',
            'is_visible' => '1',
        ])->assertSessionHasNoErrors();

        $body = HomeSection::query()->sole()->body;

        $this->assertStringContainsString('<h3>Hola</h3>', $body);
        $this->assertStringContainsString('<strong>fuerte</strong>', $body);
        $this->assertStringContainsString('<li>Uno</li>', $body);
        $this->assertStringContainsString('href="https://fegat.mx"', $body);
        $this->assertStringContainsString('rel="noopener noreferrer"', $body);
        $this->assertStringNotContainsString('script', $body);
        $this->assertStringNotContainsString('onclick', $body);
        $this->assertStringNotContainsString('javascript:', $body);

        $this->post(route('admin.sections.store'), ['title' => 'Vacía', 'body' => '<p></p>'])
            ->assertSessionHasErrors('body');

        $this->assertSame(1, HomeSection::query()->count());
    }

    public function test_extra_formatting_is_kept_but_unsafe_styles_are_removed()
    {
        $this->actingAs(User::factory()->superAdmin()->create());

        $this->post(route('admin.sections.store'), [
            'title' => 'Formato',
            'body' => '<h2 style="text-align: center; position: fixed">Título</h2>'
                .'<p><span style="color: #6c0ea3; background: url(https://x.test/a.png)">Morado</span> <mark>resaltado</mark> <s>tachado</s></p>'
                .'<hr><p style="text-align: right">Derecha</p>'
                .'<img src="/storage/home/contenido/foto.png" alt="Globo" onerror="x()">'
                .'<img src="javascript:alert(1)">',
            'is_visible' => '1',
        ])->assertSessionHasNoErrors();

        $body = HomeSection::query()->sole()->body;

        $this->assertStringContainsString('<h2 style="text-align: center">Título</h2>', $body);
        $this->assertStringContainsString('<span style="color: #6c0ea3">Morado</span>', $body);
        $this->assertStringContainsString('<mark>resaltado</mark>', $body);
        $this->assertStringContainsString('<s>tachado</s>', $body);
        $this->assertStringContainsString('<p style="text-align: right">Derecha</p>', $body);
        $this->assertStringContainsString('src="/storage/home/contenido/foto.png"', $body);
        $this->assertStringContainsString('<hr', $body);
        $this->assertStringNotContainsString('position', $body);
        $this->assertStringNotContainsString('url(', $body);
        $this->assertStringNotContainsString('onerror', $body);
        $this->assertStringNotContainsString('javascript:', $body);
    }

    public function test_the_super_admin_can_upload_images_for_the_section_text()
    {
        $this->actingAs(User::factory()->superAdmin()->create())
            ->postJson(route('admin.sections.image'), ['image' => $this->image()])
            ->assertOk()
            ->assertJsonStructure(['url']);

        $this->assertCount(1, Storage::disk('public')->files('home/contenido'));

        $this->postJson(route('admin.sections.image'), [
            'image' => UploadedFile::fake()->create('nota.pdf', 10, 'application/pdf'),
        ])->assertUnprocessable();

        $this->actingAs(User::factory()->forCompany()->create())
            ->postJson(route('admin.sections.image'), ['image' => $this->image()])
            ->assertForbidden();
    }
}
