<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\Vote;
use App\Models\VotingSetting;
use App\Services\Semaphore;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Panel: la empresa ve solo su voto; el super admin ve el detalle completo.
     */
    public function __invoke(Request $request, Semaphore $semaphore): Response
    {
        $user = $request->user();
        $status = $semaphore->status();

        return Inertia::render('dashboard', [
            'semaphore' => $status,
            'canVote' => $user->canVote(),
            'publicVisible' => VotingSetting::current()->public_visible,
            'myVote' => $user->canVote()
                ? Vote::query()
                    ->where('company_id', $user->company_id)
                    ->where('flight_date', $status['flight_date'])
                    ->value('color')
                : null,
            'detail' => $user->isSuperAdmin() ? [
                'counts' => $semaphore->counts($status['flight_date']),
                'votes' => $this->votesByCompany($status['flight_date']),
            ] : null,
        ]);
    }

    /**
     * @return list<array{company: string, color: string|null, voted_by: string|null, voted_at: string|null}>
     */
    private function votesByCompany(string $flightDate): array
    {
        return Company::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->with(['votes' => fn ($query) => $query->where('flight_date', $flightDate)->with('user:id,name')])
            ->get()
            ->map(function (Company $company) {
                $vote = $company->votes->first();

                return [
                    'company' => $company->name,
                    'color' => $vote?->color->value,
                    'voted_by' => $vote?->user?->name,
                    'voted_at' => $vote?->updated_at?->format('H:i'),
                ];
            })
            ->all();
    }
}
