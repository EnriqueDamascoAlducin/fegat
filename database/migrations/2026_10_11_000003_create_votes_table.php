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
        Schema::create('votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained();
            $table->date('flight_date');
            $table->string('color');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            // Un solo voto por empresa y jornada: cambiar de opinión actualiza este registro.
            $table->unique(['company_id', 'flight_date']);
            $table->index('flight_date');
        });

        Schema::create('vote_changes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vote_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained();
            $table->date('flight_date');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('user_name');
            $table->string('from_color')->nullable();
            $table->string('to_color');
            $table->timestamp('created_at')->nullable();

            $table->index('flight_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vote_changes');
        Schema::dropIfExists('votes');
    }
};
