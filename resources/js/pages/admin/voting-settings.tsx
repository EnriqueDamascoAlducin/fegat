import { Form, Head } from '@inertiajs/react';
import { useRef } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit, update, whatsappTest } from '@/routes/admin/voting';

type Settings = {
    min_votes: number;
    opens_at: string;
    closes_at: string;
    public_visible: boolean;
    whatsapp_enabled: boolean;
    reminder_first_at: string;
    reminder_second_at: string | null;
    summary_enabled: boolean;
    summary_at: string;
};

export default function VotingSettings({
    settings,
    whatsapp,
}: {
    settings: Settings;
    whatsapp: {
        configured: boolean;
        summary_configured: boolean;
        admins_with_phone: number;
        with_phone: number;
        test_phone: string | null;
        webhook_url: string;
    };
}) {
    const testType = useRef<HTMLInputElement>(null);

    return (
        <>
            <Head title="Configuración de votación" />

            <div className="max-w-xl space-y-6 p-4">
                <Heading
                    title="Votación"
                    description="Horario en que las empresas pueden votar y mínimo de votos para emitir un resultado."
                />

                <Form
                    {...update.form()}
                    options={{ preserveScroll: true }}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="opens_at">Abre a las</Label>
                                    <Input
                                        id="opens_at"
                                        name="opens_at"
                                        type="time"
                                        required
                                        defaultValue={settings.opens_at}
                                    />
                                    <InputError message={errors.opens_at} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="closes_at">
                                        Cierra a las
                                    </Label>
                                    <Input
                                        id="closes_at"
                                        name="closes_at"
                                        type="time"
                                        required
                                        defaultValue={settings.closes_at}
                                    />
                                    <InputError message={errors.closes_at} />
                                </div>
                            </div>

                            <p className="-mt-2 text-sm text-muted-foreground">
                                Si la hora de cierre es menor que la de
                                apertura, la votación cruza la medianoche y
                                cuenta para los vuelos del día en que cierra.
                            </p>

                            <div className="grid gap-2">
                                <Label htmlFor="min_votes">
                                    Mínimo de empresas que deben votar
                                </Label>
                                <Input
                                    id="min_votes"
                                    name="min_votes"
                                    type="number"
                                    min={1}
                                    required
                                    defaultValue={settings.min_votes}
                                />
                                <p className="text-sm text-muted-foreground">
                                    Con menos votos el semáforo se muestra
                                    «Esperando votos».
                                </p>
                                <InputError message={errors.min_votes} />
                            </div>

                            <div className="rounded-xl border p-4">
                                <label className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        name="public_visible"
                                        value="1"
                                        defaultChecked={settings.public_visible}
                                        className="mt-1 size-4"
                                    />
                                    <span>
                                        <span className="block font-medium">
                                            Mostrar el semáforo en la página
                                            pública
                                        </span>
                                        <span className="block text-sm text-muted-foreground">
                                            Si lo desactivas, los visitantes no
                                            ven el semáforo. Las empresas pueden
                                            seguir votando y tú sigues viendo el
                                            resultado en el panel.
                                        </span>
                                    </span>
                                </label>
                            </div>

                            <div className="rounded-xl border p-4">
                                <label className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        name="whatsapp_enabled"
                                        value="1"
                                        defaultChecked={
                                            settings.whatsapp_enabled
                                        }
                                        className="mt-1 size-4"
                                    />
                                    <span>
                                        <span className="block font-medium">
                                            Notificar por WhatsApp
                                        </span>
                                        <span className="block text-sm text-muted-foreground">
                                            A cada hora indicada, cada
                                            administrador de empresa con
                                            WhatsApp registrado recibe un
                                            recordatorio con el enlace y una
                                            encuesta para votar respondiendo
                                            Verde, Amarillo o Rojo. Solo se
                                            envía a empresas que aún no votan,
                                            así que el segundo envío llega solo
                                            a quien sigue sin votar.
                                        </span>
                                    </span>
                                </label>
                                <div className="mt-4 grid gap-4 pl-7 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="reminder_first_at">
                                            Primer envío
                                        </Label>
                                        <Input
                                            id="reminder_first_at"
                                            name="reminder_first_at"
                                            type="time"
                                            required
                                            defaultValue={
                                                settings.reminder_first_at
                                            }
                                        />
                                        <InputError
                                            message={errors.reminder_first_at}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="reminder_second_at">
                                            Segundo envío (opcional)
                                        </Label>
                                        <Input
                                            id="reminder_second_at"
                                            name="reminder_second_at"
                                            type="time"
                                            defaultValue={
                                                settings.reminder_second_at ??
                                                ''
                                            }
                                        />
                                        <InputError
                                            message={errors.reminder_second_at}
                                        />
                                    </div>
                                </div>
                                <p className="mt-2 pl-7 text-sm text-muted-foreground">
                                    Ambas horas deben caer dentro del horario
                                    de votación. Deja vacío el segundo para
                                    enviarlo una sola vez.
                                </p>
                                <p
                                    className={
                                        whatsapp.configured
                                            ? 'mt-3 text-sm text-muted-foreground'
                                            : 'mt-3 text-sm text-amber-700 dark:text-amber-400'
                                    }
                                >
                                    {whatsapp.configured
                                        ? `Twilio configurado · ${whatsapp.with_phone} ${whatsapp.with_phone === 1 ? 'administrador' : 'administradores'} con WhatsApp.`
                                        : 'Falta configurar Twilio y sus plantillas en el servidor; mientras tanto no se envía nada.'}
                                </p>
                            </div>

                            <div className="rounded-xl border p-4">
                                <label className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        name="summary_enabled"
                                        value="1"
                                        defaultChecked={
                                            settings.summary_enabled
                                        }
                                        className="mt-1 size-4"
                                    />
                                    <span>
                                        <span className="block font-medium">
                                            Resumen diario para super admin
                                        </span>
                                        <span className="block text-sm text-muted-foreground">
                                            Cada día, a la hora indicada, los
                                            super admin con WhatsApp reciben el
                                            resultado de la jornada, cuántas
                                            empresas votaron, qué votó cada una
                                            y quién falta.
                                        </span>
                                    </span>
                                </label>
                                <div className="mt-4 grid max-w-40 gap-2 pl-7">
                                    <Label htmlFor="summary_at">
                                        Hora del resumen
                                    </Label>
                                    <Input
                                        id="summary_at"
                                        name="summary_at"
                                        type="time"
                                        required
                                        defaultValue={settings.summary_at}
                                    />
                                    <InputError message={errors.summary_at} />
                                </div>
                                <p
                                    className={
                                        whatsapp.summary_configured
                                            ? 'mt-3 text-sm text-muted-foreground'
                                            : 'mt-3 text-sm text-amber-700 dark:text-amber-400'
                                    }
                                >
                                    {whatsapp.summary_configured
                                        ? `Plantilla configurada · ${whatsapp.admins_with_phone} super ${whatsapp.admins_with_phone === 1 ? 'admin' : 'admins'} con WhatsApp.`
                                        : 'Falta la plantilla del resumen (TWILIO_TEMPLATE_DAILY_SUMMARY); mientras tanto no se envía.'}
                                </p>
                            </div>

                            <Button disabled={processing}>Guardar</Button>
                        </>
                    )}
                </Form>

                <section className="space-y-4 rounded-xl border p-4">
                    <div>
                        <h2 className="font-medium">
                            Probar mensajes de WhatsApp
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Envía ahora el recordatorio y la encuesta, o el
                            resumen de hoy, a un número. No cuenta como envío de
                            la jornada.
                        </p>
                    </div>

                    <Form
                        {...whatsappTest.form()}
                        options={{ preserveScroll: true }}
                        className="space-y-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="test_phone">
                                            WhatsApp de prueba
                                        </Label>
                                        <Input
                                            id="test_phone"
                                            name="test_phone"
                                            type="tel"
                                            required
                                            placeholder="55 1234 5678"
                                            defaultValue={
                                                whatsapp.test_phone ?? ''
                                            }
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="test_company">
                                            Empresa en el mensaje
                                        </Label>
                                        <Input
                                            id="test_company"
                                            name="test_company"
                                            placeholder="Empresa de prueba"
                                        />
                                    </div>
                                </div>
                                <InputError message={errors.test_phone} />

                                {/* Lo fija el botón que se presione. */}
                                <input
                                    ref={testType}
                                    type="hidden"
                                    name="test_type"
                                    defaultValue="vote"
                                />

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        disabled={
                                            processing || !whatsapp.configured
                                        }
                                        onClick={() => {
                                            if (testType.current) {
                                                testType.current.value = 'vote';
                                            }
                                        }}
                                    >
                                        Probar recordatorio y encuesta
                                    </Button>
                                    <Button
                                        variant="outline"
                                        disabled={
                                            processing ||
                                            !whatsapp.summary_configured
                                        }
                                        onClick={() => {
                                            if (testType.current) {
                                                testType.current.value =
                                                    'summary';
                                            }
                                        }}
                                    >
                                        Probar resumen de hoy
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>

                    <div className="space-y-1 border-t pt-4 text-sm text-muted-foreground">
                        <p>Webhook para Twilio («A message comes in»):</p>
                        <code className="block rounded-md bg-muted px-3 py-2 text-xs break-all text-foreground">
                            {whatsapp.webhook_url}
                        </code>
                        <p>
                            Para que la respuesta de la encuesta registre un
                            voto, el número debe pertenecer a un administrador
                            de empresa activa. Con otro número, el sistema
                            contesta explicando por qué no votó.
                        </p>
                    </div>
                </section>
            </div>
        </>
    );
}

VotingSettings.layout = {
    breadcrumbs: [
        {
            title: 'Votación',
            href: edit(),
        },
    ],
};
