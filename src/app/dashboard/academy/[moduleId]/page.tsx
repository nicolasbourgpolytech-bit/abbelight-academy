"use client";

import { use, useEffect, useState } from "react";
import CoursePlayer from "@/components/lms/CoursePlayer"; // Fixed import path logic
import { MOCK_MODULES } from "@/data/mockLms";
import Link from "next/link";
import { Module } from "@/types/lms";

import { useSearchParams } from "next/navigation";

export default function ModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
    // Unwrap params Promise for Next.js 15+ compatibility
    const [moduleId, setModuleId] = useState<string | null>(null);
    const [module, setModule] = useState<Module | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const searchParams = useSearchParams();
    const pathId = searchParams.get('pathId');

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
                // Fetch specific module from DB
                const moduleRes = await fetch(`/api/modules?id=${moduleId}`);
                if (!moduleRes.ok) {
                    console.error("Module fetch error", await moduleRes.text());
                    return;
                }
                const moduleData = await moduleRes.json();
                const foundModule = moduleData.module;

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
        // ... (keep existing 404) ... (omitted for brevity in prompt, but keeping in file)
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
            <CoursePlayer module={module} pathId={pathId || undefined} />
        </div>
    );
}
