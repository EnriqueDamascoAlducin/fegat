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
        Schema::create('final_decisions', function (Blueprint $table) {
            $table->id();
            // Una sola decisión por jornada; cambiarla actualiza este registro.
            $table->date('flight_date')->unique();
            $table->string('color');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('final_decision_changes', function (Blueprint $table) {
            $table->id();
            $table->date('flight_date')->index();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('user_name');
            $table->string('from_color')->nullable();
            // Vacío cuando el decisor retira su decisión.
            $table->string('to_color')->nullable();
            $table->timestamp('created_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('final_decision_changes');
        Schema::dropIfExists('final_decisions');
    }
};
