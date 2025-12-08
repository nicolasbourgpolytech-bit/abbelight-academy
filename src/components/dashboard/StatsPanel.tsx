"use client";

import { useState } from "react";
import { ContentItem } from "@/types/content";
import { StatsHistograms } from "./StatsHistograms";

interface StatsPanelProps {
    articles: ContentItem[];
}

export function StatsPanel({ articles }: StatsPanelProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (!articles || articles.length === 0) return null;

    return (
        <div className="w-full mb-6 animate-fade-in">
            <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden transition-all duration-300">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <span className="font-semibold text-white">Articles statistics</span>
                    </div>
                    {isOpen ? (
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    )}
                </button>

                <div
                    className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                        }`}
                >
                    <div className="overflow-hidden">
                        <div className="p-6 pt-0 flex justify-center border-t border-white/5 mx-6 mt-2">
                            <div className="pt-6">
                                <StatsHistograms articles={articles} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
