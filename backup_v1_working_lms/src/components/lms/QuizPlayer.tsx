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
        <div className="w-full max-w-3xl mx-auto p-8 animate-fade-in">
            <div className="text-center mb-10">
                <span className="text-primary font-bold tracking-widest uppercase text-xs mb-2 block">Knowledge Check</span>
                <h2 className="text-4xl font-bold text-white">{chapter.title}</h2>
                <p className="text-gray-400 mt-2">Validation required to complete this module.</p>
            </div>

            <div className="space-y-8">
                {questions.map((q, qIndex) => (
                    <div key={q.id} className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-white mb-6 flex gap-3">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-mono text-gray-400">{qIndex + 1}</span>
                            {q.question}
                        </h3>

                        <div className="grid grid-cols-1 gap-3">
                            {q.options.map((opt, i) => {
                                const isSelected = selectedAnswers[q.id] === i;
                                const isCorrect = isSubmitted && i === q.correctAnswer;
                                const isWrong = isSubmitted && isSelected && i !== q.correctAnswer;

                                let containerClass = "border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20";
                                let textClass = "text-gray-400";
                                let indicatorBorder = "border-gray-600";
                                let indicatorBg = "bg-transparent";
                                let indicatorInner = null;

                                if (isSelected) {
                                    containerClass = "border-white/40 bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]";
                                    textClass = "text-white";
                                    indicatorBorder = "border-white";
                                    indicatorInner = <div className="w-2.5 h-2.5 bg-white rounded-full" />;
                                }

                                if (isSubmitted) {
                                    if (isCorrect) {
                                        containerClass = "border-green-500/50 bg-green-500/10";
                                        textClass = "text-green-200";
                                        indicatorBorder = "border-green-500";
                                        indicatorBg = "bg-green-500";
                                        indicatorInner = <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
                                    } else if (isWrong) {
                                        containerClass = "border-red-500/50 bg-red-500/10";
                                        textClass = "text-red-200";
                                        indicatorBorder = "border-red-500";
                                        indicatorBg = "bg-red-500";
                                        indicatorInner = <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
                                    } else {
                                        containerClass = "opacity-40 border-transparent bg-transparent";
                                    }
                                }

                                return (
                                    <button
                                        key={i}
                                        onClick={() => handleSelect(q.id, i)}
                                        disabled={isSubmitted}
                                        className={`w-full text-left p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 group ${containerClass}`}
                                    >
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${indicatorBorder} ${indicatorBg}`}>
                                            {indicatorInner}
                                        </div>
                                        <span className={`font-medium ${textClass} transition-colors`}>{opt}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Explanation Block */}
                        {isSubmitted && q.explanation && (
                            <div className="mt-6 pt-6 border-t border-white/10 animate-fade-in">
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                                        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white mb-1">Explanation</h4>
                                        <p className="text-sm text-gray-400 leading-relaxed">{q.explanation}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-10 flex justify-end">
                {!isSubmitted ? (
                    <button
                        onClick={handleSubmit}
                        disabled={!allAnswered}
                        className={`px-8 py-4 rounded-xl font-bold uppercase tracking-wider transition-all transform hover:scale-105 shadow-xl flex items-center gap-3 ${!allAnswered
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                                : 'bg-primary text-black hover:bg-white hover:text-black shadow-primary/20'
                            }`}
                    >
                        Submit Answers
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </button>
                ) : (
                    <button
                        onClick={onComplete}
                        className="px-8 py-4 bg-white text-black rounded-xl font-bold uppercase tracking-wider transition-all transform hover:scale-105 shadow-xl flex items-center gap-3 hover:bg-gray-200"
                    >
                        Continue to Summary
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                )}
            </div>
        </div>
    );
}
