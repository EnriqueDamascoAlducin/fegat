<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CompanyLogoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
    }

    private function logo(string $name = 'logo.png'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, file_get_contents(public_path('icons/icon-192.png')));
    }

    public function test_the_super_admin_can_upload_and_replace_a_company_logo()
    {
        $admin = User::factory()->superAdmin()->create();
        $company = Company::factory()->create();
        $payload = ['name' => $company->name, 'website_url' => $company->website_url, 'is_active' => '1'];

        $this->actingAs($admin)
            ->put(route('admin.companies.update', $company), [...$payload, 'logo' => $this->logo()])
            ->assertRedirect(route('admin.companies.index'));

        $first = $company->refresh()->logo_path;
        $this->assertNotNull($first);
        Storage::disk('public')->assertExists($first);
        $this->assertSame('/storage/'.$first, $company->logo_url);

        $this->actingAs($admin)->put(route('admin.companies.update', $company), [...$payload, 'logo' => $this->logo()]);

        $second = $company->refresh()->logo_path;
        $this->assertNotSame($first, $second);
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($second);

        $this->actingAs($admin)->put(route('admin.companies.update', $company), [...$payload, 'remove_logo' => '1']);

        $this->assertNull($company->refresh()->logo_path);
        Storage::disk('public')->assertMissing($second);
    }

    public function test_editing_a_company_without_a_new_file_keeps_its_logo()
    {
        $admin = User::factory()->superAdmin()->create();
        $company = Company::factory()->create(['logo_path' => 'logos/actual.png']);

        $this->actingAs($admin)->put(route('admin.companies.update', $company), [
            'name' => 'Nuevo nombre',
            'is_active' => '1',
        ]);

        $this->assertSame('logos/actual.png', $company->refresh()->logo_path);
        $this->assertSame('Nuevo nombre', $company->name);
    }

    public function test_the_logo_must_be_an_image()
    {
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)
            ->post(route('admin.companies.store'), [
                'name' => 'Empresa nueva',
                'is_active' => '1',
                'logo' => UploadedFile::fake()->create('logo.pdf', 10, 'application/pdf'),
            ])
            ->assertSessionHasErrors('logo');

        $this->assertDatabaseMissing('companies', ['name' => 'Empresa nueva']);
    }

    public function test_company_admins_cannot_change_logos()
    {
        $user = User::factory()->forCompany()->create();

        $this->actingAs($user)
            ->put(route('admin.companies.update', $user->company), ['name' => 'X', 'logo' => $this->logo()])
            ->assertForbidden();
    }
}
