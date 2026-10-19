import type { ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** Globo de FEGAT (el logo sin la palabra), para el panel y las pantallas de acceso. */
export default function AppLogoIcon({ className, alt = 'FEGAT', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
    return <img src="/images/fegat-balloon.png" alt={alt} {...props} className={cn('object-contain', className)} />;
}
