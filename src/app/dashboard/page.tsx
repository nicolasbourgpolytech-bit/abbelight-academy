"use client";

import { useUser } from "@/context/UserContext";
import { UserRole } from "@/types/user";

import { UserStats } from "@/components/dashboard/UserStats";
import { ContinueLearning } from "@/components/dashboard/ContinueLearning";
import { UpcomingWebinars } from "@/components/dashboard/UpcomingWebinars";
import { LatestArticles } from "@/components/dashboard/LatestArticles";

export default function DashboardPage() {
    const { user, isLoading } = useUser();

    if (isLoading) {
        return <div className="text-center text-gray-500 p-10 animate-pulse">Loading profile...</div>;
    }

    if (!user) {
        return <div className="text-center text-white p-10">Please login first.</div>
    }

    const hasRole = (role: string) => user.roles.includes(role as UserRole);

    return (
        <div className="space-y-10 max-w-6xl mx-auto">

            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row justify-between items-end pb-2 gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2">Hello, {user.name}</h1>
                    <p className="text-gray-400">
                        Role: <span className="text-primary uppercase font-bold tracking-wider">{user.roles.join(" & ")}</span>
                    </p>
                </div>
            </div>

            {/* Quick Stats */}
            <UserStats />

            {/* Continue Learning (Priority 1) */}
            <ContinueLearning />

            {/* Gamification Hub - REMOVED as per user request (redundant with header) */}


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* REAGENT SPECIFIC CONTENT */}
                {hasRole('reagent') && (
                    <section className="animate-fade-in">
                        <h2 className="text-xl font-bold text-secondary mb-4 flex items-center gap-2 uppercase tracking-widest">
                            <span className="w-2 h-2 bg-secondary rounded-full"></span>
                            Reagent Tools
                        </h2>
                        <div className="glass-card p-6 border-secondary/20 bg-secondary/5 h-full">
                            <h3 className="text-2xl font-bold text-white mb-2">Buffer Optimization</h3>
                            <p className="text-gray-400 mb-4">
                                Access the advanced protocol for stabilizing fluorophores in long-acquisitions.
                            </p>
                            <button className="px-6 py-2 bg-secondary text-black font-bold uppercase text-sm hover:bg-white transition-colors">
                                View Protocol
                            </button>
                        </div>
                    </section>
                )}

                {/* SAFe SPECIFIC CONTENT */}
                {hasRole('safe') && (
                    <section className="animate-fade-in">
                        <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2 uppercase tracking-widest">
                            <span className="w-2 h-2 bg-primary rounded-full"></span>
                            SAFe Dashboard
                        </h2>
                        <div className="glass-card p-6 border-primary/20 bg-primary/5 h-full">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1">Instrument Status</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                                        <span className="text-white font-medium">Online - Ready</span>
                                    </div>
                                </div>
                                <button className="px-4 py-1 bg-primary text-black font-bold uppercase text-xs hover:bg-white transition-colors">
                                    Calibrate
                                </button>
                            </div>
                            <p className="text-gray-400 text-sm">Last check: 2 mins ago</p>
                        </div>
                    </section>
                )}
            </div>

            {/* Upcoming Webinars */}
            <UpcomingWebinars />

            {/* Latest Articles */}
            <LatestArticles />

        </div>
    );
}
