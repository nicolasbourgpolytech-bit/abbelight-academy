"use client";

import { useUser } from "@/context/UserContext";
import { AppTool } from "@/types/apps";
import { AppCard } from "@/components/dashboard/AppCard";

const MOCK_APPS: AppTool[] = [
    {
        id: "1",
        name: "Abbelight Data Viewer",
        description: "Visualize and analyze your SMLM data with our lightweight viewer. Compatible with all file formats.",
        version: "2.4.0",
        icon: "📊",
        rolesRequired: ["general"], // Accessible to everyone
        downloadUrl: "#",
        size: "145 MB",
        releaseDate: "2024-11-15"
    },
    {
        id: "2",
        name: "Dilution Calculator",
        description: "Perfect your sample preparation with our precise reagent dilution calculator.",
        version: "1.0.2",
        icon: "🧪",
        rolesRequired: ["reagent"],
        downloadUrl: "#",
        size: "12 MB",
        releaseDate: "2025-01-10"
    },
    {
        id: "3",
        name: "SAFe Driver Utility",
        description: "Essential drivers and diagnostic tools for the SAFe 360 instrument.",
        version: "3.1.5",
        icon: "🔌",
        rolesRequired: ["safe"],
        downloadUrl: "#",
        size: "450 MB",
        releaseDate: "2025-02-01"
    },
    {
        id: "4",
        name: "Spectral Unmixing Plugin",
        description: "ImageJ plugin for spectral unmixing of multi-color data.",
        version: "1.2.0",
        icon: "🌈",
        rolesRequired: ["general", "reagent"],
        downloadUrl: "#",
        size: "5 MB",
        releaseDate: "2024-12-05"
    },
    {
        id: "5",
        name: "Remote Diagnostics",
        description: "Allow Abbelight support to remotely access instrument telemetry.",
        version: "1.0.0",
        icon: "📡",
        rolesRequired: ["safe"],
        downloadUrl: "#",
        size: "25 MB",
        releaseDate: "2025-01-20"
    }
];

export default function AppsPage() {
    const { user } = useUser();

    if (!user) return null;

    // Filter apps: allow if user has at least one of the required roles (or if 'general' is a required role)
    // Logic: if app requires 'general', show it. 
    // If app requires 'reagent', show if user has 'reagent'.
    // If app requires 'safe', show if user has 'safe'.

    const visibleApps = MOCK_APPS.filter(app => {
        // If the app is for general users, everyone sees it
        if (app.rolesRequired.includes("general")) return true;

        // Otherwise check if user has ANY of the required roles
        return app.rolesRequired.some(role => user.roles.includes(role));
    });

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="border-b border-white/10 pb-6">
                <h1 className="text-3xl font-bold text-white mb-2">Apps & Tools</h1>
                <p className="text-gray-400">Download the latest software and utilities optimized for your workflow.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleApps.map(app => (
                    <AppCard key={app.id} app={app} />
                ))}
            </div>

            {visibleApps.length === 0 && (
                <div className="text-center py-20 text-gray-500">
                    No apps available for your current role.
                </div>
            )}
        </div>
    );
}
