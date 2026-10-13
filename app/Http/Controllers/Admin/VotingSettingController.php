<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\VotingSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VotingSettingController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('admin/voting-settings', [
            'settings' => VotingSetting::current()->only(['min_votes', 'opens_at', 'closes_at', 'public_visible']),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'min_votes' => ['required', 'integer', 'min:1', 'max:100'],
            'opens_at' => ['required', 'date_format:H:i'],
            'closes_at' => ['required', 'date_format:H:i', 'different:opens_at'],
        ]);

        VotingSetting::current()->update([
            ...$validated,
            'public_visible' => $request->boolean('public_visible'),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Configuración guardada.']);

        return to_route('admin.voting.edit');
    }
}
