"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ModuleCard } from "@/components/dashboard/ModuleCard";
import { useLmsProgress } from "@/hooks/useLmsProgress";

export default function LearningPathDetailsPage() {
    const params = useParams();
    const id = params.id as string;
    const { user } = useUser();
    const { getModuleProgress } = useLmsProgress();

    const [path, setPath] = useState<any>(null);
    const [modules, setModules] = useState<any[]>([]);
    const [prerequisites, setPrerequisites] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            try {
                const res = await fetch(`/api/learning-paths/${id}`);
                if (!res.ok) throw new Error('Failed to load path');
                const data = await res.json();

                setPath(data.path);
                setPrerequisites(data.prerequisites || []);

                if (data.modules) {
                    const enrichedModules = data.modules.map((m: any) => ({
                        ...m,
                        thumbnailUrl: m.thumbnail_url || m.thumbnailUrl,
                        chapters: m.chapters || [],
                        roles: []
                    }));
                    setModules(enrichedModules);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [id, user]);

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    );

    if (!path) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Path not found</h2>
            <Link href="/dashboard/academy" className="text-primary hover:underline">Return to Academy</Link>
        </div>
    );

    return (
        <div className="space-y-12 animate-fade-in max-w-7xl mx-auto pb-20">
            {/* Navigation & Header Section */}
            <div className="space-y-6">
                <Link href="/dashboard/academy" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
                    <div className="p-1 rounded-full bg-white/5 group-hover:bg-primary/20 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </div>
                    Back to Academy
                </Link>

                {/* Hero / Header Card */}
                <div className="relative overflow-hidden rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 p-8 md:p-12">
                    {/* Decorative Background Blob */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

                    <div className="relative z-10 space-y-6">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-300 uppercase tracking-widest">
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                Learning Path
                            </div>

                            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                                {path.title}
                            </h1>

                            <p className="text-lg text-gray-400 max-w-3xl leading-relaxed">
                                {path.description}
                            </p>
                        </div>

                        {/* Modern Prerequisites Section */}
                        {prerequisites.length > 0 && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4 border-t border-white/5">
                                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Prerequisites:</span>
                                <div className="flex flex-wrap gap-2">
                                    {prerequisites.map(p => (
                                        <div key={p.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            {p.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Path Flow Section */}
            <div>
                <div className="flex items-center gap-4 mb-8">
                    <h2 className="text-2xl font-bold text-white">Your Journey</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                    <span className="text-sm text-gray-500 font-medium">{modules.length} Modules</span>
                </div>

                <div className="flex flex-col gap-0 relative">
                    {/* Connecting Line (Background) */}
                    <div className="absolute left-8 md:left-[2.25rem] top-8 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-white/10 to-transparent hidden md:block" />

                    {modules.map((module, index) => {
                        const progress = getModuleProgress(module.id, module.chapters?.length || 0);
                        const isCompleted = progress === 100;

                        let isLocked = false;
                        if (path.status !== 'completed') {
                            if (index > 0) {
                                const prevModule = modules[index - 1];
                                const prevProgress = getModuleProgress(prevModule.id, prevModule.chapters?.length || 0);
                                if (prevProgress < 100) isLocked = true;
                            }
                        }

                        const isLast = index === modules.length - 1;

                        return (
                            <div key={module.id} className="relative md:pl-24 pb-12 last:pb-0 group">
                                {/* Connector Node (Desktop) */}
                                <div className={`absolute left-0 top-8 w-[4.5rem] flex justify-center hidden md:flex z-10`}>
                                    <div className={`
                                        w-12 h-12 rounded-full border-4 flex items-center justify-center text-lg font-bold shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all duration-500
                                        ${isCompleted
                                            ? 'bg-primary border-primary text-black scale-110'
                                            : isLocked
                                                ? 'bg-black border-white/10 text-gray-600'
                                                : 'bg-black border-primary text-primary'
                                        }
                                   `}>
                                        {isCompleted ? (
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            index + 1
                                        )}
                                    </div>
                                </div>

                                {/* Flow Arrow for Mobile (Between cards) */}
                                {index > 0 && (
                                    <div className="md:hidden flex justify-center py-4">
                                        <svg className="w-6 h-6 text-white/20 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        </svg>
                                    </div>
                                )}

                                {/* Card Container */}
                                <div className={`
                                    relative transition-all duration-500
                                    ${isLocked ? 'grayscale opacity-70' : 'opacity-100'}
                                    ${!isLocked && !isCompleted ? 'translate-x-2' : ''}
                                `}>
                                    <ModuleCard
                                        module={module}
                                        progress={progress}
                                        isLocked={isLocked}
                                        pathId={id}
                                    />

                                    {/* Desktop Arrow to next module */}
                                    {!isLast && (
                                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 md:hidden">
                                            {/* Spacer for flow */}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
