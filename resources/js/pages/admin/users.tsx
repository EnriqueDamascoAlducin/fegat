import { Form, Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { destroy, index, store, update } from '@/routes/admin/users';
import type { UserRole } from '@/types';

type UserRow = {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    company_id: number | null;
    company_name: string | null;
};

type CompanyOption = {
    id: number;
    name: string;
};

const selectClass =
    'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>option]:bg-background [&>option]:text-foreground';

function UserFields({
    user,
    companies,
    errors,
}: {
    user?: UserRow;
    companies: CompanyOption[];
    errors: Record<string, string>;
}) {
    const id = user?.id ?? 'new';
    const [role, setRole] = useState<UserRole>(user?.role ?? 'company_admin');

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
                <Label htmlFor={`name-${id}`}>Nombre</Label>
                <Input
                    id={`name-${id}`}
                    name="name"
                    required
                    defaultValue={user?.name}
                />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`email-${id}`}>Correo</Label>
                <Input
                    id={`email-${id}`}
                    name="email"
                    type="email"
                    required
                    autoComplete="off"
                    defaultValue={user?.email}
                />
                <InputError message={errors.email} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`role-${id}`}>Rol</Label>
                <select
                    id={`role-${id}`}
                    name="role"
                    value={role}
                    onChange={(event) =>
                        setRole(event.target.value as UserRole)
                    }
                    className={selectClass}
                >
                    <option value="company_admin">Admin de empresa</option>
                    <option value="super_admin">Super admin</option>
                </select>
                <InputError message={errors.role} />
            </div>

            {role === 'company_admin' && (
                <div className="grid gap-2">
                    <Label htmlFor={`company-${id}`}>Empresa</Label>
                    <select
                        id={`company-${id}`}
                        name="company_id"
                        required
                        defaultValue={user?.company_id ?? ''}
                        className={selectClass}
                    >
                        <option value="" disabled>
                            Selecciona una empresa
                        </option>
                        {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                                {company.name}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.company_id} />
                </div>
            )}

            <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor={`password-${id}`}>
                    {user ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                </Label>
                <Input
                    id={`password-${id}`}
                    name="password"
                    type="password"
                    required={!user}
                    autoComplete="new-password"
                />
                <InputError message={errors.password} />
            </div>
        </div>
    );
}

export default function Users({
    users,
    companies,
}: {
    users: UserRow[];
    companies: CompanyOption[];
}) {
    const { auth } = usePage().props;
    const [editing, setEditing] = useState<number | null>(null);

    const remove = (user: UserRow) => {
        if (confirm(`¿Eliminar a ${user.name}?`)) {
            router.delete(destroy.url(user.id), { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="Usuarios" />

            <div className="max-w-3xl space-y-8 p-4">
                <Heading
                    title="Usuarios"
                    description="Los admin de empresa votan por su empresa; los super admin ven todo y configuran la votación."
                />

                <Form
                    {...store.form()}
                    resetOnSuccess
                    options={{ preserveScroll: true }}
                    className="space-y-4 rounded-2xl border p-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <h3 className="font-medium">Agregar usuario</h3>
                            <UserFields companies={companies} errors={errors} />
                            <Button disabled={processing}>Agregar</Button>
                        </>
                    )}
                </Form>

                <ul className="divide-y rounded-2xl border">
                    {users.map((user) => (
                        <li key={user.id} className="p-4">
                            {editing === user.id ? (
                                <Form
                                    {...update.form(user.id)}
                                    options={{ preserveScroll: true }}
                                    onSuccess={() => setEditing(null)}
                                    className="space-y-4"
                                >
                                    {({ processing, errors }) => (
                                        <>
                                            <UserFields
                                                user={user}
                                                companies={companies}
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
                                <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="font-medium">
                                            {user.name}
                                        </p>
                                        <p className="truncate text-sm text-muted-foreground">
                                            {user.email} ·{' '}
                                            {user.role === 'super_admin'
                                                ? 'Super admin'
                                                : (user.company_name ??
                                                  'Sin empresa')}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setEditing(user.id)}
                                        >
                                            Editar
                                        </Button>
                                        {user.id !== auth.user.id && (
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => remove(user)}
                                            >
                                                Eliminar
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
}

Users.layout = {
    breadcrumbs: [
        {
            title: 'Usuarios',
            href: index(),
        },
    ],
};
