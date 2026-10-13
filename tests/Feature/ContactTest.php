<?php

namespace Tests\Feature;

use App\Mail\ContactMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ContactTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, string>
     */
    private function payload(): array
    {
        return [
            'name' => 'Ana Pérez',
            'email' => 'ana@example.com',
            'subject' => 'Informes',
            'message' => "Hola,\nquiero información.",
        ];
    }

    public function test_a_visitor_can_send_a_contact_message()
    {
        Mail::fake();
        config(['fegat.contact_email' => 'contacto@fegat.test']);

        $this->post(route('contact.store'), $this->payload())->assertRedirect()->assertSessionHasNoErrors();

        Mail::assertSent(ContactMessage::class, fn (ContactMessage $mail) => $mail->hasTo('contacto@fegat.test')
            && $mail->hasReplyTo('ana@example.com')
            && $mail->hasSubject('Contacto FEGAT: Informes'));
    }

    public function test_the_contact_form_validates_its_fields()
    {
        Mail::fake();

        $this->post(route('contact.store'), [...$this->payload(), 'email' => 'no-es-correo', 'message' => ''])
            ->assertSessionHasErrors(['email', 'message']);

        Mail::assertNothingSent();
    }

    public function test_bots_that_fill_the_hidden_field_are_ignored()
    {
        Mail::fake();

        $this->post(route('contact.store'), [...$this->payload(), 'website' => 'https://spam.example'])
            ->assertRedirect();

        Mail::assertNothingSent();
    }

    public function test_the_message_is_escaped_in_the_email()
    {
        $html = (new ContactMessage('Ana', 'ana@example.com', 'Hola', '<script>alert(1)</script>'))->render();

        $this->assertStringNotContainsString('<script>', $html);
    }
}
