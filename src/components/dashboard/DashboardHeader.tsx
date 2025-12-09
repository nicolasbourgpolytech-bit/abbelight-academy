"use client";

import { useUser } from "@/context/UserContext";
import { getRank, getNextRank } from "@/types/gamification";
import { useEffect, useState, useRef } from "react";

export function DashboardHeader() {
    const { user } = useUser();
    const [displayedXp, setDisplayedXp] = useState(0);
    const [xpGain, setXpGain] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const prevXpRef = useRef(0);

    // Initialize displayed XP on load
    useEffect(() => {
        if (user) {
            if (prevXpRef.current === 0) {
                // First load, just set it
                setDisplayedXp(user.xp);
                prevXpRef.current = user.xp;
            } else if (user.xp > prevXpRef.current) {
                // XP Gained
                const gain = user.xp - prevXpRef.current;
                setXpGain(gain);
                setIsAnimating(true);

                // Animate the counter
                const start = prevXpRef.current;
                const end = user.xp;
                const duration = 1500;
                const startTime = performance.now();

                const animate = (currentTime: number) => {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);

                    // Ease out quart
                    const ease = 1 - Math.pow(1 - progress, 4);

                    setDisplayedXp(Math.floor(start + (end - start) * ease));

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        setIsAnimating(false);
                    }
                };

                requestAnimationFrame(animate);
                prevXpRef.current = user.xp;

                // Reset XP gain popup after animation
                setTimeout(() => setXpGain(0), 2500);
            }
        }
    }, [user]);

    if (!user) return null;

    const currentRank = getRank(displayedXp);
    const nextRank = getNextRank(displayedXp);

    // Calculate progress percentage
    const prevRankXp = currentRank.minXp;
    const nextRankXp = nextRank ? nextRank.minXp : currentRank.minXp * 2;
    const progress = Math.min(100, Math.max(0, ((displayedXp - prevRankXp) / (nextRankXp - prevRankXp)) * 100));

    // Get initials
    const initials = user.firstName && user.lastName
        ? `${user.firstName[0]}${user.lastName[0]}`
        : user.name.substring(0, 2).toUpperCase();

    const displayName = user.firstName ? user.firstName : user.name;

    return (
        <header className="sticky top-16 md:top-0 z-30 w-full border-b border-white/10 bg-black/80 backdrop-blur-xl transition-all duration-200 shadow-2xl shadow-black/50">
            {/* Ambient glow */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

            <div className="w-full flex flex-col md:flex-row items-center justify-between px-6 py-3 gap-4 relative">

                {/* User Profile Section */}
                <div className="flex items-center gap-4 w-full md:w-auto relative group">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary p-[2px]">
                            <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-white font-bold  relative overflow-hidden">
                                <span className="z-10">{initials}</span>
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 group-hover:opacity-100 opacity-0 transition-opacity duration-300" />
                            </div>
                        </div>
                        {/* Status Indicator */}
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black" />
                    </div>

                    <div className="flex flex-col">
                        <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Welcome back</h2>
                        <span className="text-lg font-bold text-white leading-none tracking-tight group-hover:text-primary transition-colors duration-300">{displayName}</span>
                    </div>
                </div>

                {/* XP & Level Status */}
                <div className="flex items-center gap-6 w-full md:w-auto">

                    {/* Stats Container */}
                    <div className="flex-1 md:flex-initial flex items-center justify-end gap-6 relative">

                        {/* XP Gain Floating Text */}
                        {xpGain > 0 && (
                            <div className="absolute -top-8 right-20 text-yellow-400 font-bold text-xl animate-bounce drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pointer-events-none z-50">
                                +{xpGain} XP
                            </div>
                        )}

                        <div className="text-right hidden sm:block">
                            <div className={`text-xs font-bold uppercase tracking-widest ${currentRank.color} mb-0.5`}>
                                {currentRank.name}
                            </div>
                            <div className="flex items-baseline justify-end gap-1">
                                <span className={`text-xl font-black tabular-nums tracking-tight ${isAnimating ? 'text-yellow-400 scale-110' : 'text-white'} transition-all duration-300`}>
                                    {displayedXp.toLocaleString()}
                                </span>
                                <span className="text-xs text-gray-400 font-medium">XP</span>
                            </div>
                        </div>

                        {/* Visual Progress Bar Component */}
                        <div className="flex flex-col w-full md:w-64 gap-1.5 group">
                            <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider">
                                <span className="text-gray-400 group-hover:text-white transition-colors">Lvl {user.level}</span>
                                <span className="text-gray-500 group-hover:text-primary transition-colors">{Math.round(progress)}%</span>
                            </div>

                            {/* The Bar */}
                            <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 relative p-[1px]">
                                {/* Background Trace */}
                                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent" />

                                {/* Active Progress */}
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-primary via-blue-500 to-secondary relative flex items-center justify-end transition-all duration-700 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                    style={{ width: `${progress}%` }}
                                >
                                    {/* Shimmer Effect */}
                                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 translate-x-[-100%] animate-[shimmer_2s_infinite]" />

                                    {/* Leading Edge Glow */}
                                    <div className="h-full w-1 bg-white/50 shadow-[0_0_10px_white] blur-[1px]" />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Bottom active line gradient */}
            <div className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent w-full opacity-50" />
        </header>
    );
}

// Add this to your global globals.css or keep it here if using Tailwind 3+ arbitrary values mostly.
// But for the shimmer animation, ensuring it works:
// In tailwind.config.ts extended theme:
// keyframes: { shimmer: { '100%': { transform: 'translateX(100%)' } } }
