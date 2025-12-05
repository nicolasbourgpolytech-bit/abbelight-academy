"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserProfile, UserRole } from '@/types/user';

interface UserContextType {
    user: UserProfile | null;
    login: (name: string, roles: UserRole[]) => void;
    logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);

    const login = (name: string, roles: UserRole[]) => {
        setUser({
            name,
            email: 'demo@abbelight.com',
            roles,
            company: 'Demo Institute',
            xp: 1250,
            level: 5,
            badges: [
                { id: '1', name: 'Early Adopter', description: 'Joined during the beta phase', icon: '🚀', unlockedAt: new Date() },
                { id: '2', name: 'First Light', description: 'Completed "Fundamentals of SMLM"', icon: '💡', unlockedAt: new Date() }
            ]
        });
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <UserContext.Provider value={{ user, login, logout }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
