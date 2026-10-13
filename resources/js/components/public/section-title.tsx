import type { ReactNode } from 'react';

export default function SectionTitle({
    title,
    children,
}: {
    title: string;
    children?: ReactNode;
}) {
    return (
        <div className="text-center">
            <h2 className="font-display text-[32px] leading-tight font-bold text-brand uppercase">
                {title}
            </h2>
            <div className="relative mx-auto mt-5 h-px w-32 bg-neutral-300">
                <span className="absolute -top-px left-1/2 h-[3px] w-10 -translate-x-1/2 bg-brand-soft" />
            </div>
            {children && <p className="mt-6">{children}</p>}
        </div>
    );
}
