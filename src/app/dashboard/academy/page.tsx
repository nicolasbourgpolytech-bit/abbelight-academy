"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { ModuleCard } from "@/components/dashboard/ModuleCard";
import { useLmsProgress } from "@/hooks/useLmsProgress";

// Helper Component to render card with hook data
const ConnectedModuleCard = ({ module, isLocked = false }: { module: any, isLocked?: boolean }) => {
    const { getModuleProgress } = useLmsProgress();
    const progress = getModuleProgress(module.id, module.chapters.length);
    return <ModuleCard module={module} progress={progress} isLocked={isLocked} />;
};

export default function AcademyPage() {
    const { user } = useUser();
    const [modules, setModules] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/modules')
            .then(res => res.json())
            .then(data => {
                if (data.modules) {
                    // Enrich modules with mock chapters if empty (for UI compatibility)
                    const enrichedModules = data.modules.map((m: any) => ({
                        ...m,
                        thumbnailUrl: m.thumbnail_url || m.thumbnailUrl, // Map snake_case from DB
                        chapters: m.chapters || [], // Ensure chapters array exists
                        roles: [] // Default roles
                    }));
                    setModules(enrichedModules);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }, []);

    // Helper to check provisioned access
    const hasAccess = (module: any) => {
        if (!module.roles || module.roles.length === 0) return true;
        return module.roles.some((r: any) => user?.roles.includes(r));
    };

    if (isLoading) {
        return <div className="p-12 text-center text-gray-500 animate-pulse">Loading Academy...</div>;
    }

    return (
        <div className="space-y-12 animate-fade-in">
            {/* Header Stats */}
            <div className="bg-gradient-to-r from-primary/20 to-purple-900/20 border border-white/10 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-purple-600 p-[2px]">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden relative">
                            <span className="text-2xl font-bold text-white">{user?.name ? user.name.charAt(0) : 'U'}</span>
                        </div>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">Welcome back, {user?.name.split(' ')[0]}</h1>
                        <p className="text-gray-400">You are on a <span className="text-primary font-bold">3 day streak</span>! Keep it up.</p>
                    </div>
                </div>

                <div className="flex items-center gap-8 bg-black/40 p-4 rounded-xl border border-white/5">
                    <div className="text-center px-4 border-r border-white/10">
                        <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Total XP</div>
                        <div className="text-2xl font-bold text-primary">1,250</div>
                    </div>
                    <div className="text-center px-4 border-r border-white/10">
                        <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Modules</div>
                        <div className="text-2xl font-bold text-white">{modules.length} <span className="text-gray-600 text-sm">/ {modules.length}</span></div>
                    </div>
                    <div className="text-center px-4">
                        <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Certificates</div>
                        <div className="text-2xl font-bold text-white">0</div>
                    </div>
                </div>
            </div>

            {/* In Progress / Learning Path */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Continue Learning
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Render specific modules that are "in progress" - Using first module as fallback for now */}
                    {modules.length > 0 && <ConnectedModuleCard module={modules[0]} />}
                </div>
            </section>

            {/* Full Catalog */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Course Catalog</h2>
                    <div className="flex gap-2">
                        {['All', 'Theory', 'Hardware', 'Software'].map(filter => (
                            <button key={filter} className="px-3 py-1 rounded-full text-xs font-bold border border-white/10 hover:bg-white/10 text-gray-400 transition-colors">
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {modules.map(module => {
                        const isLocked = !hasAccess(module);
                        return (
                            <ConnectedModuleCard key={module.id} module={module} isLocked={isLocked} />
                        );
                    })}
                    {modules.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            No modules yet. Check back soon!
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
