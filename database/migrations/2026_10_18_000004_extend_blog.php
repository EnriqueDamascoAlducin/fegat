<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Blog completo (port de sav_3): categorías, etiquetas, estado con fecha programada,
 * destacado, SEO por artículo y configuración del índice.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('blog_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('slug', 120)->unique();
            $table->string('description', 2000)->nullable();
            $table->string('meta_title')->nullable();
            $table->string('meta_description', 500)->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('blog_tags', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('slug', 120)->unique();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->string('status', 20)->default('draft')->after('id');
            $table->foreignId('category_id')->nullable()->after('user_id')->constrained('blog_categories')->nullOnDelete();
            $table->boolean('is_featured')->default(false)->after('category_id');
            $table->string('excerpt', 1000)->default('')->change();
            $table->string('cover_alt')->nullable()->after('cover_image_path');
            $table->string('meta_title')->nullable();
            $table->string('meta_description', 500)->nullable();
            $table->string('meta_keywords', 500)->nullable();
            $table->string('og_title')->nullable();
            $table->string('og_description', 500)->nullable();
            $table->string('canonical_url', 2048)->nullable();

            $table->index(['status', 'published_at']);
        });

        // Antes «publicado» era tener fecha de publicación.
        DB::table('posts')->whereNotNull('published_at')->update(['status' => 'published']);

        Schema::create('blog_post_tag', function (Blueprint $table) {
            $table->foreignId('post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('blog_tag_id')->constrained()->cascadeOnDelete();
            $table->primary(['post_id', 'blog_tag_id']);
        });

        Schema::table('home_contents', function (Blueprint $table) {
            $table->longText('blog')->nullable()->after('footer');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('home_contents', function (Blueprint $table) {
            $table->dropColumn('blog');
        });

        Schema::dropIfExists('blog_post_tag');

        Schema::table('posts', function (Blueprint $table) {
            $table->dropIndex(['status', 'published_at']);
            $table->dropConstrainedForeignId('category_id');
            $table->dropColumn([
                'status', 'is_featured', 'cover_alt', 'meta_title', 'meta_description', 'meta_keywords',
                'og_title', 'og_description', 'canonical_url',
            ]);
        });

        Schema::dropIfExists('blog_tags');
        Schema::dropIfExists('blog_categories');
    }
};
