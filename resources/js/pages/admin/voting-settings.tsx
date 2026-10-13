import { Form, Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit, update } from '@/routes/admin/voting';

type Settings = {
    min_votes: number;
    opens_at: string;
    closes_at: string;
    public_visible: boolean;
};

export default function VotingSettings({ settings }: { settings: Settings }) {
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
                                    Con menos votos el semáforo se muestra «En
                                    espera».
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

                            <Button disabled={processing}>Guardar</Button>
                        </>
                    )}
                </Form>
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
