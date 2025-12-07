"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserProfile, UserRole } from '@/types/user';

interface UserContextType {
    user: UserProfile | null;
    login: (name: string, roles: UserRole[]) => void;
    logout: () => void;
    isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load user from local storage on mount
    React.useEffect(() => {
        const storedUser = localStorage.getItem('abbelight_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user from local storage", e);
                localStorage.removeItem('abbelight_user');
            }
        }
        setIsLoading(false);
    }, []);

    const login = (name: string, roles: UserRole[]) => {
        // TODO: Replace with real Login API
        const newUser: UserProfile = {
            id: 1, // Temp ID
            name,
            email: 'demo@abbelight.com',
            roles,
            company: 'Demo Institute',
            status: 'active',
            xp: 1250,
            level: 5,
            badges: [
                { id: '1', name: 'Early Adopter', description: 'Joined during the beta phase', icon: '🚀', unlockedAt: new Date() },
                { id: '2', name: 'First Light', description: 'Completed "Fundamentals of SMLM"', icon: '💡', unlockedAt: new Date() }
            ]
        };
        setUser(newUser);
        localStorage.setItem('abbelight_user', JSON.stringify(newUser));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('abbelight_user');
    };

    return (
        <UserContext.Provider value={{ user, login, logout, isLoading }}>
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
