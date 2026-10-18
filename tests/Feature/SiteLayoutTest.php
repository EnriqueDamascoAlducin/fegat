<?php

namespace Tests\Feature;

use App\Models\HomeContent;
use App\Models\Page;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SiteLayoutTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_the_header_menu_is_saved_and_follows_page_slugs()
    {
        $this->actingAs(User::factory()->superAdmin()->create());
        $nosotros = Page::query()->where('slug', 'nosotros')->sole();

        $this->put(route('admin.site.header'), [
            'background_color' => '#112233',
            'logo_size' => 200,
            'nav_items' => [
                ['id' => 'a', 'label' => 'Nosotros', 'link_type' => 'page', 'ref_id' => $nosotros->id, 'url' => '/nosotros', 'visible' => true, 'children' => [
                    ['id' => 'a1', 'label' => 'Blog', 'link_type' => 'blog'],
                ]],
                ['id' => 'b', 'label' => 'Oculto', 'link_type' => 'custom', 'url' => '/x', 'visible' => false],
                ['id' => 'c', 'label' => 'Malo', 'link_type' => 'custom', 'url' => 'javascript:alert(1)', 'visible' => true],
            ],
            'cta' => ['enabled' => true, 'label' => 'Donar', 'link_type' => 'custom', 'url' => '/donar'],
        ])->assertSessionHasNoErrors();

        $header = HomeContent::current()->header;
        $this->assertSame('#112233', $header['background_color']);
        $this->assertSame(60, $header['logo_size']);
        $this->assertCount(3, $header['nav_items']);

        $nosotros->update(['slug' => 'quienes-somos']);
        auth()->logout();

        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->has('site.header.nav_items', 2)
            ->where('site.header.nav_items.0.url', '/quienes-somos')
            ->where('site.header.nav_items.0.children.0.url', '/blog')
            ->where('site.header.nav_items.1.url', '')
            ->where('site.header.cta.label', 'Donar'));
    }

    public function test_menu_options_need_a_label()
    {
        $this->actingAs(User::factory()->superAdmin()->create());

        $this->put(route('admin.site.header'), ['nav_items' => [['label' => '']]])->assertSessionHasErrors('nav_items.0.label');
    }

    public function test_the_footer_and_contact_details_are_shared_with_every_page()
    {
        $this->actingAs(User::factory()->superAdmin()->create());

        $this->put(route('admin.site.footer'), [
            'description' => 'Federación',
            'copyright' => 'FEGAT A.C.',
            'columns' => [['id' => 'x', 'title' => 'Enlaces', 'links' => [['id' => 'l', 'label' => 'Blog', 'link_type' => 'blog']]]],
        ])->assertSessionHasNoErrors();

        $this->put(route('admin.site.contact'), [
            'contact_email' => 'contacto@fegat.mx',
            'facebook_url' => 'https://facebook.com/fegat',
        ])->assertSessionHasNoErrors();

        $this->put(route('admin.site.contact'), ['instagram_url' => 'javascript:alert(1)'])->assertSessionHasErrors('instagram_url');

        auth()->logout();

        $this->get('/blog')->assertInertia(fn (Assert $page) => $page
            ->where('site.footer.copyright', 'FEGAT A.C.')
            ->where('site.footer.columns.0.links.0.url', '/blog')
            ->where('site.contact.email', 'contacto@fegat.mx')
            ->where('site.socials.facebook', 'https://facebook.com/fegat'));

        $this->get('/contacto')->assertInertia(fn (Assert $page) => $page
            ->where('contact.contact_email', 'contacto@fegat.mx'));
    }
}
