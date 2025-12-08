"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserProfile, UserRole } from '@/types/user';

interface UserContextType {
    user: UserProfile | null;
    login: (email: string, password?: string) => Promise<any>;
    logout: () => void;
    isLoading: boolean;
    refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load user from local storage on mount
    React.useEffect(() => {
        const storedUser = localStorage.getItem('abbelight_session_v2');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user from local storage", e);
                localStorage.removeItem('abbelight_session_v2');
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
            localStorage.setItem('abbelight_session_v2', JSON.stringify(user));
            return user;
        } catch (error) {
            console.error("Login error:", error);
            throw error;
        }
    };

    const logout = async () => {
        if (user?.email) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: user.email })
                });
            } catch (e) {
                console.error("Failed to notify server of logout", e);
            }
        }
        setUser(null);
        localStorage.removeItem('abbelight_session_v2');
    };

    // Heartbeat mechanism
    React.useEffect(() => {
        if (!user) return;

        const sendHeartbeat = async () => {
            try {
                await fetch('/api/user/heartbeat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: user.email })
                });
            } catch (error) {
                console.error("Heartbeat failed", error);
            }
        };

        // Send immediately on login/load
        sendHeartbeat();

        // Then every 20 seconds
        const interval = setInterval(sendHeartbeat, 20000);

        return () => clearInterval(interval);
    }, [user]);

    const refreshUser = async () => {
        if (!user?.email) return;
        try {
            const res = await fetch(`/api/users?email=${encodeURIComponent(user.email)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.users && data.users.length > 0) {
                    const updatedUser = data.users[0];
                    // Merge with existing session data if needed (token etc), but for now replace profile fields
                    const newUser = { ...user, ...updatedUser };
                    setUser(newUser);
                    localStorage.setItem('abbelight_session_v2', JSON.stringify(newUser));
                }
            }
        } catch (e) {
            console.error("Failed to refresh user", e);
        }
    };

    return (
        <UserContext.Provider value={{ user, login, logout, isLoading, refreshUser }}>
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
