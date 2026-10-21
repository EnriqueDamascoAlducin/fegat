import { Form, Head, router, usePage } from '@inertiajs/react';
import {
    Building2,
    MessageCircle,
    MoreHorizontal,
    Pencil,
    Search,
    ShieldCheck,
    Trash2,
    UserPlus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { destroy, index, store, update } from '@/routes/admin/users';
import type { UserRole } from '@/types';

type UserRow = {
    id: number;
    name: string;
    email: string;
    username: string | null;
    phone: string | null;
    role: UserRole;
    company_id: number | null;
    company_name: string | null;
    two_factor: boolean;
    created_at: string | null;
};

type CompanyOption = {
    id: number;
    name: string;
};

const ROLES: Record<
    UserRole,
    { label: string; description: string; badge: string }
> = {
    company_admin: {
        label: 'Admin de empresa',
        description: 'Vota por su empresa en cada jornada.',
        badge: 'bg-brand/10 text-brand ring-brand/20 dark:bg-brand-soft/15 dark:text-brand-soft dark:ring-brand-soft/25',
    },
    decider: {
        label: 'Decisor',
        description: 'Fija el color oficial del semáforo.',
        badge: 'bg-amber-100 text-amber-900 ring-amber-600/20 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/25',
    },
    super_admin: {
        label: 'Super admin',
        description: 'Administra toda la plataforma.',
        badge: 'bg-neutral-900 text-white ring-neutral-900/10 dark:bg-white dark:text-neutral-900 dark:ring-white/10',
    },
};

const ROLE_ORDER: UserRole[] = ['company_admin', 'decider', 'super_admin'];

const selectClass =
    'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>option]:bg-background [&>option]:text-foreground';

/** «+525512345678» → «+52 55 1234 5678». */
function formatPhone(phone: string): string {
    const match = phone.match(/^\+52(\d{2})(\d{4})(\d{4})$/);

    return match ? `+52 ${match[1]} ${match[2]} ${match[3]}` : phone;
}

function formatDate(value: string): string {
    const [year, month, day] = value.split('-').map(Number);

    return new Date(year, month - 1, day).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function RoleBadge({ role }: { role: UserRole }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
                ROLES[role].badge,
            )}
        >
            {ROLES[role].label}
        </span>
    );
}

function UserIdentity({ user, isMe }: { user: UserRow; isMe: boolean }) {
    const getInitials = useInitials();

    return (
        <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-10 shrink-0">
                <AvatarFallback className="bg-muted text-sm font-medium">
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
                <p className="flex items-center gap-2 truncate font-medium">
                    {user.name}
                    {isMe && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
                            Tú
                        </span>
                    )}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                    {user.email}
                </p>
            </div>
        </div>
    );
}

/** Alias, WhatsApp y verificación en dos pasos, en una línea compacta. */
function AccessDetails({ user }: { user: UserRow }) {
    const items: ReactNode[] = [];

    if (user.username) {
        items.push(
            <span key="alias" className="font-mono text-xs">
                @{user.username}
            </span>,
        );
    }

    if (user.phone) {
        items.push(
            <span key="phone" className="inline-flex items-center gap-1">
                <MessageCircle className="size-3.5" aria-hidden="true" />
                <span className="sr-only">WhatsApp</span>
                {formatPhone(user.phone)}
            </span>,
        );
    }

    if (user.two_factor) {
        items.push(
            <span
                key="2fa"
                className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400"
            >
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                2FA
            </span>,
        );
    }

    return items.length ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {items}
        </div>
    ) : (
        <span className="text-sm text-muted-foreground">—</span>
    );
}

function RowActions({
    user,
    isMe,
    onEdit,
    onDelete,
}: {
    user: UserRow;
    isMe: boolean;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={(event) => event.stopPropagation()}
                >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Acciones para {user.name}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                onClick={(event) => event.stopPropagation()}
            >
                <DropdownMenuItem onSelect={onEdit}>
                    <Pencil className="mr-2 size-4" /> Editar
                </DropdownMenuItem>
                {!isMe && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onSelect={onDelete}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="mr-2 size-4" /> Eliminar
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function FormSection({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section className="space-y-4">
            <div>
                <h3 className="text-sm font-semibold">{title}</h3>
                {description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {children}
        </section>
    );
}

function Field({
    id,
    label,
    error,
    hint,
    children,
}: {
    id: string;
    label: string;
    error?: string;
    hint?: string;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            {children}
            {hint && !error && (
                <p className="text-xs text-muted-foreground">{hint}</p>
            )}
            <InputError message={error} />
        </div>
    );
}

/** Panel lateral para crear o editar un usuario. */
function UserSheet({
    open,
    onOpenChange,
    user,
    isMe,
    companies,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: UserRow | null;
    isMe: boolean;
    companies: CompanyOption[];
}) {
    const [role, setRole] = useState<UserRole>(user?.role ?? 'company_admin');
    const formProps = user ? update.form(user.id) : store.form();

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className="w-full gap-0 p-0 sm:max-w-xl"
                // Al editar no se enfoca (ni se selecciona) el primer campo.
                onOpenAutoFocus={(event) => user && event.preventDefault()}
            >
                <Form
                    {...formProps}
                    options={{ preserveScroll: true }}
                    onSuccess={() => onOpenChange(false)}
                    className="flex h-full flex-col"
                >
                    {({ processing, errors }) => (
                        <>
                            <SheetHeader className="border-b px-6 py-5">
                                <SheetTitle className="text-lg">
                                    {user ? 'Editar usuario' : 'Nuevo usuario'}
                                </SheetTitle>
                                <SheetDescription>
                                    {user
                                        ? `Cambios a la cuenta de ${user.name}.`
                                        : 'La cuenta queda activa de inmediato; comparte el correo o alias y la contraseña con la persona.'}
                                </SheetDescription>
                            </SheetHeader>

                            <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
                                <FormSection title="Datos generales">
                                    <Field
                                        id="name"
                                        label="Nombre completo"
                                        error={errors.name}
                                    >
                                        <Input
                                            id="name"
                                            name="name"
                                            required
                                            autoComplete="off"
                                            defaultValue={user?.name}
                                            placeholder="Juan Pérez"
                                        />
                                    </Field>
                                    <Field
                                        id="email"
                                        label="Correo"
                                        error={errors.email}
                                    >
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            autoComplete="off"
                                            defaultValue={user?.email}
                                            placeholder="correo@empresa.com"
                                        />
                                    </Field>
                                </FormSection>

                                <FormSection
                                    title="Rol"
                                    description="Define qué puede hacer en la plataforma."
                                >
                                    <div
                                        role="radiogroup"
                                        aria-label="Rol"
                                        className="grid gap-2"
                                    >
                                        {ROLE_ORDER.map((value) => {
                                            const locked =
                                                isMe && value !== 'super_admin';

                                            return (
                                                <label
                                                    key={value}
                                                    className={cn(
                                                        'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                                                        role === value
                                                            ? 'border-brand bg-brand/5 dark:border-brand-soft dark:bg-brand-soft/10'
                                                            : 'hover:bg-muted/50',
                                                        locked &&
                                                            'cursor-not-allowed opacity-50',
                                                    )}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="role"
                                                        value={value}
                                                        checked={role === value}
                                                        disabled={locked}
                                                        onChange={() =>
                                                            setRole(value)
                                                        }
                                                        className="mt-1 size-4 accent-[var(--color-brand)]"
                                                    />
                                                    <span>
                                                        <span className="block text-sm font-medium">
                                                            {ROLES[value].label}
                                                        </span>
                                                        <span className="block text-sm text-muted-foreground">
                                                            {
                                                                ROLES[value]
                                                                    .description
                                                            }
                                                        </span>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    {isMe && (
                                        <p className="text-xs text-muted-foreground">
                                            No puedes quitarte a ti mismo el rol
                                            de super admin.
                                        </p>
                                    )}
                                    <InputError message={errors.role} />

                                    {role === 'company_admin' && (
                                        <Field
                                            id="company_id"
                                            label="Empresa"
                                            error={errors.company_id}
                                        >
                                            <select
                                                id="company_id"
                                                name="company_id"
                                                required
                                                defaultValue={
                                                    user?.company_id ?? ''
                                                }
                                                className={selectClass}
                                            >
                                                <option value="" disabled>
                                                    Selecciona una empresa
                                                </option>
                                                {companies.map((company) => (
                                                    <option
                                                        key={company.id}
                                                        value={company.id}
                                                    >
                                                        {company.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>
                                    )}
                                </FormSection>

                                <FormSection
                                    title="Acceso"
                                    description="Puede entrar con su correo o con el alias."
                                >
                                    <Field
                                        id="username"
                                        label="Alias (opcional)"
                                        error={errors.username}
                                        hint="Letras, números, punto, guion o guion bajo."
                                    >
                                        <div className="relative">
                                            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                                                @
                                            </span>
                                            <Input
                                                id="username"
                                                name="username"
                                                autoComplete="off"
                                                autoCapitalize="none"
                                                spellCheck={false}
                                                placeholder="aerostat"
                                                defaultValue={
                                                    user?.username ?? ''
                                                }
                                                className="pl-7"
                                            />
                                        </div>
                                    </Field>
                                    <Field
                                        id="password"
                                        label={
                                            user
                                                ? 'Nueva contraseña'
                                                : 'Contraseña'
                                        }
                                        error={errors.password}
                                        hint={
                                            user
                                                ? 'Déjala vacía para conservar la actual.'
                                                : undefined
                                        }
                                    >
                                        <PasswordInput
                                            id="password"
                                            name="password"
                                            required={!user}
                                            autoComplete="new-password"
                                        />
                                    </Field>
                                </FormSection>

                                <FormSection
                                    title="WhatsApp"
                                    description="Para recibir el recordatorio y votar respondiendo la encuesta."
                                >
                                    <Field
                                        id="phone"
                                        label="Número (opcional)"
                                        error={errors.phone}
                                        hint="Diez dígitos se toman como número de México."
                                    >
                                        <Input
                                            id="phone"
                                            name="phone"
                                            type="tel"
                                            autoComplete="off"
                                            placeholder="55 1234 5678"
                                            defaultValue={user?.phone ?? ''}
                                        />
                                    </Field>
                                </FormSection>
                            </div>

                            <SheetFooter className="flex-row justify-end gap-2 border-t px-6 py-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button disabled={processing}>
                                    {user ? 'Guardar cambios' : 'Crear usuario'}
                                </Button>
                            </SheetFooter>
                        </>
                    )}
                </Form>
            </SheetContent>
        </Sheet>
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
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
    const [sheet, setSheet] = useState<{
        open: boolean;
        user: UserRow | null;
        key: number;
    }>({ open: false, user: null, key: 0 });
    const [deleting, setDeleting] = useState<UserRow | null>(null);

    const openSheet = (user: UserRow | null) =>
        setSheet((current) => ({ open: true, user, key: current.key + 1 }));

    const counts = useMemo(() => {
        const result: Record<UserRole | 'all', number> = {
            all: users.length,
            company_admin: 0,
            decider: 0,
            super_admin: 0,
        };
        users.forEach((user) => result[user.role]++);

        return result;
    }, [users]);

    const visible = useMemo(() => {
        const term = search.trim().toLowerCase();

        return users.filter(
            (user) =>
                (roleFilter === 'all' || user.role === roleFilter) &&
                (!term ||
                    [user.name, user.email, user.username, user.company_name]
                        .filter(Boolean)
                        .some((value) => value!.toLowerCase().includes(term))),
        );
    }, [users, search, roleFilter]);

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        router.delete(destroy.url(deleting.id), {
            preserveScroll: true,
            onFinish: () => setDeleting(null),
        });
    };

    const filters: { value: UserRole | 'all'; label: string }[] = [
        { value: 'all', label: 'Todos' },
        ...ROLE_ORDER.map((value) => ({ value, label: ROLES[value].label })),
    ];

    return (
        <>
            <Head title="Usuarios" />

            <div className="flex flex-col gap-6 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <Heading
                        title="Usuarios"
                        description="Quién entra a la plataforma y qué puede hacer."
                    />
                    <Button
                        onClick={() => openSheet(null)}
                        className="shrink-0"
                    >
                        <UserPlus className="size-4" /> Nuevo usuario
                    </Button>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
                        {filters.map((filter) => (
                            <button
                                key={filter.value}
                                type="button"
                                onClick={() => setRoleFilter(filter.value)}
                                aria-pressed={roleFilter === filter.value}
                                className={cn(
                                    'rounded-md px-3 py-1.5 text-sm transition-colors',
                                    roleFilter === filter.value
                                        ? 'bg-background font-medium shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {filter.label}
                                <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
                                    {counts[filter.value]}
                                </span>
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full lg:w-72">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar por nombre, correo o empresa"
                            className="pl-9"
                            aria-label="Buscar usuarios"
                        />
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border">
                    {visible.length === 0 ? (
                        <p className="p-10 text-center text-sm text-muted-foreground">
                            Ningún usuario coincide con la búsqueda.
                        </p>
                    ) : (
                        <>
                            {/* Escritorio: tabla. */}
                            <table className="hidden w-full text-left text-sm md:table">
                                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">
                                            Usuario
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Rol
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Empresa
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Acceso
                                        </th>
                                        <th className="px-4 py-3 font-medium whitespace-nowrap">
                                            Alta
                                        </th>
                                        <th className="w-12 px-4 py-3">
                                            <span className="sr-only">
                                                Acciones
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {visible.map((user) => {
                                        const isMe = user.id === auth.user.id;

                                        return (
                                            <tr
                                                key={user.id}
                                                onClick={() => openSheet(user)}
                                                className="cursor-pointer transition-colors hover:bg-muted/40"
                                            >
                                                <td className="max-w-72 px-4 py-3">
                                                    <UserIdentity
                                                        user={user}
                                                        isMe={isMe}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <RoleBadge
                                                        role={user.role}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    {user.company_name ?? (
                                                        <span className="text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <AccessDetails
                                                        user={user}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                                    {user.created_at
                                                        ? formatDate(
                                                              user.created_at,
                                                          )
                                                        : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <RowActions
                                                        user={user}
                                                        isMe={isMe}
                                                        onEdit={() =>
                                                            openSheet(user)
                                                        }
                                                        onDelete={() =>
                                                            setDeleting(user)
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Celular: tarjetas. */}
                            <ul className="divide-y md:hidden">
                                {visible.map((user) => {
                                    const isMe = user.id === auth.user.id;

                                    return (
                                        <li
                                            key={user.id}
                                            className="space-y-3 p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <UserIdentity
                                                    user={user}
                                                    isMe={isMe}
                                                />
                                                <RowActions
                                                    user={user}
                                                    isMe={isMe}
                                                    onEdit={() =>
                                                        openSheet(user)
                                                    }
                                                    onDelete={() =>
                                                        setDeleting(user)
                                                    }
                                                />
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 pl-13">
                                                <RoleBadge role={user.role} />
                                                {user.company_name && (
                                                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                                                        <Building2 className="size-3.5" />
                                                        {user.company_name}
                                                    </span>
                                                )}
                                            </div>
                                            {(user.username ||
                                                user.phone ||
                                                user.two_factor) && (
                                                <div className="pl-13">
                                                    <AccessDetails
                                                        user={user}
                                                    />
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    )}
                </div>
            </div>

            <UserSheet
                key={sheet.key}
                open={sheet.open}
                onOpenChange={(open) =>
                    setSheet((current) => ({ ...current, open }))
                }
                user={sheet.user}
                isMe={sheet.user?.id === auth.user.id}
                companies={companies}
            />

            <Dialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Eliminar a {deleting?.name}?</DialogTitle>
                        <DialogDescription>
                            Perderá el acceso a la plataforma de inmediato. Sus
                            votos anteriores se conservan en el historial.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleting(null)}
                        >
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete}>
                            Eliminar usuario
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
