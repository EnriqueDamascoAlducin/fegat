import { COLOR_LABELS } from '@/lib/semaphore';
import { cn } from '@/lib/utils';
import type { VoteColor } from '@/types';

const STYLES: Record<VoteColor, string> = {
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
    yellow: 'bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300',
};

export default function VoteBadge({ color }: { color: VoteColor | null }) {
    if (!color) {
        return <span className="text-sm text-muted-foreground">Sin voto</span>;
    }

    return (
        <span
            className={cn(
                'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                STYLES[color],
            )}
        >
            {COLOR_LABELS[color]}
        </span>
    );
}
