"use client";

import { AppTool } from "@/types/apps";

export function AppCard({ app }: { app: AppTool }) {
    return (
        <div className="glass-card p-6 flex flex-col h-full hover:border-primary/50 transition-colors group">
            <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center text-4xl border border-white/10 group-hover:scale-110 transition-transform">
                    {app.icon}
                </div>
                <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-1 rounded">
                    v{app.version}
                </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">{app.name}</h3>
            <p className="text-sm text-gray-400 mb-6 flex-1">
                {app.description}
            </p>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                <span className="text-xs text-gray-500">{app.size}</span>
                <button className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-primary hover:text-white transition-colors">
                    Download
                </button>
            </div>
        </div>
    );
}
