"use client";

import { useState } from "react";
import Link from "next/link";
import { Chapter, Module } from "@/types/lms";
import { QuizPlayer } from "./QuizPlayer";
import { CompletionScreen } from "./CompletionScreen";
import { SlideViewer } from "./SlideViewer";
import { useLmsProgress } from "@/hooks/useLmsProgress";

interface CoursePlayerProps {
    module: Module;
}

export default function CoursePlayer({ module }: CoursePlayerProps) {
    const [activeChapterId, setActiveChapterId] = useState(module.chapters[0].id);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isModuleCompleted, setIsModuleCompleted] = useState(false);
    const { markChapterComplete, markModuleComplete } = useLmsProgress();

    // If module is completed, show completion screen
    if (isModuleCompleted) {
        return <CompletionScreen module={module} />;
    }

    const activeChapter = module.chapters.find(c => c.id === activeChapterId) || module.chapters[0];
    const activeIndex = module.chapters.findIndex(c => c.id === activeChapterId);

    // Simple navigation handlers
    const nextChapter = () => {
        // Mark current chapter as complete before moving on
        markChapterComplete(module.id, activeChapter.id);

        if (activeIndex < module.chapters.length - 1) {
            setActiveChapterId(module.chapters[activeIndex + 1].id);
        } else {
            // Last chapter finished
            markModuleComplete(module.id);
            setIsModuleCompleted(true);
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
                        const isActive = chapter.id === activeChapter.id;
                        // Mock status logic needs to check against current active index for simplicity in this demo, 
                        // or ideally use 'completedChapterIds' from useLmsProgress to show checkmarks.
                        const isCompleted = index < activeIndex;

                        return (
                            <button
                                key={chapter.id}
                                onClick={() => setActiveChapterId(chapter.id)}
                                className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition-colors ${isActive
                                    ? 'bg-primary/20 border border-primary/20'
                                    : 'hover:bg-white/5 border border-transparent'
                                    }`}
                            >
                                <div className={`mt-1 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center border ${isActive ? 'border-primary text-primary' :
                                    isCompleted ? 'bg-green-500 border-green-500 text-black' : 'border-gray-600'
                                    }`}>
                                    {isCompleted && <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                    {isActive && <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />}
                                </div>
                                <div>
                                    <div className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
                                        {index + 1}. {chapter.title}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] uppercase font-bold text-gray-600 border border-gray-700 px-1 rounded">
                                            {chapter.type}
                                        </span>
                                        <span className="text-xs text-gray-600">{chapter.duration}</span>
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
                                {activeChapter.content_url?.includes('youtube') || activeChapter.content_url?.includes('youtu.be') ? (
                                    <iframe
                                        src={(() => {
                                            try {
                                                const url = activeChapter.content_url;
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
                                        src={activeChapter.content_url}
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
                            {activeChapter.slidesData ? (
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
