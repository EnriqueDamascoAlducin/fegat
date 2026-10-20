export type UserRole = 'super_admin' | 'company_admin' | 'decider';

export type User = {
    id: number;
    name: string;
    email: string;
    username: string | null;
    phone: string | null;
    role: UserRole;
    company_id: number | null;
    company?: { id: number; name: string; is_active: boolean } | null;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};

export type Passkey = {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
