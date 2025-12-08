"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { ModuleCard } from "@/components/dashboard/ModuleCard";
import { useLmsProgress } from "@/hooks/useLmsProgress";
import Link from "next/link";

// Helper Component to render card with hook data
const ConnectedModuleCard = ({ module, isLocked = false }: { module: any, isLocked?: boolean }) => {
    const { getModuleProgress } = useLmsProgress();
    const progress = getModuleProgress(module.id, module.chapters.length);
    return <ModuleCard module={module} progress={progress} isLocked={isLocked} />;
};

// History Section Component
const HistorySection = ({ modules }: { modules: any[] }) => {
    const { getModuleProgress } = useLmsProgress();

    // Filter completed modules inside component where hook is valid
    const completedModules = modules.filter(module => {
        return getModuleProgress(module.id, module.chapters?.length || 0) === 100;
    });

    return (
        <section>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Completed Modules</h2>
            </div>
            {completedModules.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {completedModules.map(module => (
                        <ConnectedModuleCard key={module.id} module={module} />
                    ))}
                </div>
            ) : (
                <div className="text-gray-500 text-sm p-4 bg-white/5 rounded-xl border border-white/10">
                    You haven't completed any modules yet. Start learning to build your history!
                </div>
            )}
        </section>
    );
};

export default function AcademyPage() {
    const { user } = useUser();
    const { progress: lmsProgress } = useLmsProgress();
    const [modules, setModules] = useState<any[]>([]);
    const [learningPaths, setLearningPaths] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            try {
                // Fetch Modules (filtered by access)
                const modulesRes = await fetch(`/api/modules?userId=${user.id}`);
                const modulesData = await modulesRes.json();

                if (modulesData.modules) {
                    const enrichedModules = modulesData.modules.map((m: any) => ({
                        ...m,
                        thumbnailUrl: m.thumbnail_url || m.thumbnailUrl,
                        chapters: m.chapters || [],
                        roles: []
                    }));
                    setModules(enrichedModules);
                }

                // Fetch Learning Paths
                const pathsRes = await fetch(`/api/learning-paths?userId=${user.id}`);
                const pathsData = await pathsRes.json();
                if (pathsData.paths) {
                    setLearningPaths(pathsData.paths);
                }

            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [user]);

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
            <div className="relative overflow-hidden rounded-3xl bg-[#0F1115] border border-white/5 p-8 lg:p-12">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[128px] rounded-full -translate-y-1/2 translate-x-1/2" />

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 p-[1px]">
                                <div className="w-full h-full rounded-2xl bg-black/90 backdrop-blur-xl flex items-center justify-center overflow-hidden">
                                    <span className="text-3xl font-bold text-white">{user?.name ? user.name.charAt(0) : 'U'}</span>
                                </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-green-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-[#0F1115]">
                                ONLINE
                            </div>
                        </div>

                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">
                                Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">{user?.name.split(' ')[0]}</span>
                            </h1>
                            <div className="flex items-center gap-3 text-sm text-gray-400">
                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                                    🔥 3 day streak
                                </span>
                                <span>Keep up the good work!</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full lg:w-auto">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                            <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Total XP</div>
                            <div className="text-2xl font-bold text-primary">{user?.xp || 0}</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                            <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Modules</div>
                            <div className="text-2xl font-bold text-white">{modules.length}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Learning Paths - Moved to Top */}
            {learningPaths.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            My Learning Paths
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {learningPaths.map(path => (
                            <div key={path.id} className="bg-[#0F1115] border border-white/5 rounded-2xl overflow-hidden hover:border-primary/50 transition-all group cursor-pointer relative flex flex-col">
                                <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors" />
                                <div className="p-6 flex flex-col h-full">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors">{path.title}</h3>
                                        <p className="text-sm text-gray-400 mb-4 line-clamp-2">{path.description}</p>
                                    </div>

                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                            {path.status === 'completed' ? 'Completed' : 'In Progress'}
                                        </span>
                                        <Link
                                            href={`/dashboard/academy/paths/${path.id}`}
                                            className="bg-white/5 hover:bg-white/10 hover:text-primary text-white text-xs px-4 py-2 rounded-lg transition-all font-semibold"
                                        >
                                            Continue Learning Path
                                        </Link>
                                    </div>
                                </div>
                                {path.status === 'completed' && (
                                    <div className="absolute top-4 right-4 text-green-500">
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Completed Modules History (Unified) */}
            <HistorySection modules={modules} />
        </div>
    );
}
