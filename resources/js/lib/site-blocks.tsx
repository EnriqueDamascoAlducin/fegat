// Helpers del constructor de páginas, compartidos por el renderizador público y el editor
// (port de homeBlockUtils de sav_3).

import {
    Accessibility,
    Award,
    BadgeCheck,
    Calendar,
    Camera,
    CheckCircle2,
    Clock,
    Cloud,
    Compass,
    Eye,
    Flame,
    Gift,
    Globe,
    Handshake,
    Headphones,
    Heart,
    Leaf,
    Lock,
    Mail,
    Map as MapIcon,
    MapPin,
    Medal,
    MessageCircle,
    Mountain,
    Phone,
    Plane,
    Rocket,
    Shield,
    ShieldCheck,
    Smile,
    Sparkles,
    Star,
    Sun,
    Sunrise,
    ThumbsUp,
    Trophy,
    Users,
    Wind,
    Zap,
} from 'lucide-react';
import type { CSSProperties, ElementType } from 'react';

// Iconos disponibles para los bloques. El selector del editor lista exactamente estas llaves.
export const IconMap: Record<string, ElementType> = {
    Accessibility,
    Award,
    BadgeCheck,
    Calendar,
    Camera,
    CheckCircle2,
    Clock,
    Cloud,
    Compass,
    Eye,
    Flame,
    Gift,
    Globe,
    Handshake,
    Headphones,
    Heart,
    Leaf,
    Lock,
    Mail,
    Map: MapIcon,
    MapPin,
    Medal,
    MessageCircle,
    Mountain,
    Phone,
    Plane,
    Rocket,
    Shield,
    ShieldCheck,
    Smile,
    Sparkles,
    Star,
    Sun,
    Sunrise,
    ThumbsUp,
    Trophy,
    Users,
    Wind,
    Zap,
};

// Palabras en español para que el buscador encuentre el icono sin saber su nombre en inglés.
export const ICON_KEYWORDS: Record<string, string> = {
    Accessibility: 'accesibilidad inclusion discapacidad',
    Award: 'premio medalla certificado reconocimiento',
    BadgeCheck: 'verificado certificado insignia garantia',
    Calendar: 'calendario fecha agenda evento',
    Camera: 'camara foto fotografia video',
    CheckCircle2: 'palomita check listo confirmado',
    Clock: 'reloj hora tiempo horario',
    Cloud: 'nube clima cielo',
    Compass: 'brujula explorar ruta',
    Eye: 'ojo vista panoramica transparencia',
    Flame: 'fuego llama quemador',
    Gift: 'regalo donativo apoyo',
    Globe: 'globo mundo internacional',
    Handshake: 'apreton manos confianza acuerdo cooperacion',
    Headphones: 'audifonos soporte atencion',
    Heart: 'corazon amor apoyo social',
    Leaf: 'hoja naturaleza ecologico sustentable',
    Lock: 'candado seguro privado',
    Mail: 'correo email mensaje',
    Map: 'mapa ruta poligonal',
    MapPin: 'ubicacion pin lugar',
    Medal: 'medalla premio excelencia',
    MessageCircle: 'mensaje chat contacto',
    Mountain: 'montaña paisaje piramides',
    Phone: 'telefono llamada contacto',
    Plane: 'avion vuelo viaje',
    Rocket: 'cohete innovacion despegue',
    Shield: 'escudo seguridad proteccion',
    ShieldCheck: 'escudo seguridad garantia',
    Smile: 'sonrisa feliz satisfaccion',
    Sparkles: 'destellos brillo especial',
    Star: 'estrella calificacion favorito',
    Sun: 'sol dia clima',
    Sunrise: 'amanecer sol salida',
    ThumbsUp: 'pulgar like recomendado',
    Trophy: 'trofeo ganador premio',
    Users: 'personas grupo equipo socios',
    Wind: 'viento aire clima',
    Zap: 'rayo rapido energia',
};

export function hasHtml(value?: unknown): boolean {
    const html = String(value ?? '').trim();

    return html !== '' && html !== '<p></p>';
}

export function stripHtml(value?: unknown): string {
    return String(value ?? '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** HTML ya saneado por el servidor (App\Support\PageContent). */
export function RichHtml({ html, className, as: Tag = 'div' }: { html?: unknown; className?: string; as?: ElementType }) {
    if (!hasHtml(html)) {
        return null;
    }

    return <Tag className={className} dangerouslySetInnerHTML={{ __html: String(html) }} />;
}

/** HTML libre del bloque: solo lo escribe el super admin. */
export function CustomHtml({ html }: { html?: string }) {
    if (!html) {
        return null;
    }

    return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export function overlayStyle(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settings: Record<string, any>,
    fallbackColor = '#160C19',
    fallbackOpacity = 58,
): CSSProperties | null {
    if (settings.overlay_enabled !== true) {
        return null;
    }

    const raw = Number(settings.overlay_opacity ?? fallbackOpacity);
    const opacity = Math.min(Math.max(Number.isFinite(raw) ? raw : fallbackOpacity, 0), 100) / 100;

    return { backgroundColor: settings.overlay_color || fallbackColor, opacity };
}

// Columnas en escritorio de las tarjetas (clases estáticas para Tailwind).
export function gridColumnsClass(columns?: unknown): string {
    const n = Number(columns);

    if (n === 2) {
        return 'sm:grid-cols-2';
    }

    if (n === 4) {
        return 'sm:grid-cols-2 lg:grid-cols-4';
    }

    return 'sm:grid-cols-2 lg:grid-cols-3';
}

/** Elementos de una lista con algo que mostrar (descarta los vacíos). */
export function filledItems<T extends Record<string, unknown>>(items: unknown, keys: (keyof T)[]): T[] {
    return (Array.isArray(items) ? items : []).filter(
        (item): item is T => Boolean(item) && keys.some((key) => Boolean((item as T)[key])),
    );
}

export function uid(prefix = 'block'): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
