"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Chapter, Module } from "@/types/lms";
import { QuizPlayer } from "./QuizPlayer";
import { CompletionScreen } from "./CompletionScreen";
import { SlideViewer } from "./SlideViewer";
import { useLmsProgress } from "@/hooks/useLmsProgress";

import { VideoPlayer } from "./VideoPlayer";
import { useUser } from "@/context/UserContext";

interface CoursePlayerProps {
    module: Module;
    pathId?: string;
}
// Helper to auto-complete GIF after mounting
function RequireGifCompletion({ children, onComplete }: { children: React.ReactNode, onComplete: () => void }) {
    useEffect(() => {
        // Auto-complete immediately or after a short delay
        const timer = setTimeout(() => {
            onComplete();
        }, 1000);
        return () => clearTimeout(timer);
    }, [onComplete]);
    return <>{children}</>;
}

export default function CoursePlayer({ module, pathId }: CoursePlayerProps) {
    const { refreshUser } = useUser();
    const [activeChapterId, setActiveChapterId] = useState(module.chapters[0].id);
    // ... rest of component

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isModuleCompleted, setIsModuleCompleted] = useState(false);
    const [nextModuleId, setNextModuleId] = useState<string | number | undefined>(undefined);
    const [isRequirementsMet, setIsRequirementsMet] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Stop speaking when unmounting or changing chapters
    useEffect(() => {
        const stopSpeaking = () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            setIsSpeaking(false);
        };

        return stopSpeaking;
    }, [activeChapterId]);

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

    // Reset requirement state when changing chapters
    useEffect(() => {
        // Check if ALREADY completed in backend
        const chapterKey = `${module.id}-${activeChapterId}`;
        const isAlreadyDone = progress.completedChapterIds.includes(chapterKey);
        setIsRequirementsMet(isAlreadyDone);
    }, [activeChapterId, progress.completedChapterIds, module.id]);

    const handleContentCompleted = () => {
        setIsRequirementsMet(true);
    };

    // If module is completed, show completion screen
    if (isModuleCompleted) {
        return <CompletionScreen module={module} nextModuleId={nextModuleId} pathId={pathId} />;
    }

    const activeChapter = module.chapters.find(c => c.id === activeChapterId) || module.chapters[0];
    const activeIndex = module.chapters.findIndex(c => c.id === activeChapterId);

    // Simple navigation handlers
    const router = useRouter();

    const nextChapter = async () => {
        if (!isRequirementsMet) return;

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
        <div className="flex h-[calc(100vh-theme(spacing.24))] overflow-hidden bg-[#02040a] border border-white/10 rounded-2xl relative shadow-2xl group/player isolate">

            {/* SMLM Abbelight Brand Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                {/* Abbelight Magenta Glow (Top Left) */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] bg-[#FF73FF]/10 rounded-full blur-[100px] mix-blend-screen animate-pulse-slow" />

                {/* Abbelight Cyan Glow (Bottom Right) */}
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[50%] bg-[#00CAF8]/10 rounded-full blur-[100px] mix-blend-screen animate-pulse-slow delay-1000" />

                {/* Abbelight Green Glow (Center/Top) */}
                <div className="absolute top-[-20%] left-[40%] w-[40%] h-[40%] bg-[#00D296]/5 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow delay-2000" />

                {/* Simulated "Molecules" (Stochastic blinking points) */}
                <div className="absolute inset-0 opacity-30"
                    style={{
                        backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.8) 1px, transparent 1px)',
                        backgroundSize: '50px 50px',
                        maskImage: 'radial-gradient(circle at center, black 50%, transparent 100%)'
                    }}
                />
            </div>

            {/* Sidebar (Chapter List) */}
            <div className={`w-80 bg-black/60 backdrop-blur-xl border-r border-white/10 flex flex-col transition-all duration-300 absolute md:static z-20 h-full ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:overflow-hidden'}`}>
                <div className="p-4 border-b border-white/10 bg-black/20">
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
                                className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition-all duration-300 group/item ${isActive
                                    ? 'bg-primary/20 border border-primary/20 shadow-[0_0_15px_rgba(0,202,248,0.15)]'
                                    : isLocked
                                        ? 'cursor-not-allowed opacity-40 border border-transparent'
                                        : 'hover:bg-white/5 border border-transparent cursor-pointer hover:border-white/10'
                                    }`}
                            >
                                <div className={`mt-1 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center border transition-colors ${isActive ? 'border-primary text-primary shadow-[0_0_10px_currentColor]' :
                                    isCompleted ? 'bg-green-500 border-green-500 text-black shadow-[0_0_10px_rgba(34,197,94,0.4)]' :
                                        isLocked ? 'border-gray-800 text-gray-800' : 'border-gray-600 group-hover/item:border-gray-400'
                                    }`}>
                                    {isCompleted && !isActive && <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                    {isActive && <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />}
                                    {isLocked && !isCompleted && !isActive && <span className="block w-1 h-1 bg-gray-800 rounded-full" />}
                                </div>
                                <div>
                                    <div className={`text-sm font-medium transition-colors ${isActive ? 'text-white' :
                                        isLocked ? 'text-gray-600' : 'text-gray-400 group-hover/item:text-gray-300'
                                        }`}>
                                        {index + 1}. {chapter.title}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${isLocked ? 'text-gray-700 border-gray-800' : 'text-gray-500 border-gray-700 group-hover/item:border-gray-600'
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

                <div className="p-4 border-t border-white/10 bg-black/20">
                    <Link href="/dashboard/academy" className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7 7-7" /></svg>
                        Back to Catalog
                    </Link>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-transparent relative z-10">

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
                            <VideoPlayer
                                url={activeChapter.contentUrl || ""}
                                onComplete={handleContentCompleted}
                            />
                            <div className="p-8 max-w-4xl mx-auto w-full">
                                <h1 className="text-2xl font-bold text-white mb-4">{activeChapter.title}</h1>
                                <p className="text-gray-300 leading-relaxed mb-6">
                                    In this lesson, we will cover the fundamental concepts required to act as a foundation for the rest of the module.
                                    Please ensure you watch the entire video before proceeding to the quiz.
                                </p>

                                <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        Lesson Resources
                                    </h3>
                                    <div className="flex flex-col gap-2">
                                        <button className="flex items-center justify-between p-3 bg-black/40 hover:bg-black/60 rounded-lg transition-colors group text-left border border-white/5 hover:border-primary/30">
                                            <span className="text-sm text-gray-300 group-hover:text-primary transition-colors">📄 Lecture Notes.pdf</span>
                                            <span className="text-xs text-gray-600">2.4 MB</span>
                                        </button>
                                        <button className="flex items-center justify-between p-3 bg-black/40 hover:bg-black/60 rounded-lg transition-colors group text-left border border-white/5 hover:border-primary/30">
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
                                    onComplete={handleContentCompleted}
                                />
                            ) : activeChapter.slidesData ? (
                                <SlideViewer slides={activeChapter.slidesData} onComplete={handleContentCompleted} />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    No slides available.
                                    <button onClick={handleContentCompleted} className="ml-4 underline text-white">Skip (Debug)</button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeChapter.type === 'quiz' && (
                        <QuizPlayer chapter={activeChapter} onComplete={handleContentCompleted} />
                    )}

                    {activeChapter.type === 'pdf' && (
                        <div className="w-full h-full">
                            {/* Reuse SlideViewer for PDF type to ensure tracking of "parcouru tout le pdf" */}
                            <SlideViewer
                                slides={undefined}
                                pdfUrl={activeChapter.contentUrl}
                                onComplete={handleContentCompleted}
                            />
                        </div>
                    )}

                    {activeChapter.type === 'gif' && (
                        <div className="w-full h-full flex flex-col relative bg-black">
                            {/* GIF Area - Takes max space */}
                            {activeChapter.contentUrl && (
                                <div className="flex-1 min-h-0 relative flex items-center justify-center p-0">
                                    <RequireGifCompletion onComplete={handleContentCompleted}>
                                        <img
                                            src={activeChapter.contentUrl}
                                            alt={activeChapter.title}
                                            className="w-full h-full object-contain"
                                        />
                                    </RequireGifCompletion>
                                </div>
                            )}

                            {/* Description Area - Overlay bottom or fixed block */}
                            {activeChapter.description && (
                                <div className="bg-black/90 backdrop-blur-md border-t border-white/10 p-6 max-h-[35%] overflow-y-auto w-full shrink-0 z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
                                    <div className="flex items-center justify-between gap-4 mb-3">
                                        <h1 className="text-xl font-bold text-white flex items-center gap-2 m-0">
                                            {activeChapter.title}
                                        </h1>

                                        {/* TTS Button */}
                                        <button
                                            onClick={() => {
                                                if (isSpeaking) {
                                                    window.speechSynthesis.cancel();
                                                    setIsSpeaking(false);
                                                } else {
                                                    const tmp = document.createElement("DIV");
                                                    tmp.innerHTML = activeChapter.description || "";
                                                    const text = tmp.textContent || tmp.innerText || "";

                                                    if (text.trim()) {
                                                        const utterance = new SpeechSynthesisUtterance(text);
                                                        // Force English language to avoid "French accent" on English text
                                                        utterance.lang = 'en-US';

                                                        // Optional: Try to find a premium English voice if available (e.g. Google US English, Microsoft Zira, etc.)
                                                        const voices = window.speechSynthesis.getVoices();
                                                        const englishVoice = voices.find(v => v.lang === 'en-US' && !v.name.includes("Zira")) || voices.find(v => v.lang.startsWith('en'));
                                                        if (englishVoice) {
                                                            utterance.voice = englishVoice;
                                                        }

                                                        utterance.onend = () => setIsSpeaking(false);
                                                        utterance.onerror = () => setIsSpeaking(false);

                                                        window.speechSynthesis.cancel(); // Cancel any previous
                                                        window.speechSynthesis.speak(utterance);
                                                        setIsSpeaking(true);
                                                    }
                                                }
                                            }}
                                            className={`p-2 rounded-full transition-all border ${isSpeaking
                                                ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(0,202,248,0.5)] animate-pulse'
                                                : 'bg-white/10 text-white border-white/10 hover:bg-white/20 hover:border-white/30'
                                                }`}
                                            title={isSpeaking ? "Arrêter la lecture" : "Lire le texte"}
                                        >
                                            {isSpeaking ? (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H9a1 1 0 01-1-1v-4z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    <div
                                        className="text-gray-300 text-base leading-relaxed prose prose-invert prose-p:my-2 prose-headings:text-white prose-a:text-primary max-w-none"
                                        dangerouslySetInnerHTML={{ __html: activeChapter.description }}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Player Footer (Navigation) */}
                <div className="h-20 border-t border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-between px-8">
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
                        <div className="w-32 h-1 bg-white/10 rounded-full hidden md:block overflow-hidden relative">
                            <div className="absolute inset-0 bg-white/5" />
                            <div className="h-full bg-primary shadow-[0_0_10px_rgba(0,202,248,0.5)] transition-all duration-500" style={{ width: `${((activeIndex) / module.chapters.length) * 100}%` }}></div>
                        </div>
                    </div>

                    <div className="relative group">
                        <button
                            onClick={nextChapter}
                            disabled={!isRequirementsMet}
                            className={`px-8 py-3 rounded-lg font-bold uppercase text-xs flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(0,0,0,0.3)] ${isRequirementsMet
                                ? 'bg-primary text-black hover:bg-white cursor-pointer shadow-[0_0_20px_rgba(0,202,248,0.3)]'
                                : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-70'
                                }`}
                        >
                            {activeIndex === module.chapters.length - 1 ? 'Finish Module' : 'Next Lesson'}
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>

                        {/* Tooltip for disabled state */}
                        {!isRequirementsMet && (
                            <div className="absolute bottom-full right-0 mb-2 w-max px-3 py-2 bg-gray-900 text-white text-xs rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Complete the content to unlock
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
