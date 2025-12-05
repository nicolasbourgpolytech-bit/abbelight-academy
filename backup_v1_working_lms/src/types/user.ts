import { Badge } from "./gamification";

export type UserRole = 'general' | 'reagent' | 'safe';

export interface UserProfile {
    name: string;
    email: string;
    roles: UserRole[];
    company?: string;
    xp: number;
    level: number;
    badges: Badge[];
}
