import { Badge } from "./gamification";

export type UserRole = 'general' | 'reagent' | 'safe' | 'abbelighter' | 'abbelighter_admin';

export type UserStatus = 'pending' | 'active' | 'rejected';

export interface UserProfile {
    id: number;
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    roles: UserRole[];
    company?: string;
    status: UserStatus;
    xp: number;
    level: number;
    badges: Badge[];
}
