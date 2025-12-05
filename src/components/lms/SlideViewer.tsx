"use client";

import { useState } from "react";
import { Slide } from "@/types/lms";

interface SlideViewerProps {
    slides: Slide[];
    onComplete: () => void;
}

export function SlideViewer({ slides, onComplete }: SlideViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextSlide = () => {
        if (currentIndex < slides.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Reached the end
            onComplete();
        }
    };

    const prevSlide = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const currentSlide = slides[currentIndex];

    // Calculate progress percentage
    const progress = Math.round(((currentIndex + 1) / slides.length) * 100);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-8 animate-fade-in relative">

            {/* Slide Container */}
            <div className="w-full max-w-[90%] aspect-[16/9] md:h-[80vh] bg-white text-black rounded-xl overflow-hidden shadow-2xl relative flex flex-col">

                {/* Header (Optional, for context) */}
                <div className="bg-gray-100 p-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">{currentSlide.title}</h3>
                    <span className="text-xs font-mono text-gray-500">{currentIndex + 1} / {slides.length}</span>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 relative flex items-center justify-center bg-gray-50">
                    {currentSlide.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={currentSlide.imageUrl}
                            alt={currentSlide.title}
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="p-12 text-center max-w-2xl">
                            <h2 className="text-4xl font-bold mb-6 text-primary">{currentSlide.title}</h2>
                            {currentSlide.content && (
                                <div className="text-xl text-gray-600 leading-relaxed whitespace-pre-wrap text-left">
                                    {currentSlide.content}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Overlay Controls (Hover) */}
                <div className="absolute inset-0 flex items-center justify-between p-4 pointer-events-none">
                    <button
                        onClick={prevSlide}
                        disabled={currentIndex === 0}
                        className={`pointer-events-auto p-3 rounded-full bg-black/10 hover:bg-black/30 text-black backdrop-blur transition-all ${currentIndex === 0 ? 'opacity-0 cursor-default' : 'opacity-100'}`}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>

                    <button
                        onClick={nextSlide}
                        className="pointer-events-auto p-3 rounded-full bg-primary/20 hover:bg-primary/40 text-black backdrop-blur transition-all"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>

                {/* Bottom Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>

            </div>

            {/* Helper Text */}
            <p className="text-gray-500 mt-4 text-sm">
                Use arrows to navigate. Complete all slides to finish the chapter.
            </p>
        </div>
    );
}
