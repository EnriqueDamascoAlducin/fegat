<?php

namespace Tests\Feature;

use App\Contracts\WhatsAppSender;
use App\Models\Company;
use App\Models\User;
use App\Models\Vote;
use App\Models\VotingSetting;
use App\Models\WhatsappReminder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\Fakes\FakeWhatsApp;
use Tests\TestCase;
use Twilio\Security\RequestValidator;

class WhatsAppVotingTest extends TestCase
{
    use RefreshDatabase;

    private FakeWhatsApp $whatsApp;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.twilio.sid' => 'AC_prueba',
            'services.twilio.token' => 'token-de-prueba',
            'services.twilio.whatsapp_from' => 'whatsapp:+14155238886',
            'services.twilio.template_vote_reminder' => 'HX_recordatorio',
            'services.twilio.template_vote_poll' => 'HX_encuesta',
            'services.twilio.template_daily_summary' => 'HX_resumen',
            'services.twilio.webhook_url' => null,
        ]);

        VotingSetting::current()->update([
            'min_votes' => 2,
            'opens_at' => '05:00',
            'closes_at' => '07:00',
            'whatsapp_enabled' => true,
        ]);

        $this->travelTo('2026-10-12 06:00');

        $this->whatsApp = new FakeWhatsApp;
        $this->app->instance(WhatsAppSender::class, $this->whatsApp);
    }

    /**
     * @param  array<string, string>  $data
     */
    private function fromTwilio(array $data): TestResponse
    {
        $url = route('webhooks.twilio.whatsapp');
        $signature = (new RequestValidator('token-de-prueba'))->computeSignature($url, $data);

        return $this->post($url, $data, ['X-Twilio-Signature' => $signature]);
    }

    public function test_it_sends_the_reminder_and_the_poll_once_per_day()
    {
        $user = User::factory()->forCompany()->create(['phone' => '55 1234 5678']);

        $this->artisan('fegat:whatsapp-recordatorios')->assertSuccessful();
        $this->artisan('fegat:whatsapp-recordatorios')->assertSuccessful();

        $this->assertCount(2, $this->whatsApp->sent);
        $this->assertSame('+525512345678', $this->whatsApp->sent[0]['to']);
        $this->assertSame('HX_recordatorio', $this->whatsApp->sent[0]['template']);
        $this->assertSame(route('dashboard'), $this->whatsApp->sent[0]['variables']['5']);
        $this->assertSame($user->company->name, $this->whatsApp->sent[1]['variables']['1']);
        $this->assertSame('HX_encuesta', $this->whatsApp->sent[1]['template']);
        $this->assertDatabaseHas(WhatsappReminder::class, ['user_id' => $user->id, 'status' => 'sent']);
    }

    public function test_it_only_writes_to_admins_of_active_companies_that_have_not_voted()
    {
        $voted = User::factory()->forCompany()->create(['phone' => '5511111111']);
        Vote::query()->create(['company_id' => $voted->company_id, 'flight_date' => '2026-10-12', 'color' => 'green']);
        User::factory()->forCompany(Company::factory()->create(['is_active' => false]))->create(['phone' => '5522222222']);
        User::factory()->forCompany()->create(['phone' => null]);
        User::factory()->decider()->create(['phone' => '5533333333']);
        $pending = User::factory()->forCompany()->create(['phone' => '5544444444']);

        $this->artisan('fegat:whatsapp-recordatorios');

        $this->assertSame(['+525544444444'], array_values(array_unique(array_column($this->whatsApp->sent, 'to'))));
        $this->assertDatabaseCount(WhatsappReminder::class, 1);
        $this->assertDatabaseHas(WhatsappReminder::class, ['user_id' => $pending->id]);
    }

    public function test_nothing_is_sent_when_disabled_or_outside_the_voting_window()
    {
        User::factory()->forCompany()->create(['phone' => '5512345678']);

        VotingSetting::current()->update(['whatsapp_enabled' => false]);
        $this->artisan('fegat:whatsapp-recordatorios');

        VotingSetting::current()->update(['whatsapp_enabled' => true]);
        $this->travelTo('2026-10-12 08:00');
        $this->artisan('fegat:whatsapp-recordatorios');

        $this->assertSame([], $this->whatsApp->sent);
    }

    public function test_a_failed_send_is_recorded_and_not_retried()
    {
        User::factory()->forCompany()->create(['phone' => '5512345678']);
        $this->whatsApp->fail = true;

        $this->artisan('fegat:whatsapp-recordatorios')->assertSuccessful();
        $this->whatsApp->fail = false;
        $this->artisan('fegat:whatsapp-recordatorios');

        $this->assertSame([], $this->whatsApp->sent);
        $this->assertDatabaseHas(WhatsappReminder::class, ['status' => 'failed', 'error' => 'Twilio no disponible']);
    }

    public function test_unsigned_requests_are_rejected()
    {
        $this->post(route('webhooks.twilio.whatsapp'), ['From' => 'whatsapp:+525512345678', 'Body' => 'Verde'])
            ->assertForbidden();

        $this->assertDatabaseCount(Vote::class, 0);
    }

    public function test_answering_the_poll_registers_the_vote()
    {
        $user = User::factory()->forCompany()->create(['phone' => '5512345678']);

        $this->fromTwilio(['From' => 'whatsapp:+525512345678', 'Body' => 'Verde', 'ButtonPayload' => 'vote_green'])
            ->assertOk()
            ->assertHeader('Content-Type', 'text/xml; charset=utf-8')
            ->assertSee('Voto registrado', false);

        $this->assertDatabaseHas(Vote::class, ['company_id' => $user->company_id, 'flight_date' => '2026-10-12', 'color' => 'green']);
        $this->assertDatabaseHas('vote_changes', ['user_id' => $user->id, 'to_color' => 'green', 'channel' => 'whatsapp']);
    }

    public function test_a_typed_answer_works_and_the_old_mexican_prefix_is_recognized()
    {
        $user = User::factory()->forCompany()->create(['phone' => '+52 55 1234 5678']);

        $this->fromTwilio(['From' => 'whatsapp:+5215512345678', 'Body' => '¡Rojo!'])->assertSee('Se cancela', false);

        $this->assertDatabaseHas(Vote::class, ['company_id' => $user->company_id, 'color' => 'red']);
    }

    public function test_it_explains_what_went_wrong()
    {
        User::factory()->forCompany()->create(['phone' => '5512345678']);

        $this->fromTwilio(['From' => 'whatsapp:+529999999999', 'Body' => 'Verde'])->assertSee('no está registrado', false);
        $this->fromTwilio(['From' => 'whatsapp:+525512345678', 'Body' => 'hola'])->assertSee('Para votar responde', false);

        $this->travelTo('2026-10-12 08:00');
        $this->fromTwilio(['From' => 'whatsapp:+525512345678', 'Body' => 'Verde'])->assertSee('La votación está cerrada', false);

        $this->assertDatabaseCount(Vote::class, 0);
    }

    public function test_the_super_admin_can_send_a_test_even_with_whatsapp_disabled()
    {
        VotingSetting::current()->update(['whatsapp_enabled' => false]);
        $this->travelTo('2026-10-12 12:00');
        $admin = User::factory()->superAdmin()->create(['name' => 'Enrique']);

        $this->actingAs($admin)
            ->post(route('admin.voting.whatsapp-test'), ['test_phone' => '55 1234 5678', 'test_company' => 'Aerostat'])
            ->assertRedirect(route('admin.voting.edit'))
            ->assertSessionHasNoErrors();

        $this->assertCount(2, $this->whatsApp->sent);
        $this->assertSame('+525512345678', $this->whatsApp->sent[0]['to']);
        $this->assertSame('Enrique', $this->whatsApp->sent[0]['variables']['1']);
        $this->assertSame('Aerostat', $this->whatsApp->sent[1]['variables']['1']);
        $this->assertDatabaseCount(WhatsappReminder::class, 0);
    }

    public function test_test_sends_explain_why_they_failed()
    {
        $admin = User::factory()->superAdmin()->create();

        $this->whatsApp->fail = true;
        $this->actingAs($admin)
            ->post(route('admin.voting.whatsapp-test'), ['test_phone' => '5512345678'])
            ->assertSessionHasErrors(['test_phone' => 'No se pudo enviar: Twilio no disponible']);

        config(['services.twilio.template_vote_poll' => null]);
        $this->actingAs($admin)
            ->post(route('admin.voting.whatsapp-test'), ['test_phone' => '5512345678'])
            ->assertSessionHasErrors('test_phone');

        $this->actingAs($admin)
            ->post(route('admin.voting.whatsapp-test'), ['test_phone' => '123'])
            ->assertSessionHasErrors('test_phone');
    }

    public function test_only_the_super_admin_can_send_tests()
    {
        $this->actingAs(User::factory()->forCompany()->create())
            ->post(route('admin.voting.whatsapp-test'), ['test_phone' => '5512345678'])
            ->assertForbidden();

        $this->assertSame([], $this->whatsApp->sent);
    }

    public function test_the_daily_summary_goes_to_super_admins_once_after_the_configured_time()
    {
        VotingSetting::current()->update(['summary_enabled' => true, 'summary_at' => '12:00']);
        $admin = User::factory()->superAdmin()->create(['phone' => '5599999999']);
        User::factory()->superAdmin()->create(['phone' => null]);
        $green = User::factory()->forCompany(Company::factory()->create(['name' => 'Aerostat']))->create(['name' => 'Juan', 'phone' => '5511111111']);
        $red = User::factory()->forCompany(Company::factory()->create(['name' => 'Volare']))->create(['phone' => '5522222222']);
        Company::factory()->create(['name' => 'Sky Balloons']);

        // Antes de la hora no se manda nada.
        $this->artisan('fegat:whatsapp-resumen');
        $this->assertSame([], $this->whatsApp->sent);

        $this->travelTo('2026-10-12 06:30');
        Vote::query()->create(['company_id' => $green->company_id, 'flight_date' => '2026-10-12', 'color' => 'green', 'user_id' => $green->id]);
        Vote::query()->create(['company_id' => $red->company_id, 'flight_date' => '2026-10-12', 'color' => 'red', 'user_id' => $red->id]);

        $this->travelTo('2026-10-12 12:05');
        $this->artisan('fegat:whatsapp-resumen');
        $this->artisan('fegat:whatsapp-resumen');

        $this->assertCount(1, $this->whatsApp->sent);
        $message = $this->whatsApp->sent[0];
        $this->assertSame('+525599999999', $message['to']);
        $this->assertSame('HX_resumen', $message['template']);
        $this->assertSame('Se cancela (rojo)', $message['variables']['2']);
        $this->assertSame('2 de 3 empresas', $message['variables']['3']);
        $this->assertSame('Verde 1 · Amarillo 0 · Rojo 1', $message['variables']['4']);
        $this->assertStringContainsString('Aerostat: Verde (Juan)', $message['variables']['5']);
        $this->assertStringContainsString('Sin voto: Sky Balloons', $message['variables']['5']);
        $this->assertDatabaseHas(WhatsappReminder::class, ['user_id' => $admin->id, 'kind' => 'summary', 'flight_date' => '2026-10-12']);
    }

    public function test_the_summary_and_the_reminder_are_tracked_separately()
    {
        VotingSetting::current()->update(['summary_enabled' => true, 'summary_at' => '06:00']);
        // Un super admin con número no recibe recordatorio, pero sí resumen.
        User::factory()->superAdmin()->create(['phone' => '5599999999']);
        User::factory()->forCompany()->create(['phone' => '5511111111']);

        $this->artisan('fegat:whatsapp-recordatorios');
        $this->artisan('fegat:whatsapp-resumen');

        $this->assertSame(['HX_recordatorio', 'HX_encuesta', 'HX_resumen'], array_column($this->whatsApp->sent, 'template'));
    }

    public function test_the_summary_is_not_sent_when_disabled()
    {
        $this->travelTo('2026-10-12 13:00');
        User::factory()->superAdmin()->create(['phone' => '5599999999']);

        $this->artisan('fegat:whatsapp-resumen');

        $this->assertSame([], $this->whatsApp->sent);
    }

    public function test_the_super_admin_can_test_the_summary()
    {
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)
            ->post(route('admin.voting.whatsapp-test'), ['test_phone' => '5512345678', 'test_type' => 'summary'])
            ->assertSessionHasNoErrors();

        $this->assertSame(['HX_resumen'], array_column($this->whatsApp->sent, 'template'));
        $this->assertSame('Sin resultado: no se alcanzó el mínimo de votos', $this->whatsApp->sent[0]['variables']['2']);
    }

    public function test_phones_are_normalized_and_cannot_be_repeated()
    {
        $admin = User::factory()->superAdmin()->create();
        User::factory()->forCompany()->create(['phone' => '5512345678']);
        $user = User::factory()->decider()->create();

        $this->actingAs($admin)->put(route('admin.users.update', $user), [
            'name' => $user->name,
            'email' => $user->email,
            'role' => 'decider',
            'phone' => '+52 (55) 1234-5678',
        ])->assertSessionHasErrors('phone');

        $this->actingAs($admin)->put(route('admin.users.update', $user), [
            'name' => $user->name,
            'email' => $user->email,
            'role' => 'decider',
            'phone' => '55 8765 4321',
        ])->assertSessionHasNoErrors();

        $this->assertSame('+525587654321', $user->fresh()->phone);
    }
}
