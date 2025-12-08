"use client";

import { Module } from "@/types/lms";
import Link from "next/link";

interface ModuleCardProps {
    module: Module;
    progress?: number; // 0 to 100
    isLocked?: boolean;
    pathId?: string;
}

export function ModuleCard({ module, progress = 0, isLocked = false, pathId }: ModuleCardProps) {
    const linkHref = `/dashboard/academy/${module.id}${pathId ? `?pathId=${pathId}` : ''}`;

    return (
        <div className={`group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 flex flex-col h-full ${isLocked ? 'opacity-60 grayscale' : ''}`}>
            {/* Thumbnail */}
            <div className="h-40 relative bg-black">
                {/* Replace with Image component in real usage */}
                {module.thumbnailUrl ? (
                    <img src={module.thumbnailUrl} alt={module.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black flex items-center justify-center">
                        <span className="text-4xl">🎓</span>
                    </div>
                )}

                {isLocked && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="bg-black/80 px-3 py-1 rounded-full border border-white/20 flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">Locked</span>
                        </div>
                    </div>
                )}

                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-bold text-primary border border-primary/20">
                    +{module.xp} XP
                </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <span>{module.level}</span>
                    <span>•</span>
                    <span>{module.category}</span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {module.title}
                </h3>

                <p className="text-sm text-gray-400 mb-4 line-clamp-2 flex-1">
                    {module.description}
                </p>

                {/* Footer / Progress */}
                <div className="mt-auto pt-4 border-t border-white/5">
                    {!isLocked && progress > 0 ? (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-medium text-gray-400">
                                <span>Progress</span>
                                <span className="text-white">{progress}%</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <Link
                                href={linkHref}
                                className="block w-full text-center mt-3 py-2 bg-white/5 hover:bg-primary hover:text-black text-white text-xs font-bold uppercase tracking-wider rounded transition-colors"
                            >
                                Continue
                            </Link>
                        </div>
                    ) : (
                        <Link
                            href={isLocked ? '#' : linkHref}
                            className={`block w-full text-center py-2 text-xs font-bold uppercase tracking-wider rounded transition-colors ${isLocked
                                ? 'cursor-not-allowed text-gray-600 bg-white/5'
                                : 'bg-primary text-black hover:bg-white'
                                }`}
                        >
                            {isLocked ? 'Restricted Access' : 'Start Module'}
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
