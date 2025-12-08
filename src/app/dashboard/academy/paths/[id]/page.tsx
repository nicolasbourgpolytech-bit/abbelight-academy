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

                // Enhance modules with progress and locking status
                // Logic: A module in a sequence might be locked if previous is not done?
                // For now, let's just list them. The "Strict Order" logic might be needed later.
                // The user said "Il y aura des chemins à suivre avant de suivre des autres chemins" -> Path prerequisites (Handled in DB/API info).
                // "Order of modules within path" -> Usually implies sequential access.

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

    // Check if path is locked by prerequisites
    // This logic should ideally be server-side or checked against user completed paths
    // But we are just viewing details here.

    if (isLoading) return <div className="p-12 text-center text-gray-500">Loading Path...</div>;
    if (!path) return <div className="p-12 text-center text-red-500">Path not found</div>;

    return (
        <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
            <Link href="/dashboard/academy" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Academy
            </Link>

            <div className="bg-gradient-to-r from-primary/10 to-purple-900/10 border border-white/10 rounded-2xl p-8">
                <h1 className="text-3xl font-bold text-white mb-2">{path.title}</h1>
                <p className="text-gray-400 max-w-2xl">{path.description}</p>

                {prerequisites.length > 0 && (
                    <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                        <h4 className="text-yellow-500 font-bold text-sm uppercase tracking-wider mb-2">Prerequisites</h4>
                        <ul className="list-disc list-inside text-gray-300 space-y-1">
                            {prerequisites.map(p => (
                                <li key={p.id}>{p.title}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <div className="space-y-6">
                <h2 className="text-xl font-bold text-white">Path Modules ({modules.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modules.map((module, index) => {
                        // Simple sequential lock logic for UI (Visual only, API enforces security)
                        // If index > 0 and previous module not completed -> Locked?
                        // For now, allow access to all in path if path is accessible.

                        // We need real progress data to do sequential locking. 
                        // Assuming getModuleProgress works if module ID is valid.
                        const progress = getModuleProgress(module.id, module.chapters?.length || 0);
                        const isCompleted = progress === 100;

                        // Sequential check: Previous module must be completed
                        let isLocked = false;
                        if (index > 0) {
                            const prevModule = modules[index - 1];
                            const prevProgress = getModuleProgress(prevModule.id, prevModule.chapters?.length || 0);
                            if (prevProgress < 100) isLocked = true;
                        }

                        return (
                            <div key={module.id} className="relative">
                                {/* Number badge */}
                                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-black border border-white/10 flex items-center justify-center text-white font-bold z-10 shadow-xl">
                                    {index + 1}
                                </div>
                                <ModuleCard
                                    module={module}
                                    progress={progress}
                                    isLocked={isLocked}
                                    pathId={id}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
