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
        // Sistemas externos (por ejemplo sav_3) que consultan la API del semáforo.
        Schema::create('api_clients', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            // Solo se guarda el hash: la llave completa se muestra una vez al crearla.
            $table->char('token_hash', 64)->unique();
            $table->string('token_prefix', 16);
            $table->json('allowed_ips')->nullable();
            $table->json('allowed_origins')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_used_at')->nullable();
            $table->string('last_used_ip', 45)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('api_clients');
    }
};
