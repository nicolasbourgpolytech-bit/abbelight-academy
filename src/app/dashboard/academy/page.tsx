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
                    <h2 className="text-xl font-bold text-white">Completed Modules History</h2>
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
                            <div className="text-2xl font-bold text-primary">{user?.xp || 0}</div>
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

                {/* History / Completed Modules */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white">Completed Modules</h2>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4">
                        {modules.filter(m => {
                            const { getModuleProgress } = useLmsProgress();
                            // Hooks inside callback is bad practice! 
                            // Need to refactor: we can't use hook inside map callback.
                            // Use a separate filtered list derived from state.
                            return false;
                        }).length === 0 && <div className="text-gray-500 text-sm">No completed modules yet.</div>}
                    </div>
                </section>

                <HistorySection modules={modules} />

                {/* Learning Paths */}
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
                                <div key={path.id} className="bg-black/40 border border-white/10 rounded-xl overflow-hidden hover:border-primary/50 transition-all group cursor-pointer relative">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                                    <div className="p-6">
                                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors">{path.title}</h3>
                                        <p className="text-sm text-gray-400 mb-4 line-clamp-2">{path.description}</p>

                                        <div className="flex items-center justify-between mt-4">
                                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                                {path.status === 'completed' ? 'Completed' : 'In Progress'}
                                            </span>
                                            <Link
                                                href={`/dashboard/academy/paths/${path.id}`}
                                                className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                Continue
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

                {/* In Progress Modules (Fallback if no paths or additional) */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white">Continue Module</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
