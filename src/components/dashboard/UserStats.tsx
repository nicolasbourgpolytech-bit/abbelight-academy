"use client";

import { useUser } from "@/context/UserContext";
import { useEffect, useState } from "react";

export function UserStats() {
    const { user } = useUser();
    const [stats, setStats] = useState({
        completedModules: 0,
        totalTime: 0,
        rank: "N/A"
    });

    useEffect(() => {
        if (!user?.email) return;

        // Fetch detailed stats
        fetch(`/api/progress?email=${encodeURIComponent(user.email)}`)
            .then(res => res.json())
            .then(data => {
                if (data.completedModuleIds) {
                    setStats(prev => ({
                        ...prev,
                        completedModules: data.completedModuleIds.length
                    }));
                }
            })
            .catch(err => console.error("Failed to load stats", err));

        // Use user object for other stats if available
        if (user) {
            setStats(prev => ({
                ...prev,
                // If we store total_time_spent in user object
                totalTime: (user as any).total_time_spent || 0,
            }));
        }

    }, [user]);

    if (!user) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center text-2xl mb-2">
                    🎓
                </div>
                <div className="text-3xl font-bold text-white mb-1">{stats.completedModules}</div>
                <div className="text-xs text-gray-400 uppercase tracking-widest">Modules Completed</div>
            </div>

            <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-2xl mb-2">
                    ⏱️
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                    {Math.floor(stats.totalTime / 60)}h <span className="text-lg text-gray-400">{stats.totalTime % 60}m</span>
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-widest">Time Learned</div>
            </div>

            <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl mb-2">
                    🏆
                </div>
                <div className="text-3xl font-bold text-white mb-1">#{user.level}</div>
                <div className="text-xs text-gray-400 uppercase tracking-widest">Global Rank</div>
            </div>
        </div>
    );
}
