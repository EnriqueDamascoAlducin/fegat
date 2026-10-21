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
use Inertia\Inertia;
use Inertia\Response;

class VotingSettingController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('admin/voting-settings', [
            'settings' => VotingSetting::current()->only(['min_votes', 'opens_at', 'closes_at', 'public_visible', 'whatsapp_enabled', 'summary_enabled', 'summary_at']),
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
            'summary_at' => ['nullable', 'date_format:H:i'],
        ]);

        $settings = VotingSetting::current();

        $settings->update([
            ...$validated,
            'summary_at' => $validated['summary_at'] ?? $settings->summary_at,
            'public_visible' => $request->boolean('public_visible'),
            'whatsapp_enabled' => $request->boolean('whatsapp_enabled'),
            'summary_enabled' => $request->boolean('summary_enabled'),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Configuración guardada.']);

        return to_route('admin.voting.edit');
    }
}
