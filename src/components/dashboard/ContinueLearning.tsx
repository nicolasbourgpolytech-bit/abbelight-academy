"use client";

import { useUser } from "@/context/UserContext";
import Link from "next/link";
import { useEffect, useState } from "react";

export function ContinueLearning() {
    const { user } = useUser();
    const [currentPath, setCurrentPath] = useState<{ id: number; title: string; status: string } | null>(null);
    const [nextModule, setNextModule] = useState<{ id: number; title: string; description: string; duration: number } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const loadActivePath = async () => {
            try {
                // 1. Get all assigned paths for user
                const res = await fetch(`/api/learning-paths?userId=${user.id}`);
                const data = await res.json();

                if (data.paths) {
                    // Find the first one that is "in_progress"
                    const active = data.paths.find((p: any) => p.status === 'in_progress');

                    if (active) {
                        // 2. Load details for this path to find the next module
                        const detailRes = await fetch(`/api/learning-paths/${active.id}`);
                        const detailData = await detailRes.json();

                        // Check progress to find first incomplete module
                        // We need the user's progress for this specific path
                        // Ideally we would fetch `/api/progress` and cross reference
                        const progRes = await fetch(`/api/progress?email=${encodeURIComponent(user.email)}`);
                        const progData = await progRes.json();
                        const completedIds = progData.completedModuleIds || [];

                        const modules = detailData.modules || [];
                        const next = modules.find((m: any) => !completedIds.includes(m.id.toString()));

                        setCurrentPath(active);
                        setNextModule(next || modules[0]); // Default to first if all done (shouldn't happen if in_progress) or none done
                    }
                }
            } catch (err) {
                console.error("Failed to load learning path", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadActivePath();
    }, [user]);

    if (isLoading || !currentPath || !nextModule) return null;

    return (
        <section className="animate-fade-in mb-8">
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2 uppercase tracking-widest">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                Continue Learning
            </h2>
            <div className="glass-card p-0 overflow-hidden group border-primary/30 bg-primary/5">
                <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex-1">
                        <div className="text-xs font-bold text-primary mb-2 uppercase tracking-widest">
                            Current Path: {currentPath.title}
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                            {nextModule.title}
                        </h3>
                        <p className="text-gray-400 mb-4 max-w-2xl">
                            {nextModule.description || "Resume your journey where you left off."}
                        </p>

                        <div className="flex items-center gap-4">
                            <Link
                                href={`/academy/module/${nextModule.id}`}
                                className="px-8 py-3 bg-primary text-black font-bold uppercase tracking-wider hover:bg-white transition-all transform hover:scale-105 shadow-lg shadow-primary/20"
                            >
                                Resume Module
                            </Link>
                            <span className="text-xs text-gray-500 font-mono">
                                EST. {nextModule.duration || 15} MIN
                            </span>
                        </div>
                    </div>

                    {/* Visual decoration */}
                    <div className="hidden md:block opacity-30 group-hover:opacity-100 transition-opacity">
                        <div className="w-32 h-32 rounded-full border-4 border-dashed border-primary/30 flex items-center justify-center animate-[spin_10s_linear_infinite]">
                            <div className="w-24 h-24 rounded-full bg-primary/10"></div>
                        </div>
                    </div>
                </div>

                {/* Progress bar line bottom */}
                <div className="h-1 w-full bg-black/20">
                    <div className="h-full bg-primary w-1/3"></div>
                </div>
            </div>
        </section>
    );
}
