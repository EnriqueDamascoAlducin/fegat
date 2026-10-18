/** Tipos del constructor de páginas y del header/footer (espejo de App\Support\PageContent y SiteLayout). */

export type LinkType = 'page' | 'blog' | 'blog_post' | 'blog_category' | 'blog_tag' | 'custom';

export type SiteLink = {
    label: string;
    url: string;
    link_type: LinkType;
    ref_id?: number | null;
    open_in_new_tab?: boolean;
};

export type NavOptionItem = { id: number; label: string; url: string };

export type NavOptions = {
    blog: { label: string; url: string };
    pages: NavOptionItem[];
    blog_posts: NavOptionItem[];
    blog_categories: NavOptionItem[];
    blog_tags: NavOptionItem[];
};

export type NavChild = SiteLink & { id: string };

export type NavItem = SiteLink & {
    id: string;
    visible: boolean;
    children: NavChild[];
};

export type HeaderCta = SiteLink & {
    enabled: boolean;
    content_type: 'text' | 'icon';
    icon: string;
};

export type HeaderData = {
    logo: string;
    logo_position: 'left' | 'center';
    logo_size: number;
    sticky: boolean;
    transparent_home: boolean;
    background_color: string;
    text_color: string;
    show_ticker: boolean;
    show_access_button: boolean;
    nav_items: NavItem[];
    cta: HeaderCta;
};

export type FooterLink = SiteLink & { id: string };

export type FooterColumn = { id: string; title: string; links: FooterLink[] };

export type FooterData = {
    background_color: string;
    text_color: string;
    description: string;
    copyright: string;
    show_socials: boolean;
    show_contact: boolean;
    columns: FooterColumn[];
};

export type SiteShared = {
    header: HeaderData;
    footer: FooterData;
    socials: Record<'facebook' | 'instagram' | 'tiktok' | 'youtube', string | null>;
    contact: { email: string | null; phones: string | null };
};

export type ContactDetails = {
    contact_email: string | null;
    contact_phones: string | null;
    contact_hours: string | null;
    contact_address: string | null;
    map_url: string | null;
    facebook_url: string | null;
    instagram_url: string | null;
    tiktok_url: string | null;
    youtube_url: string | null;
};

export type BlockType =
    | 'hero'
    | 'rich_text'
    | 'image'
    | 'image_cards'
    | 'image_features'
    | 'gallery'
    | 'stats'
    | 'why_us'
    | 'process'
    | 'testimonials'
    | 'cta'
    | 'faqs'
    | 'semaphore'
    | 'weather'
    | 'associates'
    | 'posts'
    | 'contact';

export type PageBlock = {
    id: string;
    type: BlockType;
    enabled: boolean;
    // Cada tipo de bloque guarda campos distintos (ver newBlock en el editor).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settings: Record<string, any>;
};

export type PageTheme = {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    radius: number;
    shadow: boolean;
    variant: number;
};

export type PageSeo = {
    meta_title: string;
    meta_description: string;
    og_title: string;
    og_description: string;
    og_image: string;
};

export type PageContent = {
    theme: PageTheme;
    blocks: PageBlock[];
    seo: PageSeo;
};
