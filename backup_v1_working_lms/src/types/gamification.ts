export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string; // URL or icon name
    unlockedAt?: Date;
}

export type RankCheck = 'Nova' | 'Apprentice' | 'Specialist' | 'Expert' | 'Master';

export const RANKS: { name: RankCheck; minXp: number; color: string }[] = [
    { name: 'Nova', minXp: 0, color: 'text-gray-400' },
    { name: 'Apprentice', minXp: 500, color: 'text-primary' },
    { name: 'Specialist', minXp: 1500, color: 'text-secondary' },
    { name: 'Expert', minXp: 3000, color: 'text-accent' },
    { name: 'Master', minXp: 6000, color: 'text-warning' },
];

export function getRank(xp: number) {
    return RANKS.slice().reverse().find(r => xp >= r.minXp) || RANKS[0];
}

export function getNextRank(xp: number) {
    const currentRankIndex = RANKS.findIndex(r => r.name === getRank(xp).name);
    return RANKS[currentRankIndex + 1] || null;
}
