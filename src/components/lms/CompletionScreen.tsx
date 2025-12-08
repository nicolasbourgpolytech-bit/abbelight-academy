"use client";

import { Module } from "@/types/lms";
import Link from "next/link";
// Confetti removed
// If we really wanted confetti we'd install a package. Let's do a CSS sparkle effect instead to keep deps low.

interface CompletionScreenProps {
    module: Module;
    nextModuleId?: string | number;
    pathId?: string;
}

export function CompletionScreen({ module, nextModuleId, pathId }: CompletionScreenProps) {
    const nextModuleHref = nextModuleId && pathId
        ? `/dashboard/academy/${nextModuleId}?pathId=${pathId}`
        : null;
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 animate-fade-in text-center relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
            </div>

            <div className="relative z-10 max-w-2xl">
                <div className="inline-block p-4 rounded-full bg-gradient-to-br from-primary to-yellow-300 mb-6 shadow-[0_0_40px_rgba(0,202,248,0.5)] animate-bounce-slow">
                    <svg className="w-16 h-16 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>

                <h1 className="text-5xl font-black text-white mb-4 tracking-tight">Module Complete!</h1>
                <p className="text-xl text-gray-300 mb-8">You have successfully mastered <span className="text-primary font-bold">{module.title}</span>.</p>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-10 w-full backdrop-blur-md">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="border-r border-white/10">
                            <div className="text-4xl font-bold text-primary mb-1">+{module.xp}</div>
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">XP Earned</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-white mb-1">100%</div>
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Score</div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 w-full">
                    {nextModuleHref && (
                        <Link href={nextModuleHref} className="block w-full py-4 bg-primary text-black rounded-xl font-bold uppercase tracking-wider hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,202,248,0.3)] animate-pulse-slow">
                            Continue to Next Module &rarr;
                        </Link>
                    )}

                    <button className="w-full py-4 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/50 text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-all group">
                        <svg className="w-6 h-6 text-gray-400 group-hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download All Resources (.zip)
                    </button>

                    <Link href="/dashboard/academy" className="block w-full py-4 bg-primary text-black rounded-xl font-bold uppercase tracking-wider hover:bg-white transition-colors shadow-lg">
                        Back to Academy
                    </Link>
                </div>
            </div>
        </div>
    );
}
