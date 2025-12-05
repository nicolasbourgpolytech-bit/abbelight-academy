"use client";

import { UserProvider } from "@/context/UserContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <UserProvider>
            {children}
        </UserProvider>
    );
}
