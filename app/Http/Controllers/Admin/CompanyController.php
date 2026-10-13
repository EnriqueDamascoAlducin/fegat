<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CompanyController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/companies', [
            'companies' => Company::query()
                ->withCount('users')
                ->orderBy('name')
                ->get(['id', 'name', 'website_url', 'logo_path', 'is_active']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $company = Company::query()->create($this->validated($request));
        $this->syncLogo($request, $company);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Empresa agregada.']);

        return to_route('admin.companies.index');
    }

    public function update(Request $request, Company $company): RedirectResponse
    {
        $company->update($this->validated($request, $company));
        $this->syncLogo($request, $company);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Empresa actualizada.']);

        return to_route('admin.companies.index');
    }

    /**
     * @return array{name: string, website_url: string|null, is_active: bool}
     */
    private function validated(Request $request, ?Company $company = null): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique(Company::class)->ignore($company)],
            'website_url' => ['nullable', 'url', 'max:255'],
            'logo' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
        ]);

        return [
            'name' => $validated['name'],
            'website_url' => $validated['website_url'] ?? null,
            'is_active' => $request->boolean('is_active'),
        ];
    }

    /**
     * Guarda el logo nuevo (borrando el anterior) o lo quita si así se pidió.
     */
    private function syncLogo(Request $request, Company $company): void
    {
        $previous = $company->logo_path;

        if ($request->hasFile('logo')) {
            $company->update(['logo_path' => $request->file('logo')->store('logos', 'public')]);
        } elseif ($request->boolean('remove_logo')) {
            $company->update(['logo_path' => null]);
        } else {
            return;
        }

        if ($previous) {
            Storage::disk('public')->delete($previous);
        }
    }
}
