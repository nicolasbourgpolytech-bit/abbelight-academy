"use client";

import { use, useEffect, useState } from "react";
import CoursePlayer from "@/components/lms/CoursePlayer"; // Fixed import path logic
import { MOCK_MODULES } from "@/data/mockLms";
import Link from "next/link";
import { Module } from "@/types/lms";

export default function ModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
    // Unwrap params Promise for Next.js 15+ compatibility
    const [moduleId, setModuleId] = useState<string | null>(null);
    const [module, setModule] = useState<Module | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        params.then(p => setModuleId(p.moduleId));
    }, [params]);

    useEffect(() => {
        if (!moduleId) return;

        // Fetch module and populate with chapters
        const fetchModuleData = async () => {
            // 1. Try finding in Mock first (for legacy support during migration)
            const mock = MOCK_MODULES.find(m => m.id === moduleId);
            if (mock) {
                setModule(mock);
                setIsLoading(false);
                return;
            }

            // 2. Fetch from DB
            try {
                // Fetch all modules to find the right one (optimized: could create a specific ID endpoint)
                const modulesRes = await fetch('/api/modules');
                const modulesData = await modulesRes.json();
                const foundModule = modulesData.modules.find((m: any) => m.id.toString() === moduleId);

                if (foundModule) {
                    // Fetch chapters for this module
                    const chaptersRes = await fetch(`/api/chapters?moduleId=${moduleId}`);
                    const chaptersData = await chaptersRes.json();

                    setModule({
                        ...foundModule,
                        thumbnailUrl: foundModule.thumbnail_url || foundModule.thumbnailUrl,
                        chapters: chaptersData.chapters?.map((c: any) => ({
                            ...c,
                            contentUrl: c.content_url || c.contentUrl, // Map DB snake_case to Frontend camelCase
                            quizData: c.type === 'quiz' ? c.data : undefined, // Map generic JSONB 'data' to typed props
                            slidesData: c.type === 'slides' ? c.data : undefined,
                        })) || [],
                        roles: [] // Default roles
                    });
                }
            } catch (err) {
                console.error("Failed to load module", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchModuleData();

    }, [moduleId]);

    if (isLoading) return <div className="p-20 text-center text-gray-500 animate-pulse">Loading course content...</div>;

    if (!module) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <h1 className="text-4xl font-bold text-white mb-4">Module Not Found</h1>
                <p className="text-gray-400 mb-8">The requested module does not exist or you do not have permission to view it.</p>
                <Link href="/dashboard/academy" className="px-6 py-3 bg-primary text-black font-bold rounded hover:bg-white transition-colors">
                    Back to Catalog
                </Link>
            </div>
        );
    }

    return (
        <div className="animate-fade-in pb-10">
            <CoursePlayer module={module} />
        </div>
    );
}
