<?php

namespace App\Http\Controllers;

use App\Mail\ContactMessage;
use App\Models\HomeContent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

class ContactController extends Controller
{
    /**
     * Página de contacto con los datos de la oficina y el formulario.
     */
    public function show(): Response
    {
        $content = HomeContent::current();

        return Inertia::render('contact', [
            'text' => $content->contact_text,
            'details' => $content->only(HomeContent::CONTACT_FIELDS),
        ]);
    }

    /**
     * Envía a la federación un mensaje del formulario de contacto público.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'subject' => ['required', 'string', 'max:150'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        // Campo trampa: una persona no lo ve, así que si llega lleno es un bot.
        if ($request->filled('website')) {
            return back();
        }

        Mail::to(config('fegat.contact_email') ?: config('mail.from.address'))->send(new ContactMessage(
            senderName: $validated['name'],
            senderEmail: $validated['email'],
            subjectLine: $validated['subject'],
            body: $validated['message'],
        ));

        return back();
    }
}
