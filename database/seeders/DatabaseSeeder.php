<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Company;
use App\Models\User;
use App\Models\VotingSetting;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $companies = [
            'Aerostat' => ['https://vuelaengloboaerostat.com/', 'aerostat.png'],
            'Aventuras en Globos' => ['https://www.aventuraenglobos.com/', 'aventuraenglobos.png'],
            'Globo Tetris' => ['https://instagram.com/globo.tetris', 'globo-tetris.png'],
            'Impacto Aéreo' => ['https://www.impactoaereo.com/', 'impacto.png'],
            'Sky Balloons' => ['https://www.skyballoons.mx/', 'skybaloons.png'],
            'Volar en Globo' => ['https://volarenglobo.com.mx/', 'volar-en-globo.png'],
            'Volare' => ['https://volare.com.mx/', 'volare.png'],
            'Volé en Globo' => ['https://instagram.com/voleenglobo', 'vole.png'],
        ];

        foreach ($companies as $name => [$url, $logo]) {
            $company = Company::query()->firstOrCreate(['name' => $name], ['website_url' => $url]);

            $this->seedLogo($company, $logo);
        }

        VotingSetting::current();

        $this->call(SiteContentSeeder::class);

        if (config('fegat.admin.email') && config('fegat.admin.password')) {
            User::query()->updateOrCreate(
                ['email' => config('fegat.admin.email')],
                [
                    'name' => 'Administrador FEGAT',
                    'password' => config('fegat.admin.password'),
                    'role' => UserRole::SuperAdmin,
                    'company_id' => null,
                ],
            )->forceFill(['email_verified_at' => now()])->save();
        }
    }

    /**
     * Copia el logo original de la empresa al disco público, sin pisar uno ya subido.
     */
    private function seedLogo(Company $company, string $file): void
    {
        $source = database_path('seeders/logos/'.$file);

        if ($company->logo_path || ! is_file($source)) {
            return;
        }

        Storage::disk('public')->put('logos/'.$file, file_get_contents($source));
        $company->update(['logo_path' => 'logos/'.$file]);
    }
}
