<?php

namespace Tests\Feature;

use App\Models\BlogCategory;
use App\Models\BlogTag;
use App\Models\HomeContent;
use App\Models\Page;
use App\Models\Post;
use App\Models\User;
use App\Support\BlogSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BlogTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Las pantallas nuevas aún no están en el manifest del último build.
        $this->withoutVite();
        Storage::fake('public');
    }

    private function image(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('portada.png', file_get_contents(public_path('icons/icon-192.png')));
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function article(array $attributes = []): Post
    {
        static $n = 0;
        $n++;

        return Post::query()->create([
            'title' => "Artículo {$n}",
            'slug' => "articulo-{$n}",
            'excerpt' => 'Resumen',
            'body' => '<p>Texto del artículo.</p>',
            'status' => Post::PUBLISHED,
            'published_at' => now()->subDay(),
            ...$attributes,
        ]);
    }

    public function test_the_super_admin_publishes_a_classified_post_with_a_cover()
    {
        $admin = User::factory()->superAdmin()->create(['name' => 'Ana Ruiz']);
        $category = BlogCategory::query()->create(['name' => 'Eventos', 'slug' => 'eventos']);
        $tag = BlogTag::query()->create(['name' => 'Seguridad', 'slug' => 'seguridad']);

        $response = $this->actingAs($admin)->post(route('admin.posts.store'), [
            'title' => 'Temporada de vuelos 2026',
            'body' => '<p>Ya comenzó la <strong>temporada</strong>.</p><script>alert(1)</script>',
            'cover' => $this->image(),
            'status' => 'published',
            'user_id' => $admin->id,
            'category_id' => $category->id,
            'tag_ids' => [$tag->id],
            'is_featured' => '1',
            'meta_title' => 'Temporada 2026 | FEGAT',
        ]);

        $post = Post::query()->sole();
        $response->assertRedirect(route('admin.posts.edit', $post))->assertSessionHasNoErrors();
        $this->assertSame('temporada-de-vuelos-2026', $post->slug);
        $this->assertSame('Ya comenzó la temporada.', $post->excerpt);
        $this->assertStringNotContainsString('script', $post->body);
        $this->assertTrue($post->isPublished());
        $this->assertTrue($post->is_featured);
        $this->assertSame([$tag->id], $post->tags()->pluck('blog_tags.id')->all());
        Storage::disk('public')->assertExists($post->cover_image_path);
        auth()->logout();

        // Destacado: aparece aparte y no se repite en la cuadrícula.
        $this->get(route('blog.index'))->assertInertia(fn (Assert $page) => $page
            ->component('blog/index')
            ->where('featured.title', 'Temporada de vuelos 2026')
            ->where('featured.category', 'Eventos')
            ->where('featured.author', 'Ana Ruiz')
            ->where('posts.data', [])
            ->where('categories.0.url', '/blog/categoria/eventos')
            ->where('tags.0.name', 'Seguridad'));

        $this->get(route('blog.show', $post))->assertInertia(fn (Assert $page) => $page
            ->component('blog/show')
            ->where('post.body', '<p>Ya comenzó la <strong>temporada</strong>.</p>')
            ->where('post.is_draft', false)
            ->where('post.tags.0.url', '/blog/etiqueta/seguridad')
            ->where('post.read_time', 1)
            ->where('seo.title', 'Temporada 2026 | FEGAT'));

        $this->get(route('home'))->assertInertia(fn (Assert $page) => $page
            ->where('posts.0.slug', 'temporada-de-vuelos-2026'));
    }

    public function test_drafts_and_scheduled_posts_are_hidden_but_previewable()
    {
        $admin = User::factory()->superAdmin()->create();
        $this->travelTo('2026-10-01 10:00');

        $draft = $this->article(['status' => Post::DRAFT, 'published_at' => null]);
        $scheduled = $this->article(['published_at' => '2026-10-10 09:00']);

        $this->assertSame('draft', $draft->publicationState());
        $this->assertSame('scheduled', $scheduled->publicationState());

        $this->get(route('blog.show', $draft))->assertNotFound();
        $this->get(route('blog.show', $scheduled))->assertNotFound();
        $this->get(route('blog.index'))->assertInertia(fn (Assert $page) => $page->where('posts.data', []));
        $this->get(route('home'))->assertInertia(fn (Assert $page) => $page->where('posts', []));

        $this->actingAs($admin)->get(route('blog.show', $scheduled))->assertInertia(fn (Assert $page) => $page
            ->where('post.is_draft', true)
            ->where('post.state', 'scheduled'));
        auth()->logout();

        $this->travelTo('2026-10-10 09:01');
        $this->get(route('blog.show', $scheduled))->assertOk();
    }

    public function test_editing_keeps_the_publication_date_and_validates_the_address()
    {
        $this->actingAs(User::factory()->superAdmin()->create());
        $this->travelTo('2026-10-01 10:00');

        $first = $this->article(['published_at' => now()]);
        $second = $this->article();

        $this->travelTo('2026-10-05 10:00');
        $this->put(route('admin.posts.update', $first), [
            'title' => 'Título corregido',
            'slug' => 'titulo-corregido',
            'excerpt' => 'Resumen propio.',
            'body' => '<p>Texto nuevo.</p>',
            'status' => 'published',
        ])->assertSessionHasNoErrors();

        $first->refresh();
        $this->assertSame('titulo-corregido', $first->slug);
        $this->assertSame('Resumen propio.', $first->excerpt);
        $this->assertSame('2026-10-01', $first->published_at->toDateString());

        $this->put(route('admin.posts.update', $first), [
            'title' => 'X', 'slug' => $second->slug, 'body' => '<p>x</p>', 'status' => 'published',
        ])->assertSessionHasErrors('slug');
        $this->put(route('admin.posts.update', $first), ['title' => 'X', 'slug' => 'Con Espacios', 'body' => '<p>x</p>', 'status' => 'draft'])
            ->assertSessionHasErrors('slug');
        $this->put(route('admin.posts.update', $first), ['title' => 'X', 'body' => '<p></p>', 'status' => 'draft'])
            ->assertSessionHasErrors('body');

        $this->put(route('admin.posts.update', $first), ['title' => 'Título corregido', 'body' => '<p>Texto.</p>', 'status' => 'draft']);
        $this->assertFalse($first->refresh()->isPublished());
        $this->assertSame('titulo-corregido', $first->slug);
    }

    public function test_the_index_searches_paginates_and_filters_by_category_and_tag()
    {
        $events = BlogCategory::query()->create(['name' => 'Eventos', 'slug' => 'eventos', 'description' => 'Lo que viene.']);
        $hidden = BlogCategory::query()->create(['name' => 'Interna', 'slug' => 'interna', 'is_active' => false]);
        $tag = BlogTag::query()->create(['name' => 'Festival', 'slug' => 'festival']);

        $festival = $this->article(['title' => 'Festival del globo', 'category_id' => $events->id]);
        $festival->tags()->attach($tag);
        $this->article(['title' => 'Nueva circular']);
        $this->article(['title' => 'Otro aviso']);

        HomeContent::current()->update(['blog' => [...BlogSettings::defaults(), 'posts_per_page' => 3, 'show_featured' => false]]);

        $this->get(route('blog.index', ['q' => 'festival']))->assertInertia(fn (Assert $page) => $page
            ->has('posts.data', 1)
            ->where('posts.data.0.title', 'Festival del globo')
            ->where('seo.robots', 'noindex, follow'));

        $this->get('/blog/categoria/eventos')->assertInertia(fn (Assert $page) => $page
            ->where('heading.title', 'Eventos')
            ->where('heading.description', 'Lo que viene.')
            ->where('activeCategory', $events->id)
            ->has('posts.data', 1));

        $this->get('/blog/etiqueta/festival')->assertInertia(fn (Assert $page) => $page
            ->where('heading.title', 'Festival')
            ->has('posts.data', 1));

        $this->get('/blog/categoria/interna')->assertNotFound();
        $this->get('/blog/categoria/no-existe')->assertNotFound();

        $this->get(route('blog.index'))->assertInertia(fn (Assert $page) => $page
            ->has('posts.data', 3)
            ->missing('categories.1'));
        $this->assertSame($hidden->id, BlogCategory::query()->where('is_active', false)->sole()->id);
    }

    public function test_related_posts_and_the_call_to_action_follow_the_settings()
    {
        $category = BlogCategory::query()->create(['name' => 'Eventos', 'slug' => 'eventos']);
        $main = $this->article(['category_id' => $category->id]);
        $sibling = $this->article(['category_id' => $category->id]);
        $this->article();
        $donar = Page::query()->where('slug', 'donar')->sole();

        HomeContent::current()->update(['blog' => [
            ...BlogSettings::defaults(),
            'related_count' => 2,
            'cta' => ['enabled' => true, 'title' => 'Apóyanos', 'label' => 'Donar', 'link_type' => 'page', 'ref_id' => $donar->id, 'url' => '/donar'],
        ]]);
        $donar->update(['slug' => 'apoyar']);

        $this->get(route('blog.show', $main))->assertInertia(fn (Assert $page) => $page
            ->has('related', 1)
            ->where('related.0.id', $sibling->id)
            ->where('cta.url', '/apoyar')
            ->where('cta.label', 'Donar'));
    }

    public function test_the_blog_can_be_turned_off_and_has_an_rss_feed()
    {
        $post = $this->article(['title' => 'Circular & avisos']);

        $this->get(route('blog.feed'))
            ->assertOk()
            ->assertHeader('Content-Type', 'application/rss+xml; charset=UTF-8')
            ->assertSee('Circular &amp; avisos', false)
            ->assertSee(url('/blog/'.$post->slug), false);

        HomeContent::current()->update(['blog' => [...BlogSettings::defaults(), 'enabled' => false]]);

        $this->get(route('blog.index'))->assertNotFound();
        $this->get(route('blog.show', $post))->assertNotFound();
        $this->get(route('blog.feed'))->assertNotFound();
    }

    public function test_the_super_admin_manages_categories_tags_and_settings()
    {
        $this->actingAs(User::factory()->superAdmin()->create());

        $this->post(route('admin.blog.categories.store'), ['name' => 'Noticias del sector', 'is_active' => '1'])->assertSessionHasNoErrors();
        $category = BlogCategory::query()->sole();
        $this->assertSame('noticias-del-sector', $category->slug);

        $this->post(route('admin.blog.categories.store'), ['name' => 'Otra', 'slug' => 'noticias-del-sector'])->assertSessionHasErrors('slug');
        $this->post(route('admin.blog.tags.store'), ['name' => 'Pirámides', 'is_active' => '1'])->assertSessionHasNoErrors();
        $this->assertSame('piramides', BlogTag::query()->sole()->slug);

        $post = $this->article(['category_id' => $category->id]);
        $this->delete(route('admin.blog.categories.destroy', $category))->assertRedirect();
        $this->assertNull($post->refresh()->category_id);

        $this->put(route('admin.blog.settings.update'), [
            'title' => 'Noticias FEGAT',
            'subtitle' => 'Lo último.',
            'posts_per_page' => 99,
            'related_count' => 2,
            'hero_image' => 'javascript:alert(1)',
            'cta' => ['enabled' => true, 'title' => 'Hola', 'label' => 'Ir', 'link_type' => 'custom', 'url' => '/contacto'],
        ])->assertSessionHasErrors('posts_per_page');

        $this->put(route('admin.blog.settings.update'), [
            'title' => 'Noticias FEGAT',
            'posts_per_page' => 6,
            'related_count' => 2,
            'hero_image' => 'javascript:alert(1)',
        ])->assertSessionHasNoErrors();

        $settings = BlogSettings::get();
        $this->assertSame('Noticias FEGAT', $settings['title']);
        $this->assertSame(6, $settings['posts_per_page']);
        $this->assertSame('', $settings['hero_image']);
    }

    public function test_menu_links_can_point_to_blog_categories()
    {
        $category = BlogCategory::query()->create(['name' => 'Eventos', 'slug' => 'eventos']);
        $this->actingAs(User::factory()->superAdmin()->create())->put(route('admin.site.header'), [
            'nav_items' => [['id' => 'a', 'label' => 'Eventos', 'link_type' => 'blog_category', 'ref_id' => $category->id, 'url' => '/blog/categoria/eventos', 'visible' => true]],
        ])->assertSessionHasNoErrors();

        $category->update(['slug' => 'agenda']);
        auth()->logout();

        $this->get('/')->assertInertia(fn (Assert $page) => $page->where('site.header.nav_items.0.url', '/blog/categoria/agenda'));
    }

    public function test_deleting_a_post_removes_its_cover()
    {
        $this->actingAs(User::factory()->superAdmin()->create())
            ->post(route('admin.posts.store'), ['title' => 'Borrar', 'body' => '<p>x</p>', 'status' => 'draft', 'cover' => $this->image()]);
        $post = Post::query()->sole();

        $this->delete(route('admin.posts.destroy', $post))->assertRedirect(route('admin.posts.index'));

        $this->assertSame(0, Post::query()->count());
        Storage::disk('public')->assertMissing($post->cover_image_path);
    }

    public function test_the_admin_list_filters_by_state()
    {
        $this->actingAs(User::factory()->superAdmin()->create());
        $this->article(['title' => 'Publicado']);
        $this->article(['title' => 'Borrador', 'status' => Post::DRAFT]);
        $this->article(['title' => 'Programado', 'published_at' => now()->addWeek()]);

        foreach (['published' => 'Publicado', 'draft' => 'Borrador', 'scheduled' => 'Programado'] as $status => $title) {
            $this->get(route('admin.posts.index', ['status' => $status]))->assertInertia(fn (Assert $page) => $page
                ->has('posts.data', 1)
                ->where('posts.data.0.title', $title)
                ->where('posts.data.0.state', $status));
        }

        $this->get(route('admin.posts.index', ['search' => 'progra']))->assertInertia(fn (Assert $page) => $page->has('posts.data', 1));
    }

    public function test_only_the_super_admin_manages_the_blog()
    {
        $user = User::factory()->forCompany()->create();
        $post = $this->article(['title' => 'Hola']);
        $category = BlogCategory::query()->create(['name' => 'Eventos', 'slug' => 'eventos']);
        $this->actingAs($user);

        $this->get(route('admin.posts.index'))->assertForbidden();
        $this->get(route('admin.posts.create'))->assertForbidden();
        $this->post(route('admin.posts.store'), ['title' => 'X', 'body' => '<p>Y</p>', 'status' => 'draft'])->assertForbidden();
        $this->put(route('admin.posts.update', $post), ['title' => 'X', 'body' => '<p>Y</p>', 'status' => 'draft'])->assertForbidden();
        $this->delete(route('admin.posts.destroy', $post))->assertForbidden();
        $this->postJson(route('admin.posts.image'), ['image' => $this->image()])->assertForbidden();
        $this->get(route('admin.blog.taxonomies'))->assertForbidden();
        $this->delete(route('admin.blog.categories.destroy', $category))->assertForbidden();
        $this->get(route('admin.blog.settings.edit'))->assertForbidden();

        $this->assertSame('Hola', $post->refresh()->title);
        $this->assertModelExists($category);

        $admin = User::factory()->superAdmin()->create();
        $this->actingAs($admin)->get(route('admin.posts.index'))->assertOk();
        $this->actingAs($admin)->get(route('admin.posts.create'))->assertOk();
        $this->actingAs($admin)->get(route('admin.posts.edit', $post))->assertOk();
        $this->actingAs($admin)->get(route('admin.blog.taxonomies'))->assertOk();
        $this->actingAs($admin)->get(route('admin.blog.settings.edit'))->assertOk();
    }
}
