"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserProfile, UserRole } from '@/types/user';

interface UserContextType {
    user: UserProfile | null;
    login: (email: string, password?: string) => Promise<any>;
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

    const login = async (email: string, password?: string) => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Login failed");
            }

            const user = data.user;
            setUser(user);
            localStorage.setItem('abbelight_user', JSON.stringify(user));
            return user;
        } catch (error) {
            console.error("Login error:", error);
            throw error;
        }
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
