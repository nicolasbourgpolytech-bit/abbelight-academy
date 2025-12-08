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
                            <div className="absolute -bottom-2 -right-2 bg-secondary text-black text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-[#0F1115]">
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

            {/* Learning Paths - Timeline View */}
            {learningPaths.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            My Learning Journey
                        </h2>
                        <button
                            onClick={async () => {
                                if (confirm('Are you sure you want to reset your entire learning journey? All progress will be lost.')) {
                                    await fetch('/api/users/reset-xp', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userId: user?.id, email: user?.email })
                                    });
                                    window.location.reload();
                                }
                            }}
                            className="bg-warning/10 hover:bg-warning/20 text-warning text-xs px-3 py-1.5 rounded-lg border border-warning/20 transition-all font-bold uppercase tracking-wider"
                        >
                            Reset Journey
                        </button>
                    </div>

                    <div className="relative">
                        {/* Vertical Timeline Line */}
                        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-primary via-primary/20 to-transparent lg:left-8" />

                        <div className={`space-y-8 pr-2 ${learningPaths.length > 3 ? 'lg:max-h-[500px] lg:overflow-y-auto overflow-x-hidden custom-scrollbar' : ''}`}>
                            {learningPaths.map((path, index) => {
                                const isCompleted = path.status === 'completed';
                                const isCurrent = !isCompleted && (index === 0 || learningPaths[index - 1]?.status === 'completed');
                                const isLocked = !isCompleted && !isCurrent;

                                return (
                                    <div key={path.id} className={`relative flex gap-6 lg:gap-8 ${isLocked ? 'opacity-50 grayscale' : ''}`}>

                                        {/* Timeline Node */}
                                        <div className="relative z-10 flex-shrink-0">
                                            <div className={`w-12 h-12 lg:w-16 lg:h-16 rounded-full border-4 flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all duration-500
                                                ${isCompleted
                                                    ? 'bg-secondary border-secondary text-black'
                                                    : isCurrent
                                                        ? 'bg-black border-primary text-primary shadow-[0_0_30px_rgba(59,130,246,0.3)]'
                                                        : 'bg-black border-white/10 text-gray-500'
                                                }`}>
                                                {isCompleted ? (
                                                    <svg className="w-6 h-6 lg:w-8 lg:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                ) : (
                                                    <span className="text-lg lg:text-2xl font-bold">{index + 1}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Card Content */}
                                        <div className={`flex-1 overflow-hidden transition-all duration-300 ${isCurrent ? 'transform scale-[1.01]' : ''}`}>
                                            <div className={`
                                                relative bg-[#0F1115] border rounded-2xl overflow-hidden p-6 lg:p-8
                                                ${isCurrent ? 'border-primary border-2 shadow-[0_4px_30px_rgba(59,130,246,0.1)]' : 'border-white/5'}
                                                ${isLocked ? 'bg-black/40' : 'group hover:border-white/20'}
                                            `}>
                                                {/* Active Glow Effect */}
                                                {isCurrent && (
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary shadow-[0_0_20px_rgb(59,130,246)]" />
                                                )}

                                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <h3 className={`text-xl font-bold ${isCurrent ? 'text-white' : 'text-gray-200'}`}>{path.title}</h3>
                                                            {isCurrent && <span className="text-xs font-bold text-black bg-primary px-2 py-0.5 rounded animate-pulse">CURRENT STEP</span>}
                                                            {isCompleted && <span className="text-xs font-bold text-black bg-secondary px-2 py-0.5 rounded">COMPLETED</span>}
                                                        </div>
                                                        <p className="text-gray-400 max-w-2xl">{path.description}</p>
                                                    </div>

                                                    <div className="flex-shrink-0">
                                                        {isLocked ? (
                                                            <button disabled className="bg-white/5 text-gray-500 px-6 py-3 rounded-xl font-bold text-sm cursor-not-allowed border border-white/5">
                                                                Locked
                                                            </button>
                                                        ) : (
                                                            <Link
                                                                href={`/dashboard/academy/paths/${path.id}`}
                                                                className={`
                                                                    inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
                                                                    ${isCompleted
                                                                        ? 'bg-white/10 text-white hover:bg-white/20'
                                                                        : 'bg-primary text-black hover:bg-primary-light hover:scale-105 shadow-lg shadow-primary/20'
                                                                    }
                                                                `}
                                                            >
                                                                {isCompleted ? 'Review Path' : 'Start Path'}
                                                                <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* Completed Modules History (Unified) */}
            <HistorySection modules={modules} />
        </div>
    );
}
