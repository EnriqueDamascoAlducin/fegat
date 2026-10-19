import { router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { presence } from '@/routes';

const tokenKey = 'site_presence_token';
const lastBeatKey = 'site_presence_last_beat';
// Tras este silencio el mismo navegador cuenta como una visita nueva.
const NEW_VISIT_AFTER_MS = 30 * 60 * 1000;

// localStorage puede lanzar en WebViews de apps con el almacenamiento bloqueado.
const safeGet = (key: string): string | null => {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

const safeSet = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
    } catch {
        /* sin almacenamiento cada carga es un visitante nuevo */
    }
};

const createToken = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
        const random = (Math.random() * 16) | 0;

        return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
    });
};

const paidClick = (query: URLSearchParams): string | null => {
    // Anuncios sin UTM: el click id al menos dice de qué plataforma vino
    // (ojo: fbclid también lo llevan las publicaciones orgánicas).
    if (['gclid', 'gbraid', 'wbraid'].some((key) => query.has(key))) {
        return 'google';
    }

    if (query.has('fbclid')) {
        return 'meta';
    }

    if (query.has('ttclid')) {
        return 'tiktok';
    }

    return query.has('msclkid') ? 'microsoft' : null;
};

/**
 * Latido de «visitantes en vivo» (port de useStorePresence de sav_3): avisa al servidor en
 * qué página está el visitante. Corre después de la carga y solo con la pestaña visible.
 */
export function useSitePresence() {
    const { liveVisitors, auth } = usePage().props;
    const enabled = Boolean(liveVisitors?.enabled);
    const interval = Math.max(15, Number(liveVisitors?.interval ?? 30)) * 1000;
    // El personal y las empresas con sesión iniciada no son visitantes.
    const isMember = Boolean(auth?.user);

    useEffect(() => {
        if (typeof window === 'undefined' || !enabled || isMember) {
            return;
        }

        let token = safeGet(tokenKey);

        if (!token) {
            token = createToken();
            safeSet(tokenKey, token);
        }

        let lastPath: string | null = null;
        let lastBeatAt = 0;

        const beat = () => {
            if (document.visibilityState !== 'visible') {
                return;
            }

            const now = Date.now();
            const path = window.location.pathname;
            const navigated = path !== lastPath;

            // Inertia dispara `navigate` también en la carga inicial.
            if (!navigated && now - lastBeatAt < 2000) {
                return;
            }

            const previousBeat = Number(safeGet(lastBeatKey) ?? 0);
            const newVisit = !previousBeat || now - previousBeat > NEW_VISIT_AFTER_MS;

            const payload: Record<string, unknown> = {
                token,
                path,
                title: document.title,
                device_type: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
                screen_width: Math.round(window.innerWidth),
                navigated,
                new_visit: newVisit,
            };

            if (newVisit) {
                const query = new URLSearchParams(window.location.search);
                payload.utm_source = query.get('utm_source');
                payload.utm_medium = query.get('utm_medium');
                payload.utm_campaign = query.get('utm_campaign');
                payload.paid_click = paidClick(query);

                try {
                    const referrer = document.referrer ? new URL(document.referrer) : null;
                    payload.referrer_host = referrer && referrer.host !== window.location.host ? referrer.host : null;
                } catch {
                    /* referrer inválido */
                }
            }

            lastPath = path;
            lastBeatAt = now;
            safeSet(lastBeatKey, String(now));

            // Sin cookies: el endpoint no usa sesión.
            fetch(presence.url(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'omit',
                keepalive: true,
            }).catch(() => {
                /* un latido perdido no importa */
            });
        };

        // Se espera a que la página termine de cargar y a que <Head> ponga el título.
        const initial = window.setTimeout(beat, 2500);
        const timer = window.setInterval(beat, interval);
        const removeNavigate = router.on('navigate', () => window.setTimeout(beat, 400));
        const onVisibility = () => {
            if (document.visibilityState === 'visible' && Date.now() - lastBeatAt > interval) {
                beat();
            }
        };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            window.clearTimeout(initial);
            window.clearInterval(timer);
            removeNavigate();
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [enabled, isMember, interval]);
}
