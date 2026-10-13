import { Link, usePage } from '@inertiajs/react';
import { Building2, Clock, History, LayoutGrid, Users } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { history } from '@/routes/admin';
import { index as companies } from '@/routes/admin/companies';
import { index as users } from '@/routes/admin/users';
import { edit as voting } from '@/routes/admin/voting';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Semáforo',
        href: dashboard(),
        icon: LayoutGrid,
    },
];

const adminNavItems: NavItem[] = [
    {
        title: 'Historial',
        href: history(),
        icon: History,
    },
    {
        title: 'Votación',
        href: voting(),
        icon: Clock,
    },
    {
        title: 'Empresas',
        href: companies(),
        icon: Building2,
    },
    {
        title: 'Usuarios',
        href: users(),
        icon: Users,
    },
];

export function AppSidebar() {
    const { auth } = usePage().props;
    const items =
        auth.user.role === 'super_admin'
            ? [...mainNavItems, ...adminNavItems]
            : mainNavItems;

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={items} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
