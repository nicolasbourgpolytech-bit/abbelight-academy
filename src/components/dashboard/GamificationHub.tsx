"use client";

import { useUser } from "@/context/UserContext";
import { getRank, getNextRank, RANKS } from "@/types/gamification";

export function GamificationHub() {
    const { user } = useUser();

    if (!user) return null;

    const currentRank = getRank(user.xp);
    const nextRank = getNextRank(user.xp);

    // Calculate progress percentage
    const prevRankXp = currentRank.minXp;
    const nextRankXp = nextRank ? nextRank.minXp : currentRank.minXp * 2; // approximation for max level
    const progress = Math.min(100, Math.max(0, ((user.xp - prevRankXp) / (nextRankXp - prevRankXp)) * 100));

    return (
        <div className="glass-card p-6 mb-8 border-white/10 relative overflow-hidden">
            {/* Background Glow */}
            <div className={`absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-br from-${currentRank.color.replace('text-', '')}/20 to-transparent blur-3xl opacity-20 pointer-events-none`} />

            <div className="flex flex-col md:flex-row gap-8 items-center">

                {/* Rank Circle */}
                <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-white/10 flex items-center justify-center bg-black/50 backdrop-blur-md">
                        <span className={`text-3xl font-bold ${currentRank.color}`}>
                            {currentRank.name[0]}
                        </span>
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-white/10 backdrop-blur border border-white/20 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                        Lvl {user.level}
                    </div>
                </div>

                {/* Progress Info */}
                <div className="flex-1 w-full">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Current Rank</div>
                            <h3 className={`text-2xl font-bold ${currentRank.color}`}>{currentRank.name}</h3>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total XP</div>
                            <span className="text-xl font-bold text-white">{user.xp}</span>
                            {nextRank && <span className="text-sm text-gray-500"> / {nextRank.minXp}</span>}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-4 bg-white/5 rounded-full overflow-hidden relative">
                        <div
                            className={`h-full ${currentRank.color.replace('text-', 'bg-')} transition-all duration-1000 ease-out relative`}
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 text-right">
                        {nextRank ? `${nextRank.minXp - user.xp} XP to ${nextRank.name}` : "Max Rank Achieved"}
                    </div>
                </div>

                {/* Badges Mini Grid */}
                <div className="w-full md:w-auto flex gap-2">
                    {user.badges.slice(0, 3).map((badge) => (
                        <div key={badge.id} className="w-12 h-12 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center text-xl hover:bg-white/10 hover:scale-110 transition-all cursor-help title-tip" title={badge.name}>
                            {badge.icon}
                        </div>
                    ))}
                    <div className="w-12 h-12 bg-transparent rounded-lg border border-dashed border-white/10 flex items-center justify-center text-gray-600 text-xs uppercase font-bold">
                        +2
                    </div>
                </div>
            </div>
        </div>
    );
}
