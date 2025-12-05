"use client";

import { useUser } from "@/context/UserContext";
import { GamificationHub } from "@/components/dashboard/GamificationHub";

export default function DashboardPage() {
    const { user, isLoading } = useUser();

    if (isLoading) {
        return <div className="text-center text-gray-500 p-10 animate-pulse">Loading profile...</div>;
    }

    if (!user) {
        return <div className="text-center text-white p-10">Please login first.</div>
    }

    const hasRole = (role: string) => user.roles.includes(role as any);

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

            {/* Gamification Hub */}
            <GamificationHub />

            {/* REAGENT SPECIFIC CONTENT */}
            {hasRole('reagent') && (
                <section className="animate-fade-in">
                    <h2 className="text-xl font-bold text-secondary mb-4 flex items-center gap-2 uppercase tracking-widest">
                        <span className="w-2 h-2 bg-secondary rounded-full"></span>
                        Reagent Customer Exclusive
                    </h2>
                    <div className="glass-card p-6 border-secondary/20 bg-secondary/5">
                        <h3 className="text-2xl font-bold text-white mb-2">Optimization of buffer sequences</h3>
                        <p className="text-gray-400 mb-4">
                            Access the advanced protocol for stabilizing fluorophores in long-acquisitions.
                            Exclusive to reagent customers.
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
                        SAFe Instrument Tools
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass-card p-6 border-primary/20 bg-primary/5">
                            <h3 className="text-xl font-bold text-white mb-2">Calibration Wizard</h3>
                            <p className="text-gray-400 mb-4">Run the monthly calibration check for your SAFe 360.</p>
                            <button className="px-6 py-2 bg-primary text-black font-bold uppercase text-sm hover:bg-white transition-colors">
                                Launch Wizard
                            </button>
                        </div>
                        <div className="glass-card p-6 border-primary/20 bg-primary/5">
                            <h3 className="text-xl font-bold text-white mb-2">Instrument Status</h3>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                                <span className="text-white font-medium">Online - Ready</span>
                            </div>
                            <p className="text-gray-400 text-sm">Last check: 2 mins ago</p>
                        </div>
                    </div>
                </section>
            )}

            {/* GENERAL CONTENT (Always Visible) */}
            <section>
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 bg-white rounded-full"></span>
                    Latest Updates
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="glass-card p-6 min-h-[200px] flex flex-col justify-between hover:border-white/30 cursor-pointer group">
                            <div>
                                <div className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest border border-white/10 inline-block px-2 py-1 rounded">
                                    {i === 1 ? "Article" : i === 2 ? "Webinar" : "Case Study"}
                                </div>
                                <h4 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors">
                                    {i === 1 ? "Fundamentals of SMLM" : i === 2 ? "Sample Prep Guide" : "Introduction to NEO"}
                                </h4>
                                <p className="text-sm text-gray-400 line-clamp-2">
                                    Accessible to all users. Learn the basics before diving deep.
                                </p>
                            </div>
                            <div className="mt-4 flex items-center text-xs text-gray-500 font-medium">
                                <span>Nov {10 + i}, 2025</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
