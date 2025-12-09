"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Chapter, Module } from "@/types/lms";
import { QuizPlayer } from "./QuizPlayer";
import { CompletionScreen } from "./CompletionScreen";
import { SlideViewer } from "./SlideViewer";
import { useLmsProgress } from "@/hooks/useLmsProgress";

import { useUser } from "@/context/UserContext";

interface CoursePlayerProps {
    module: Module;
    pathId?: string;
}

export default function CoursePlayer({ module, pathId }: CoursePlayerProps) {
    const { refreshUser } = useUser();
    const [activeChapterId, setActiveChapterId] = useState(module.chapters[0].id);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isModuleCompleted, setIsModuleCompleted] = useState(false);
    const [nextModuleId, setNextModuleId] = useState<string | number | undefined>(undefined);

    useEffect(() => {
        if (pathId) {
            fetch(`/api/learning-paths/${pathId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.modules) {
                        const currentIdx = data.modules.findIndex((m: any) => m.id.toString() === module.id.toString());
                        if (currentIdx !== -1 && currentIdx < data.modules.length - 1) {
                            setNextModuleId(data.modules[currentIdx + 1].id);
                        }
                    }
                })
                .catch(err => console.error("Failed to fetch path for navigation", err));
        }
    }, [pathId, module.id]);
    const { markChapterComplete, markModuleComplete, progress } = useLmsProgress();

    // If module is completed, show completion screen
    if (isModuleCompleted) {
        return <CompletionScreen module={module} nextModuleId={nextModuleId} pathId={pathId} />;
    }

    const activeChapter = module.chapters.find(c => c.id === activeChapterId) || module.chapters[0];
    const activeIndex = module.chapters.findIndex(c => c.id === activeChapterId);

    // Simple navigation handlers
    const router = useRouter();
    // Need to import useRouter at top level first! 
    // I will do that in a separate edit or assume I can do it here if I check imports.

    const nextChapter = async () => {
        // Mark current chapter as complete
        markChapterComplete(module.id, activeChapter.id);

        if (activeIndex < module.chapters.length - 1) {
            setActiveChapterId(module.chapters[activeIndex + 1].id);
        } else {
            // Last chapter finished
            const result = await markModuleComplete(module.id);
            setIsModuleCompleted(true);
            await refreshUser(); // Sync XP to global context

            // Check for Path Auto-Advance
            if (pathId && result) {
                // Result contains pathCompleted, bonusXp etc.
                if (result.pathCompleted) {
                    // Path Completed!
                    // Maybe show confetti or alert before redirect?
                    // For now, let CompletionScreen handle it or redirect after short delay.
                } else {
                    // Fetch Path Details to find NEXT module
                    try {
                        const pathRes = await fetch(`/api/learning-paths/${pathId}`);
                        const pathData = await pathRes.json();
                        const modules = pathData.modules || [];
                        const currentIdx = modules.findIndex((m: any) => m.id.toString() === module.id.toString());
                        if (currentIdx !== -1 && currentIdx < modules.length - 1) {
                            const nextMod = modules[currentIdx + 1];
                            router.push(`/dashboard/academy/${nextMod.id}?pathId=${pathId}`);
                            return; // Skip setting isModuleCompleted to avoid showing completion screen briefly
                        }
                    } catch (e) { console.error(e); }
                }
            }
        }
    };

    const prevChapter = () => {
        if (activeIndex > 0) {
            setActiveChapterId(module.chapters[activeIndex - 1].id);
        }
    };

    return (
        <div className="flex h-[calc(100vh-theme(spacing.24))] overflow-hidden bg-black border border-white/10 rounded-2xl relative shadow-2xl">
            {/* Sidebar (Chapter List) */}
            <div className={`w-80 bg-black/50 backdrop-blur border-r border-white/10 flex flex-col transition-all duration-300 absolute md:static z-20 h-full ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:overflow-hidden'}`}>
                <div className="p-4 border-b border-white/10 bg-black/40">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Module Content</h3>
                    <h2 className="font-bold text-white line-clamp-1" title={module.title}>{module.title}</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {module.chapters.map((chapter, index) => {
                        const isActive = chapter.id === activeChapterId;

                        // Check precise completion status from global progress
                        const chapterKey = `${module.id}-${chapter.id}`;
                        const isCompleted = progress.completedChapterIds.includes(chapterKey);

                        // A chapter is locked if it's not the first one AND the previous one hasn't been completed
                        // This enforces sequential progression
                        const isLocked = index > 0 && !progress.completedChapterIds.includes(`${module.id}-${module.chapters[index - 1].id}`);

                        return (
                            <button
                                key={chapter.id}
                                onClick={() => !isLocked && setActiveChapterId(chapter.id)}
                                disabled={isLocked}
                                className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition-colors ${isActive
                                    ? 'bg-primary/20 border border-primary/20'
                                    : isLocked
                                        ? 'cursor-not-allowed opacity-50 border border-transparent'
                                        : 'hover:bg-white/5 border border-transparent cursor-pointer'
                                    }`}
                            >
                                <div className={`mt-1 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center border ${isActive ? 'border-primary text-primary' :
                                    isCompleted ? 'bg-green-500 border-green-500 text-black' :
                                        isLocked ? 'border-gray-800 text-gray-800' : 'border-gray-600'
                                    }`}>
                                    {isCompleted && !isActive && <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                    {isActive && <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />}
                                    {isLocked && !isCompleted && !isActive && <span className="block w-1 h-1 bg-gray-800 rounded-full" />}
                                </div>
                                <div>
                                    <div className={`text-sm font-medium ${isActive ? 'text-white' :
                                        isLocked ? 'text-gray-600' : 'text-gray-400'
                                        }`}>
                                        {index + 1}. {chapter.title}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] uppercase font-bold px-1 rounded border ${isLocked ? 'text-gray-700 border-gray-800' : 'text-gray-600 border-gray-700'
                                            }`}>
                                            {chapter.type}
                                        </span>
                                        <span className={`text-xs ${isLocked ? 'text-gray-700' : 'text-gray-600'}`}>{chapter.duration}</span>
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>

                <div className="p-4 border-t border-white/10">
                    <Link href="/dashboard/academy" className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7 7-7" /></svg>
                        Back to Catalog
                    </Link>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-gray-900/50 relative">

                {/* Mobile Toggle */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="absolute top-4 left-4 z-30 p-2 bg-black/50 backdrop-blur rounded-lg border border-white/10 text-white hover:bg-black transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>


                {/* Player Container */}
                <div className="flex-1 overflow-y-auto">
                    {activeChapter.type === 'video' && (
                        <div className="w-full h-full flex flex-col">
                            {/* Video Embed */}
                            <div className="w-full aspect-video bg-black relative shadow-lg">
                                {activeChapter.contentUrl?.includes('youtube') || activeChapter.contentUrl?.includes('youtu.be') ? (
                                    <iframe
                                        src={(() => {
                                            try {
                                                const url = activeChapter.contentUrl || "";
                                                let videoId = "";
                                                if (url.includes('youtube.com/watch')) {
                                                    videoId = new URL(url).searchParams.get("v") || "";
                                                } else if (url.includes('youtu.be')) {
                                                    videoId = url.split('youtu.be/')[1]?.split('?')[0] || "";
                                                }
                                                return `https://www.youtube.com/embed/${videoId}?autoplay=0`;
                                            } catch (e) { return ""; }
                                        })()}
                                        className="absolute inset-0 w-full h-full"
                                        allowFullScreen
                                        title="Course Video"
                                    />
                                ) : (
                                    <video
                                        src={activeChapter.contentUrl}
                                        controls
                                        className="absolute inset-0 w-full h-full"
                                    />
                                )}
                            </div>
                            <div className="p-8 max-w-4xl mx-auto w-full">
                                <h1 className="text-2xl font-bold text-white mb-4">{activeChapter.title}</h1>
                                <p className="text-gray-300 leading-relaxed mb-6">
                                    In this lesson, we will cover the fundamental concepts required to act as a foundation for the rest of the module.
                                    Please ensure you watch the entire video before proceeding to the quiz.
                                </p>

                                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        Lesson Resources
                                    </h3>
                                    <div className="flex flex-col gap-2">
                                        <button className="flex items-center justify-between p-3 bg-black/20 hover:bg-black/40 rounded-lg transition-colors group text-left">
                                            <span className="text-sm text-gray-300 group-hover:text-primary transition-colors">📄 Lecture Notes.pdf</span>
                                            <span className="text-xs text-gray-600">2.4 MB</span>
                                        </button>
                                        <button className="flex items-center justify-between p-3 bg-black/20 hover:bg-black/40 rounded-lg transition-colors group text-left">
                                            <span className="text-sm text-gray-300 group-hover:text-primary transition-colors">📊 Dataset_Sample_01.zip</span>
                                            <span className="text-xs text-gray-600">145 MB</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}





                    {activeChapter.type === 'slides' && (
                        <div className="w-full h-full">
                            {activeChapter.contentUrl?.endsWith('.pdf') ? (
                                <SlideViewer
                                    slides={undefined}
                                    pdfUrl={activeChapter.contentUrl}
                                    onComplete={() => nextChapter()}
                                />
                            ) : activeChapter.slidesData ? (
                                <SlideViewer slides={activeChapter.slidesData} onComplete={() => nextChapter()} />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    No slides available.
                                    <button onClick={nextChapter} className="ml-4 underline text-white">Skip</button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeChapter.type === 'quiz' && (
                        <QuizPlayer chapter={activeChapter} onComplete={() => nextChapter()} />
                    )}

                    {activeChapter.type === 'pdf' && (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900">
                            <div className="w-full h-full p-4 md:p-8">
                                <iframe
                                    src={activeChapter.contentUrl}
                                    className="w-full h-full rounded-xl border border-white/10 bg-white"
                                    title="PDF Viewer"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Player Footer (Navigation) */}
                <div className="h-20 border-t border-white/10 bg-black flex items-center justify-between px-8">
                    <button
                        onClick={prevChapter}
                        disabled={activeIndex === 0}
                        className={`px-6 py-2 rounded-lg font-bold uppercase text-xs flex items-center gap-2 transition-colors ${activeIndex === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-white hover:bg-white/10'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Previous
                    </button>

                    <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-500 font-mono hidden md:block">
                            Progress: {Math.round(((activeIndex) / module.chapters.length) * 100)}%
                        </span>
                        <div className="w-32 h-1 bg-white/10 rounded-full hidden md:block">
                            <div className="h-full bg-primary" style={{ width: `${((activeIndex) / module.chapters.length) * 100}%` }}></div>
                        </div>
                    </div>

                    <button
                        onClick={nextChapter}
                        // If last chapter, button should say "Finish Module"
                        className="px-8 py-3 bg-primary text-black rounded-lg font-bold uppercase text-xs flex items-center gap-2 hover:bg-white transition-colors shadow-[0_0_20px_rgba(0,202,248,0.3)]"
                    >
                        {activeIndex === module.chapters.length - 1 ? 'Finish Module' : 'Next Lesson'}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>

            </div>
        </div>
    );
}
