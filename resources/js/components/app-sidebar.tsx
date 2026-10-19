import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    Building2,
    ChartColumn,
    ChartLine,
    Clock,
    FileText,
    History,
    KeyRound,
    LayoutGrid,
    Newspaper,
    PanelsTopLeft,
    Users,
} from 'lucide-react';
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
import { dashboard, indicators } from '@/routes';
import { history } from '@/routes/admin';
import { index as apiClients } from '@/routes/admin/api-clients';
import { index as companies } from '@/routes/admin/companies';
import { index as pages } from '@/routes/admin/pages';
import { index as posts } from '@/routes/admin/posts';
import { edit as site } from '@/routes/admin/site';
import { index as liveVisitors, report as visitorReport } from '@/routes/admin/visitors';
import { index as users } from '@/routes/admin/users';
import { edit as voting } from '@/routes/admin/voting';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Semáforo',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Indicadores',
        href: indicators(),
        icon: ChartColumn,
    },
];

const adminNavItems: NavItem[] = [
    {
        title: 'Páginas',
        href: pages(),
        icon: FileText,
    },
    {
        title: 'Sitio público',
        href: site(),
        icon: PanelsTopLeft,
    },
    {
        title: 'Blog',
        href: posts(),
        icon: Newspaper,
    },
    {
        title: 'Visitantes en vivo',
        href: liveVisitors(),
        icon: Activity,
    },
    {
        title: 'Reporte de visitantes',
        href: visitorReport(),
        icon: ChartLine,
    },
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
    {
        title: 'Llaves de API',
        href: apiClients(),
        icon: KeyRound,
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
