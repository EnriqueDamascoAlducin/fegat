export type Company = {
    id: number;
    name: string;
    website_url: string | null;
    logo_url: string | null;
};

function CompanyLogo({ company }: { company: Company }) {
    const content = company.logo_url ? (
        <img
            src={company.logo_url}
            alt={company.name}
            loading="lazy"
            className="mx-auto max-h-24 w-auto max-w-full object-contain grayscale transition duration-300 group-hover:scale-105 group-hover:grayscale-0"
        />
    ) : (
        <span className="font-display text-xl font-medium text-neutral-500 transition-colors group-hover:text-brand">
            {company.name}
        </span>
    );
    const className =
        'group flex h-36 items-center justify-center px-6 text-center';

    return company.website_url ? (
        <a
            href={company.website_url}
            target="_blank"
            rel="noreferrer"
            className={className}
        >
            {content}
        </a>
    ) : (
        <div className={className}>{content}</div>
    );
}

/** Cuadrícula con los logos de las empresas asociadas. */
export default function CompanyLogos({ companies }: { companies: Company[] }) {
    return (
        <ul className="mx-auto grid max-w-6xl grid-cols-2 lg:grid-cols-4">
            {companies.map((company) => (
                <li key={company.id}>
                    <CompanyLogo company={company} />
                </li>
            ))}
        </ul>
    );
}
