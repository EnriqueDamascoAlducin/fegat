import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="4" r="3.5" />
            <circle cx="12" cy="12" r="3.5" />
            <circle cx="12" cy="20" r="3.5" />
        </svg>
    );
}
