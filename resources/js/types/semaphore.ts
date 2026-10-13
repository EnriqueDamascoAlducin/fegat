export type VoteColor = 'green' | 'yellow' | 'red';

export type SemaphoreStatus = VoteColor | 'waiting' | 'not_open';

export type SemaphoreData = {
    status: SemaphoreStatus;
    phase: 'before' | 'open' | 'closed';
    flight_date: string;
    opens_at: string;
    closes_at: string;
    votes_count: number;
    companies_count: number;
    min_votes: number;
};

export type VoteCounts = Record<VoteColor, number>;
