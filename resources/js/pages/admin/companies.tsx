import { Form, Head } from '@inertiajs/react';
import { useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { index, store, update } from '@/routes/admin/companies';

type Company = {
    id: number;
    name: string;
    website_url: string | null;
    logo_url: string | null;
    is_active: boolean;
    users_count: number;
};

function CompanyLogo({ company }: { company: Company }) {
    return company.logo_url ? (
        <img
            src={company.logo_url}
            alt={`Logo de ${company.name}`}
            className="size-12 shrink-0 rounded-lg border bg-white object-contain p-1"
        />
    ) : (
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-dashed text-[10px] text-muted-foreground">
            Sin logo
        </span>
    );
}

function CompanyFields({
    company,
    errors,
}: {
    company?: Company;
    errors: Record<string, string>;
}) {
    const id = company?.id ?? 'new';

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
                <Label htmlFor={`name-${id}`}>Nombre</Label>
                <Input
                    id={`name-${id}`}
                    name="name"
                    required
                    defaultValue={company?.name}
                />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`url-${id}`}>Sitio web</Label>
                <Input
                    id={`url-${id}`}
                    name="website_url"
                    type="url"
                    placeholder="https://"
                    defaultValue={company?.website_url ?? ''}
                />
                <InputError message={errors.website_url} />
            </div>

            <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor={`logo-${id}`}>Logo</Label>
                <div className="flex items-center gap-3">
                    {company && <CompanyLogo company={company} />}
                    <Input
                        id={`logo-${id}`}
                        name="logo"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                    />
                </div>
                <p className="text-sm text-muted-foreground">
                    PNG, JPG o WebP de hasta 2 MB.
                    {company?.logo_url &&
                        ' Si eliges un archivo, reemplaza al logo actual.'}
                </p>
                <InputError message={errors.logo} />

                {company?.logo_url && (
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            name="remove_logo"
                            value="1"
                            className="size-4"
                        />
                        Quitar el logo actual
                    </label>
                )}
            </div>

            <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                    type="checkbox"
                    name="is_active"
                    value="1"
                    defaultChecked={company?.is_active ?? true}
                    className="size-4"
                />
                Activa (puede votar y aparece en la página pública)
            </label>
        </div>
    );
}

export default function Companies({ companies }: { companies: Company[] }) {
    const [editing, setEditing] = useState<number | null>(null);

    return (
        <>
            <Head title="Empresas" />

            <div className="max-w-3xl space-y-8 p-4">
                <Heading
                    title="Empresas asociadas"
                    description="Cada empresa activa tiene un voto por jornada."
                />

                <Form
                    {...store.form()}
                    resetOnSuccess
                    options={{ preserveScroll: true }}
                    className="space-y-4 rounded-2xl border p-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <h3 className="font-medium">Agregar empresa</h3>
                            <CompanyFields errors={errors} />
                            <Button disabled={processing}>Agregar</Button>
                        </>
                    )}
                </Form>

                <ul className="divide-y rounded-2xl border">
                    {companies.map((company) => (
                        <li key={company.id} className="p-4">
                            {editing === company.id ? (
                                <Form
                                    {...update.form(company.id)}
                                    options={{ preserveScroll: true }}
                                    onSuccess={() => setEditing(null)}
                                    className="space-y-4"
                                >
                                    {({ processing, errors }) => (
                                        <>
                                            <CompanyFields
                                                company={company}
                                                errors={errors}
                                            />
                                            <div className="flex gap-2">
                                                <Button disabled={processing}>
                                                    Guardar
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        setEditing(null)
                                                    }
                                                >
                                                    Cancelar
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </Form>
                            ) : (
                                <div className="flex items-center gap-4">
                                    <CompanyLogo company={company} />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium">
                                            {company.name}
                                            {!company.is_active && (
                                                <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                    Inactiva
                                                </span>
                                            )}
                                        </p>
                                        <p className="truncate text-sm text-muted-foreground">
                                            {company.users_count} usuario(s)
                                            {company.website_url &&
                                                ` · ${company.website_url}`}
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEditing(company.id)}
                                    >
                                        Editar
                                    </Button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
}

Companies.layout = {
    breadcrumbs: [
        {
            title: 'Empresas',
            href: index(),
        },
    ],
};
