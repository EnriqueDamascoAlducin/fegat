import { cn } from '@/lib/utils';

export const MY_FLIGHT_URL = 'https://myflight.com.mx/';
export const MY_FLIGHT_LOGO = '/images/myflight-logo.png';

/** Crédito «Powered by My Flight» al pie del panel. */
export default function PoweredBy({ className }: { className?: string }) {
    return (
        <footer
            className={cn(
                'mt-auto flex items-center justify-center gap-2 border-t px-4 py-4 text-xs tracking-[0.2em] text-muted-foreground uppercase',
                className,
            )}
        >
            Powered by
            <a
                href={MY_FLIGHT_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 font-bold text-foreground hover:underline"
            >
                <img src={MY_FLIGHT_LOGO} alt="" className="size-6" />
                My Flight
            </a>
        </footer>
    );
}
