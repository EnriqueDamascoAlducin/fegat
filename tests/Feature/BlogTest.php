<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
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

        Storage::fake('public');
    }

    private function image(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('portada.png', file_get_contents(public_path('icons/icon-192.png')));
    }

    public function test_the_super_admin_can_publish_a_post_with_a_cover()
    {
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)->post(route('admin.posts.store'), [
            'title' => 'Temporada de vuelos 2026',
            'body' => '<p>Ya comenzó la <strong>temporada</strong>.</p><script>alert(1)</script>',
            'cover' => $this->image(),
            'published' => '1',
        ])->assertRedirect(route('admin.posts.index'))->assertSessionHasNoErrors();

        $post = Post::query()->sole();
        $this->assertSame('temporada-de-vuelos-2026', $post->slug);
        $this->assertSame('Ya comenzó la temporada.', $post->excerpt);
        $this->assertStringNotContainsString('script', $post->body);
        $this->assertTrue($post->isPublished());
        Storage::disk('public')->assertExists($post->cover_image_path);
        auth()->logout();

        $this->get(route('blog.index'))->assertInertia(fn (Assert $page) => $page
            ->component('blog/index')
            ->where('posts.data.0.title', 'Temporada de vuelos 2026'));

        $this->get(route('blog.show', $post))->assertInertia(fn (Assert $page) => $page
            ->component('blog/show')
            ->where('post.body', '<p>Ya comenzó la <strong>temporada</strong>.</p>')
            ->where('post.is_draft', false));

        $this->get(route('home'))->assertInertia(fn (Assert $page) => $page
            ->where('posts.0.slug', 'temporada-de-vuelos-2026'));
    }

    public function test_drafts_are_hidden_from_visitors_but_previewable_by_the_super_admin()
    {
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)->post(route('admin.posts.store'), ['title' => 'En preparación', 'body' => '<p>Pronto.</p>']);
        $post = Post::query()->sole();
        $this->assertFalse($post->isPublished());

        $this->get(route('blog.show', $post))->assertInertia(fn (Assert $page) => $page->where('post.is_draft', true));
        auth()->logout();

        $this->get(route('blog.show', $post))->assertNotFound();
        $this->get(route('blog.index'))->assertInertia(fn (Assert $page) => $page->where('posts.data', []));
        $this->get(route('home'))->assertInertia(fn (Assert $page) => $page->where('posts', []));
    }

    public function test_editing_keeps_the_address_and_the_original_publication_date()
    {
        $admin = User::factory()->superAdmin()->create();
        $this->actingAs($admin);

        $this->travelTo('2026-10-01 10:00');
        $this->post(route('admin.posts.store'), ['title' => 'Primer título', 'body' => '<p>Texto.</p>', 'published' => '1']);
        $this->post(route('admin.posts.store'), ['title' => 'Primer título', 'body' => '<p>Otro.</p>']);

        [$first, $second] = Post::query()->orderBy('id')->get()->all();
        $this->assertSame('primer-titulo-2', $second->slug);

        $this->travelTo('2026-10-05 10:00');
        $this->put(route('admin.posts.update', $first), [
            'title' => 'Título corregido',
            'excerpt' => 'Resumen propio.',
            'body' => '<p>Texto nuevo.</p>',
            'published' => '1',
        ])->assertRedirect(route('admin.posts.index'));

        $first->refresh();
        $this->assertSame('primer-titulo', $first->slug);
        $this->assertSame('Título corregido', $first->title);
        $this->assertSame('Resumen propio.', $first->excerpt);
        $this->assertSame('2026-10-01', $first->published_at->toDateString());

        $this->put(route('admin.posts.update', $first), ['title' => 'Título corregido', 'body' => '<p>Texto nuevo.</p>']);
        $this->assertNull($first->refresh()->published_at);
    }

    public function test_deleting_a_post_removes_its_cover()
    {
        $admin = User::factory()->superAdmin()->create();
        $this->actingAs($admin)->post(route('admin.posts.store'), ['title' => 'Borrar', 'body' => '<p>x</p>', 'cover' => $this->image()]);
        $post = Post::query()->sole();

        $this->delete(route('admin.posts.destroy', $post))->assertRedirect(route('admin.posts.index'));

        $this->assertSame(0, Post::query()->count());
        Storage::disk('public')->assertMissing($post->cover_image_path);
    }

    public function test_only_the_super_admin_manages_the_blog()
    {
        $user = User::factory()->forCompany()->create();
        $post = Post::query()->create(['title' => 'Hola', 'slug' => 'hola', 'excerpt' => 'Hola', 'body' => '<p>Hola</p>', 'published_at' => now()]);

        $this->actingAs($user)->get(route('admin.posts.index'))->assertForbidden();
        $this->actingAs($user)->get(route('admin.posts.create'))->assertForbidden();
        $this->actingAs($user)->post(route('admin.posts.store'), ['title' => 'X', 'body' => '<p>Y</p>'])->assertForbidden();
        $this->actingAs($user)->put(route('admin.posts.update', $post), ['title' => 'X', 'body' => '<p>Y</p>'])->assertForbidden();
        $this->actingAs($user)->delete(route('admin.posts.destroy', $post))->assertForbidden();
        $this->actingAs($user)->postJson(route('admin.posts.image'), ['image' => $this->image()])->assertForbidden();

        $this->assertSame('Hola', $post->refresh()->title);

        $admin = User::factory()->superAdmin()->create();
        $this->actingAs($admin)->get(route('admin.posts.index'))->assertOk();
        $this->actingAs($admin)->get(route('admin.posts.create'))->assertOk();
        $this->actingAs($admin)->get(route('admin.posts.edit', $post))->assertOk();
    }
}
