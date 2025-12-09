"use client";

import { useState } from "react";
import { Chapter, QuizQuestion } from "@/types/lms";

interface QuizPlayerProps {
    chapter: Chapter;
    onComplete: () => void;
}

export function QuizPlayer({ chapter, onComplete }: QuizPlayerProps) {
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Mock Questions if not present (fallback)
    const questions: QuizQuestion[] = chapter.quizData || [
        {
            id: "q1",
            question: "What is the primary benefit of Single Molecule Localization Microscopy (SMLM)?",
            options: [
                "High Temporal Resolution",
                "Breaking the Diffraction Limit (~20nm resolution)",
                "Lower Light Toxicity for live cells",
                "Faster acquisition speed"
            ],
            correctAnswer: 1,
            explanation: "SMLM techniques like PALM and dSTORM bypass the diffraction limit of light (~200nm) by stochastically activating fluorophores, achieving resolutions down to ~20nm."
        },
        {
            id: "q2",
            question: "Which fluorophore characteristic is critical for dSTORM?",
            options: [
                "High Quantum Yield only",
                "Photoswitching / Blinking capability",
                "Broad Emission Spectrum",
                "Resistance to photobleaching"
            ],
            correctAnswer: 1,
            explanation: "dSTORM relies on the ability of fluorophores to switch between a bright 'on' state and a dark 'off' state (blinking) to localize individual molecules over time."
        }
    ];

    const handleSelect = (qId: string, index: number) => {
        if (isSubmitted) return;
        setSelectedAnswers(prev => ({ ...prev, [qId]: index }));
    };

    const handleSubmit = () => {
        setIsSubmitted(true);
        // Removed auto-timeout to let user read explanations
    };

    const allAnswered = questions.every(q => selectedAnswers[q.id] !== undefined);

    return (
        <div className="w-full max-w-4xl mx-auto p-8 animate-fade-in pb-20">
            <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
                    <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-primary font-bold tracking-wider uppercase text-[10px]">Knowledge Check</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">{chapter.title}</h2>
                <p className="text-gray-400 text-lg font-light">Complete the quiz below to unlock the next lesson.</p>
            </div>

            <div className="space-y-12 relative">
                {questions.map((q, qIndex) => (
                    <div key={q.id} className="relative group">
                        {/* Connecting Line (except last) */}
                        {qIndex < questions.length - 1 && (
                            <div className="absolute top-16 left-6 bottom-[-48px] w-px bg-gradient-to-b from-white/10 to-transparent group-last:hidden z-0" />
                        )}

                        <div className="flex gap-6 relative z-10">
                            {/* Number Badge */}
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 rounded-2xl bg-gray-900 border border-white/10 flex items-center justify-center text-lg font-bold text-white shadow-xl group-hover:border-primary/50 transition-colors duration-500">
                                    {qIndex + 1}
                                </div>
                            </div>

                            <div className="flex-1">
                                <h3 className="text-xl md:text-2xl font-bold text-white mb-6 leading-relaxed">
                                    {q.question}
                                </h3>

                                <div className="grid grid-cols-1 gap-3">
                                    {q.options.map((opt, i) => {
                                        const isSelected = selectedAnswers[q.id] === i;
                                        const isCorrect = isSubmitted && i === q.correctAnswer;
                                        const isWrong = isSubmitted && isSelected && i !== q.correctAnswer;

                                        let containerClass = "border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 active:scale-[0.99]";
                                        let textClass = "text-gray-300";
                                        let indicatorBorder = "border-white/20";
                                        let indicatorBg = "bg-transparent";
                                        let indicatorInner = null;

                                        if (isSelected) {
                                            containerClass = "border-[#00CAF8]/50 bg-[#00CAF8]/10 shadow-[0_0_20px_rgba(0,202,248,0.1)]";
                                            textClass = "text-white font-medium";
                                            indicatorBorder = "border-[#00CAF8]";
                                            indicatorBg = "bg-[#00CAF8]";
                                            indicatorInner = <div className="w-2 h-2 bg-black rounded-full" />;
                                        }

                                        if (isSubmitted) {
                                            if (isCorrect) {
                                                containerClass = "border-[#00D296]/50 bg-[#00D296]/10 shadow-[0_0_20px_rgba(0,210,150,0.1)]";
                                                textClass = "text-[#00D296] font-bold";
                                                indicatorBorder = "border-[#00D296]";
                                                indicatorBg = "bg-[#00D296]";
                                                indicatorInner = <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
                                            } else if (isWrong) {
                                                containerClass = "border-[#FF73FF]/50 bg-[#FF73FF]/5 opacity-80 shadow-[0_0_20px_rgba(255,115,255,0.1)]";
                                                textClass = "text-[#FF73FF]";
                                                indicatorBorder = "border-[#FF73FF]";
                                                indicatorBg = "bg-[#FF73FF]";
                                                indicatorInner = <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
                                            } else {
                                                containerClass = "opacity-40 border-transparent bg-transparent grayscale";
                                            }
                                        }

                                        return (
                                            <button
                                                key={i}
                                                onClick={() => handleSelect(q.id, i)}
                                                disabled={isSubmitted}
                                                className={`w-full text-left p-4 md:p-5 rounded-xl border transition-all duration-300 flex items-center gap-5 group/opt ${containerClass}`}
                                            >
                                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${indicatorBorder} ${indicatorBg}`}>
                                                    {indicatorInner}
                                                </div>
                                                <span className={`text-base ${textClass} transition-colors`}>{opt}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Explanation Block */}
                                {isSubmitted && (
                                    <div className={`mt-6 rounded-xl overflow-hidden animate-fade-in-up ${selectedAnswers[q.id] === q.correctAnswer
                                            ? 'bg-gradient-to-br from-[#00D296]/10 to-transparent border border-[#00D296]/20'
                                            : 'bg-gradient-to-br from-[#FF73FF]/10 to-transparent border border-[#FF73FF]/20'
                                        }`}>
                                        <div className="p-5 flex gap-4">
                                            <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${selectedAnswers[q.id] === q.correctAnswer ? 'bg-[#00D296] text-black' : 'bg-[#FF73FF] text-black'
                                                }`}>
                                                {selectedAnswers[q.id] === q.correctAnswer
                                                    ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                    : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                }
                                            </div>
                                            <div>
                                                <h4 className={`text-sm font-bold uppercase tracking-wide mb-1 ${selectedAnswers[q.id] === q.correctAnswer ? 'text-[#00D296]' : 'text-[#FF73FF]'
                                                    }`}>
                                                    {selectedAnswers[q.id] === q.correctAnswer ? 'Correct' : 'Explanation'}
                                                </h4>
                                                <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                                                    {q.explanation}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-16 flex justify-end sticky bottom-8 z-30">
                {!isSubmitted ? (
                    <button
                        onClick={handleSubmit}
                        disabled={!allAnswered}
                        className={`group relative px-8 py-4 rounded-xl font-bold uppercase tracking-wider overflow-hidden transition-all shadow-xl ${!allAnswered
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            : 'bg-white text-black hover:scale-105 shadow-primary/25'
                            }`}
                    >
                        <div className={`absolute inset-0 bg-primary transition-transform duration-300 origin-left ${!allAnswered ? 'translate-x-[-100%]' : 'group-hover:translate-x-full opacity-20'}`} />
                        <span className="relative flex items-center gap-3">
                            Submit Answers
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                        </span>
                    </button>
                ) : (
                    <button
                        onClick={onComplete}
                        className="group bg-primary text-black px-8 py-4 rounded-xl font-bold uppercase tracking-wider transition-all transform hover:scale-105 shadow-xl shadow-primary/20 flex items-center gap-3 hover:bg-white"
                    >
                        <span>I have reviewed the results</span>
                        <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
}
