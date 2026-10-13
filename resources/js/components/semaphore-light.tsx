import { cn } from '@/lib/utils';
import type { SemaphoreStatus, VoteColor } from '@/types';

const LIGHTS: { color: VoteColor; on: string }[] = [
    { color: 'red', on: 'bg-red-500 shadow-[0_0_40px_10px] shadow-red-500/70' },
    {
        color: 'yellow',
        on: 'bg-amber-400 shadow-[0_0_40px_10px] shadow-amber-400/70',
    },
    {
        color: 'green',
        on: 'bg-emerald-500 shadow-[0_0_40px_10px] shadow-emerald-500/70',
    },
];

export default function SemaphoreLight({
    status,
    size = 'md',
    className,
}: {
    status: SemaphoreStatus;
    size?: 'md' | 'lg';
    className?: string;
}) {
    return (
        <div
            role="img"
            aria-label={`Semáforo: ${status}`}
            className={cn(
                'flex w-fit flex-col bg-neutral-900 ring-1 ring-white/10',
                size === 'lg'
                    ? 'gap-4 rounded-[2.75rem] p-5 shadow-xl'
                    : 'gap-3 rounded-[2rem] p-4',
                className,
            )}
        >
            {LIGHTS.map((light) => (
                <span
                    key={light.color}
                    className={cn(
                        'rounded-full transition-all duration-500',
                        size === 'lg' ? 'size-20 sm:size-24' : 'size-16',
                        status === light.color ? light.on : 'bg-neutral-700',
                        status === 'waiting' && 'animate-pulse',
                    )}
                />
            ))}
        </div>
    );
}
