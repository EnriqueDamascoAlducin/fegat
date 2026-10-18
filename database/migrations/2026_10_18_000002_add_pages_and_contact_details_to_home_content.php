<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('home_sections', function (Blueprint $table) {
            $table->string('page', 30)->default('inicio')->after('id');

            $table->index(['page', 'position']);
        });

        Schema::table('home_contents', function (Blueprint $table) {
            $table->string('contact_email')->nullable()->after('contact_text');
            $table->string('contact_phones')->nullable()->after('contact_email');
            $table->string('contact_hours')->nullable()->after('contact_phones');
            $table->string('contact_address', 500)->nullable()->after('contact_hours');
            $table->string('map_url', 1000)->nullable()->after('contact_address');
            $table->string('facebook_url')->nullable()->after('map_url');
            $table->string('instagram_url')->nullable()->after('facebook_url');
            $table->string('tiktok_url')->nullable()->after('instagram_url');
            $table->string('youtube_url')->nullable()->after('tiktok_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('home_sections', function (Blueprint $table) {
            $table->dropIndex(['page', 'position']);
            $table->dropColumn('page');
        });

        Schema::table('home_contents', function (Blueprint $table) {
            $table->dropColumn([
                'contact_email', 'contact_phones', 'contact_hours', 'contact_address', 'map_url',
                'facebook_url', 'instagram_url', 'tiktok_url', 'youtube_url',
            ]);
        });
    }
};
