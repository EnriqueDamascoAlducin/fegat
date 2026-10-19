import { Form, Head, router } from '@inertiajs/react';
import { Check, Copy, KeyRound, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Field, TextArea, TextInput } from '@/components/site/editor-fields';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { destroy, index, regenerate, store, update } from '@/routes/admin/api-clients';

type Client = {
    id: number;
    name: string;
    token_prefix: string;
    allowed_ips: string[];
    allowed_origins: string[];
    is_active: boolean;
    last_used_at: string | null;
    last_used_ip: string | null;
    created_at: string | null;
};

const when = (value: string | null) =>
    value ? new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'Nunca';

function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
    const [copied, setCopied] = useState(false);

    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
                void navigator.clipboard.writeText(text).then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                })
            }
        >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? 'Copiado' : label}
        </Button>
    );
}

function ClientFields({ client, errors }: { client?: Client; errors: Record<string, string> }) {
    const listErrors = Object.entries(errors).filter(([key]) => key.startsWith('allowed_'));

    return (
        <div className="grid gap-4">
            <Field label="Nombre" hint="Para reconocerla, por ejemplo «sav_3 producción».">
                <TextInput name="name" required maxLength={120} defaultValue={client?.name} />
                <InputError message={errors.name} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
                <Field label="IPs permitidas (opcional)" hint="Una por renglón; acepta rangos como 203.0.113.0/24. Vacío: cualquier IP.">
                    <TextArea name="allowed_ips" rows={3} defaultValue={client?.allowed_ips.join('\n')} className="font-mono text-xs" />
                </Field>
                <Field
                    label="Dominios permitidos (opcional)"
                    hint="Solo si se va a consultar desde el navegador (CORS). Uno por renglón: https://sav.ejemplo.com"
                >
                    <TextArea name="allowed_origins" rows={3} defaultValue={client?.allowed_origins.join('\n')} className="font-mono text-xs" />
                </Field>
            </div>
            {listErrors.map(([key, message]) => (
                <InputError key={key} message={message} />
            ))}
        </div>
    );
}

export default function ApiClients({ clients, endpoint }: { clients: Client[]; endpoint: string }) {
    const [newToken, setNewToken] = useState<string | null>(null);
    const [editing, setEditing] = useState<number | null>(null);

    // La llave completa llega una sola vez, en el flash de la respuesta.
    useEffect(
        () =>
            router.on('flash', (event) => {
                const token = (event as CustomEvent).detail?.flash?.newToken;

                if (typeof token === 'string') {
                    setNewToken(token);
                }
            }),
        [],
    );

    const curl = `curl -H "Authorization: Bearer ${newToken ?? 'fegat_…'}" ${endpoint}`;

    return (
        <>
            <Head title="Llaves de API" />

            <div className="max-w-4xl space-y-8 p-4">
                <Heading
                    title="Llaves de API"
                    description="Sistemas externos (como sav_3) que pueden consultar el semáforo. Cada uno manda su llave desde su servidor."
                />

                {newToken && (
                    <section className="space-y-3 rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-5 text-emerald-950">
                        <p className="font-semibold">Copia esta llave ahora: no se volverá a mostrar.</p>
                        <div className="flex flex-wrap items-center gap-2">
                            <code className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 font-mono text-sm break-all">{newToken}</code>
                            <CopyButton text={newToken} />
                        </div>
                        <p className="text-sm">
                            Guárdala en el <span className="font-mono">.env</span> del otro sistema (por ejemplo <span className="font-mono">FEGAT_API_TOKEN</span>), nunca en
                            código que vea el navegador.
                        </p>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setNewToken(null)}>
                            Ya la guardé
                        </Button>
                    </section>
                )}

                <section className="space-y-3 rounded-2xl border p-5">
                    <h2 className="font-medium">Cómo se usa</h2>
                    <p className="text-sm text-muted-foreground">
                        <span className="font-mono">GET {endpoint}</span> con el encabezado <span className="font-mono">Authorization: Bearer &lt;llave&gt;</span>. Responde el
                        semáforo de la jornada vigente (sin el detalle de votos). Límite: 60 consultas por minuto por llave; conviene guardar la respuesta 1 o 2 minutos
                        del lado del otro sistema.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        <code className="min-w-0 flex-1 rounded-lg bg-muted px-3 py-2 font-mono text-xs break-all">{curl}</code>
                        <CopyButton text={curl} label="Copiar ejemplo" />
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="font-medium">Llaves</h2>
                    {clients.length === 0 && <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Aún no hay llaves.</p>}
                    <ul className="space-y-3">
                        {clients.map((client) => (
                            <li key={client.id} className={cn('rounded-2xl border p-4', !client.is_active && 'opacity-70')}>
                                {editing === client.id ? (
                                    <Form {...update.form(client.id)} options={{ preserveScroll: true }} onSuccess={() => setEditing(null)} className="space-y-4">
                                        {({ processing, errors }) => (
                                            <>
                                                <ClientFields client={client} errors={errors} />
                                                <label className="flex items-center gap-2 text-sm">
                                                    <input type="checkbox" name="is_active" value="1" defaultChecked={client.is_active} className="size-4 accent-brand" />
                                                    Activa (desmarcada, la llave deja de funcionar)
                                                </label>
                                                <div className="flex gap-2">
                                                    <Button disabled={processing}>Guardar</Button>
                                                    <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                                                        Cancelar
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </Form>
                                ) : (
                                    <div className="flex flex-wrap items-start gap-4">
                                        <KeyRound className="mt-1 size-5 shrink-0 text-brand" />
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <p className="flex items-center gap-2 font-medium">
                                                {client.name}
                                                <span
                                                    className={cn(
                                                        'rounded-full px-2 py-0.5 text-xs font-medium',
                                                        client.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-700',
                                                    )}
                                                >
                                                    {client.is_active ? 'Activa' : 'Desactivada'}
                                                </span>
                                            </p>
                                            <p className="font-mono text-xs text-muted-foreground">{client.token_prefix}…</p>
                                            <p className="text-xs text-muted-foreground">
                                                Último uso: {when(client.last_used_at)}
                                                {client.last_used_ip && ` desde ${client.last_used_ip}`}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                IPs: {client.allowed_ips.length ? client.allowed_ips.join(', ') : 'cualquiera'} · Dominios:{' '}
                                                {client.allowed_origins.length ? client.allowed_origins.join(', ') : 'solo desde servidor'}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setEditing(client.id)}>
                                                Editar
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    confirm(`¿Generar una llave nueva para «${client.name}»? La actual dejará de funcionar de inmediato.`) &&
                                                    router.post(regenerate.url(client.id), {}, { preserveScroll: true })
                                                }
                                            >
                                                <RefreshCw className="size-4" /> Cambiar llave
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                aria-label={`Eliminar ${client.name}`}
                                                onClick={() =>
                                                    confirm(`¿Eliminar la llave «${client.name}»? El sistema que la use dejará de recibir el semáforo.`) &&
                                                    router.delete(destroy.url(client.id), { preserveScroll: true })
                                                }
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>

                <Form {...store.form()} options={{ preserveScroll: true }} resetOnSuccess className="space-y-4 rounded-2xl border p-5">
                    {({ processing, errors }) => (
                        <>
                            <h2 className="font-medium">Nueva llave</h2>
                            <ClientFields errors={errors} />
                            <Button disabled={processing}>Crear llave</Button>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

ApiClients.layout = {
    breadcrumbs: [{ title: 'Llaves de API', href: index() }],
};
