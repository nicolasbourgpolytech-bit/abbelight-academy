"use client";

import { use, useEffect, useState } from "react";
import CoursePlayer from "@/components/lms/CoursePlayer"; // Fixed import path logic
import { MOCK_MODULES } from "@/data/mockLms";
import Link from "next/link";
import { Module } from "@/types/lms";

export default function ModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
    // Unwrap params Promise for Next.js 15+ compatibility
    const [moduleId, setModuleId] = useState<string | null>(null);

    useEffect(() => {
        params.then(p => setModuleId(p.moduleId));
    }, [params]);

    if (!moduleId) return <div className="p-20 text-center text-gray-500">Loading module...</div>;

    const module = MOCK_MODULES.find(m => m.id === moduleId);

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
