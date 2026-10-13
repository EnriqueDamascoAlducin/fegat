import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
};

/**
 * Botón «Instalar app». Solo aparece cuando el navegador ofrece la instalación
 * (Chrome, Edge y Android); en iPhone se instala desde Compartir → Agregar a inicio.
 */
export default function InstallButton({ className }: { className?: string }) {
    const [installEvent, setInstallEvent] =
        useState<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        const onPrompt = (event: Event) => {
            event.preventDefault();
            setInstallEvent(event as BeforeInstallPromptEvent);
        };
        const onInstalled = () => setInstallEvent(null);

        window.addEventListener('beforeinstallprompt', onPrompt);
        window.addEventListener('appinstalled', onInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', onPrompt);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    if (!installEvent) {
        return null;
    }

    return (
        <button
            type="button"
            className={className}
            onClick={() => {
                void installEvent.prompt();
                setInstallEvent(null);
            }}
        >
            Instalar app
        </button>
    );
}
