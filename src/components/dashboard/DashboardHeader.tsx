"use client";

import { useUser } from "@/context/UserContext";
import { getRank, getNextRank } from "@/types/gamification";
export function DashboardHeader() {
    const { user } = useUser();

    if (!user) return null;

    const currentRank = getRank(user.xp);
    const nextRank = getNextRank(user.xp);

    // Calculate progress percentage
    const prevRankXp = currentRank.minXp;
    const nextRankXp = nextRank ? nextRank.minXp : currentRank.minXp * 2;
    const progress = Math.min(100, Math.max(0, ((user.xp - prevRankXp) / (nextRankXp - prevRankXp)) * 100));

    // Get initials
    const initials = user.firstName && user.lastName
        ? `${user.firstName[0]}${user.lastName[0]}`
        : user.name.substring(0, 2).toUpperCase();

    const displayName = user.firstName ? user.firstName : user.name;

    // Don't show on specific paths if needed, but user said "everywhere in dashboard"
    // The dashboard layout wraps everything under /dashboard, so this is fine.

    return (
        <header className="sticky top-16 md:top-0 z-30 w-full mb-6">
            <div className="mx-auto rounded-none md:rounded-2xl border-b md:border border-white/10 bg-black/50 backdrop-blur-xl transition-all duration-200">
                <div className="flex flex-col md:flex-row items-center justify-between p-4 gap-4">

                    {/* User Profile Section */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">
                            {initials}
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-sm font-medium text-gray-400">Welcome back,</h2>
                            <span className="text-lg font-bold text-white leading-none">{displayName}</span>
                        </div>
                    </div>

                    {/* XP & Level Status */}
                    <div className="flex items-center gap-4 w-full md:w-auto bg-white/5 rounded-xl p-3 border border-white/5">

                        {/* Rank Info */}
                        <div className="flex flex-col items-end min-w-[100px]">
                            <span className={`text-xs font-bold uppercase tracking-wider ${currentRank.color}`}>
                                {currentRank.name}
                            </span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm font-bold text-white">{user.xp}</span>
                                <span className="text-xs text-gray-500">XP</span>
                            </div>
                        </div>

                        {/* Progress Bar (Compact) */}
                        <div className="flex flex-col w-32 gap-1">
                            <div className="flex justify-between text-[10px] text-gray-500 uppercase font-bold">
                                <span>Lvl {user.level}</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <div
                                    className={`h-full ${currentRank.color.replace('text-', 'bg-')} transition-all duration-1000 ease-out`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            {/* Ambient glow under the header */}
            <div className="absolute -bottom-4 left-0 w-full h-4 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        </header>
    );
}
