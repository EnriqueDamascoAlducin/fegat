<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\VotingSetting;
use App\Support\WhatsApp\DailySummary;
use App\Support\WhatsApp\VotingMessages;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class VotingSettingController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('admin/voting-settings', [
            'settings' => VotingSetting::current()->only(['min_votes', 'opens_at', 'closes_at', 'public_visible', 'whatsapp_enabled', 'reminder_first_at', 'reminder_second_at', 'summary_enabled', 'summary_at']),
            'whatsapp' => [
                'configured' => VotingMessages::isReady(),
                'summary_configured' => DailySummary::isReady(),
                'admins_with_phone' => User::query()
                    ->where('role', UserRole::SuperAdmin)
                    ->whereNotNull('phone')
                    ->count(),
                'test_phone' => $request->user()->phone,
                'webhook_url' => route('webhooks.twilio.whatsapp'),
                'with_phone' => User::query()
                    ->where('role', UserRole::CompanyAdmin)
                    ->whereNotNull('phone')
                    ->whereHas('company', fn ($query) => $query->where('is_active', true))
                    ->count(),
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'min_votes' => ['required', 'integer', 'min:1', 'max:100'],
            'opens_at' => ['required', 'date_format:H:i'],
            'closes_at' => ['required', 'date_format:H:i', 'different:opens_at'],
            'reminder_first_at' => ['nullable', 'date_format:H:i'],
            'reminder_second_at' => ['nullable', 'date_format:H:i', 'different:reminder_first_at'],
            'summary_at' => ['nullable', 'date_format:H:i'],
        ]);

        $settings = VotingSetting::current();
        $first = $validated['reminder_first_at'] ?? $settings->reminder_first_at;
        // Si el formulario no trae el campo se conserva; vacío significa un solo envío.
        $second = $request->has('reminder_second_at') ? ($validated['reminder_second_at'] ?? null) : $settings->reminder_second_at;

        // Cada recordatorio debe caer mientras la votación está abierta y el
        // segundo después del primero; si no, nunca saldría.
        if ($request->boolean('whatsapp_enabled')) {
            $window = new VotingSetting(['opens_at' => $validated['opens_at'], 'closes_at' => $validated['closes_at']]);
            $outside = 'Debe estar entre la apertura y el cierre de la votación.';

            $errors = array_filter([
                'reminder_first_at' => $window->isWithinVoting($first) ? null : $outside,
                'reminder_second_at' => match (true) {
                    $second === null => null,
                    ! $window->isWithinVoting($second) => $outside,
                    $window->minutesAfterOpening($second) <= $window->minutesAfterOpening($first) => 'Debe ser después del primer envío.',
                    default => null,
                },
            ]);

            if ($errors !== []) {
                throw ValidationException::withMessages($errors);
            }
        }

        $settings->update([
            ...$validated,
            'reminder_first_at' => $first,
            'reminder_second_at' => $second,
            'summary_at' => $validated['summary_at'] ?? $settings->summary_at,
            'public_visible' => $request->boolean('public_visible'),
            'whatsapp_enabled' => $request->boolean('whatsapp_enabled'),
            'summary_enabled' => $request->boolean('summary_enabled'),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Configuración guardada.']);

        return to_route('admin.voting.edit');
    }
}
