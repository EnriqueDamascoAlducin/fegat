<?php

namespace Tests\Feature;

use App\Models\ApiClient;
use App\Models\User;
use App\Models\VotingSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SemaphoreApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array{0: ApiClient, 1: string}
     */
    private function client(array $attributes = []): array
    {
        $client = new ApiClient(['name' => 'sav_3', 'is_active' => true, ...$attributes]);

        return [$client, $client->issueToken()];
    }

    public function test_a_valid_key_gets_the_semaphore_without_the_vote_breakdown()
    {
        [$client, $token] = $this->client();

        $this->travelTo(now()->setTimeFromTimeString(VotingSetting::current()->opens_at)->addMinutes(5));

        foreach (['green', 'green', 'green'] as $color) {
            $this->actingAs(User::factory()->forCompany()->create())->post(route('votes.store'), ['color' => $color]);
        }
        auth()->logout();

        $this->getJson('/api/semaforo', ['Authorization' => "Bearer {$token}"])
            ->assertOk()
            ->assertJsonPath('status', 'green')
            ->assertJsonPath('title', 'Volamos')
            ->assertJsonPath('votes_count', 3)
            ->assertJsonPath('decided', false)
            ->assertJsonMissingPath('counts')
            ->assertJsonStructure(['flight_date', 'status', 'title', 'description', 'phase', 'opens_at', 'closes_at', 'companies_count', 'generated_at']);

        $this->assertNotNull($client->refresh()->last_used_at);
        // La llave nunca se guarda en claro.
        $this->assertNotSame($token, $client->token_hash);
        $this->assertStringStartsWith('fegat_', $client->token_prefix);

        // También se acepta en X-Api-Key.
        $this->getJson('/api/semaforo', ['X-Api-Key' => $token])->assertOk();
    }

    public function test_missing_wrong_or_disabled_keys_are_rejected()
    {
        [$client, $token] = $this->client();

        $this->getJson('/api/semaforo')->assertUnauthorized();
        $this->getJson('/api/semaforo', ['Authorization' => 'Bearer fegat_inventada'])->assertUnauthorized();
        $this->getJson('/api/semaforo', ['Authorization' => 'Bearer '.substr($token, 0, -1).'x'])->assertUnauthorized();

        $client->update(['is_active' => false]);
        $this->getJson('/api/semaforo', ['Authorization' => "Bearer {$token}"])->assertUnauthorized();
    }

    public function test_ip_and_domain_restrictions_are_enforced_per_key()
    {
        [, $token] = $this->client(['allowed_ips' => ['10.0.0.0/8'], 'allowed_origins' => ['https://sav.ejemplo.com']]);
        $headers = ['Authorization' => "Bearer {$token}"];

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.5'])->getJson('/api/semaforo', $headers)->assertForbidden();

        $this->withServerVariables(['REMOTE_ADDR' => '10.1.2.3'])->getJson('/api/semaforo', $headers)
            ->assertOk()
            ->assertHeaderMissing('Access-Control-Allow-Origin');

        // Desde un navegador: solo los dominios de la lista, y con CORS.
        $this->withServerVariables(['REMOTE_ADDR' => '10.1.2.3'])->getJson('/api/semaforo', [...$headers, 'Origin' => 'https://otro.com'])->assertForbidden();
        $this->withServerVariables(['REMOTE_ADDR' => '10.1.2.3'])->getJson('/api/semaforo', [...$headers, 'Origin' => 'https://SAV.ejemplo.com'])
            ->assertOk()
            ->assertHeader('Access-Control-Allow-Origin', 'https://sav.ejemplo.com');

        $this->call('OPTIONS', '/api/semaforo', server: ['HTTP_ORIGIN' => 'https://sav.ejemplo.com'])
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'https://sav.ejemplo.com');
        $this->call('OPTIONS', '/api/semaforo', server: ['HTTP_ORIGIN' => 'https://otro.com'])->assertForbidden();
    }

    public function test_each_key_is_rate_limited()
    {
        [, $token] = $this->client();

        for ($i = 0; $i < 60; $i++) {
            $this->getJson('/api/semaforo', ['Authorization' => "Bearer {$token}"])->assertOk();
        }

        $this->getJson('/api/semaforo', ['Authorization' => "Bearer {$token}"])->assertTooManyRequests();
    }

    public function test_the_super_admin_creates_edits_rotates_and_deletes_keys()
    {
        $this->actingAs(User::factory()->superAdmin()->create());

        $this->post(route('admin.api-clients.store'), [
            'name' => 'sav_3 producción',
            'allowed_ips' => "203.0.113.10\n198.51.100.0/24",
            'allowed_origins' => 'https://Sav.Ejemplo.com/reservas',
        ])->assertSessionHasNoErrors()->assertInertiaFlash('newToken');

        $client = ApiClient::query()->sole();
        $this->assertSame(['203.0.113.10', '198.51.100.0/24'], $client->allowed_ips);
        $this->assertSame(['https://sav.ejemplo.com'], $client->allowed_origins);

        $this->post(route('admin.api-clients.store'), ['name' => 'Mala', 'allowed_ips' => '999.1.1.1', 'allowed_origins' => 'no-es-dominio'])
            ->assertSessionHasErrors(['allowed_ips.0', 'allowed_origins.0']);

        $oldHash = $client->token_hash;
        $this->post(route('admin.api-clients.regenerate', $client))->assertRedirect();
        $this->assertNotSame($oldHash, $client->refresh()->token_hash);

        $this->put(route('admin.api-clients.update', $client), ['name' => 'sav_3', 'allowed_ips' => '', 'allowed_origins' => ''])->assertSessionHasNoErrors();
        $client->refresh();
        $this->assertFalse($client->is_active);
        $this->assertNull($client->allowed_ips);

        $this->get(route('admin.api-clients.index'))->assertInertia(fn (Assert $page) => $page
            ->component('admin/api-clients')
            ->where('clients.0.name', 'sav_3')
            ->missing('clients.0.token_hash'));

        $this->delete(route('admin.api-clients.destroy', $client))->assertRedirect();
        $this->assertModelMissing($client);
    }

    public function test_only_the_super_admin_manages_keys()
    {
        [$client] = $this->client();
        $this->actingAs(User::factory()->forCompany()->create());

        $this->get(route('admin.api-clients.index'))->assertForbidden();
        $this->post(route('admin.api-clients.store'), ['name' => 'X'])->assertForbidden();
        $this->post(route('admin.api-clients.regenerate', $client))->assertForbidden();
        $this->delete(route('admin.api-clients.destroy', $client))->assertForbidden();
    }
}
