<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\VotingSetting;
use App\Services\Semaphore;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    /**
     * Página pública con el semáforo del día.
     */
    public function __invoke(Semaphore $semaphore): Response
    {
        return Inertia::render('welcome', [
            'semaphore' => VotingSetting::current()->public_visible ? $semaphore->status() : null,
            'heroImage' => is_file(public_path('images/fegat-icon.png')) ? '/images/fegat-icon.png' : null,
            'companies' => Company::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'website_url', 'logo_path']),
        ]);
    }
}
