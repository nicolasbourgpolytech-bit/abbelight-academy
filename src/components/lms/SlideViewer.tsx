"use client";

import { useState } from "react";
import { Slide } from "@/types/lms";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Setup PDF Worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SlideViewerProps {
    slides: Slide[] | undefined;
    pdfUrl?: string; // New prop for PDF mode
    onComplete: () => void;
}

export function SlideViewer({ slides, pdfUrl, onComplete }: SlideViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [numPages, setNumPages] = useState<number>(0);

    const isPdfMode = !!pdfUrl;
    const totalSlides = isPdfMode ? numPages : (slides?.length || 0);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    const nextSlide = () => {
        if (currentIndex < totalSlides - 1) {
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

    // Calculate progress percentage
    const progress = totalSlides > 0 ? Math.round(((currentIndex + 1) / totalSlides) * 100) : 0;

    // Configure PDF options suitable for standard builds
    const options = {
        cMapUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-8 animate-fade-in relative bg-gray-900">

            {/* Slide Container */}
            <div className="w-full max-w-[90%] md:h-[80vh] bg-white text-black rounded-xl overflow-hidden shadow-2xl relative flex flex-col">

                {/* Header */}
                <div className="bg-gray-100 p-4 border-b border-gray-200 flex justify-between items-center z-10">
                    <h3 className="font-bold text-gray-700">
                        {isPdfMode ? 'Presentation Slides' : slides?.[currentIndex]?.title}
                    </h3>
                    <span className="text-xs font-mono text-gray-500">
                        {currentIndex + 1} / {totalSlides}
                    </span>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 relative flex items-center justify-center bg-gray-50 overflow-hidden">
                    {isPdfMode ? (
                        <div className="h-full w-full flex items-center justify-center overflow-auto">
                            <Document
                                file={pdfUrl}
                                onLoadSuccess={onDocumentLoadSuccess}
                                onLoadError={(error) => console.error("PDF Document Load Error:", error)}
                                className="flex items-center justify-center"
                                loading={<div className="text-primary animate-pulse">Loading PDF...</div>}
                                error={<div className="text-red-500 font-bold p-4">Failed to load PDF document.</div>}
                                options={options}
                            >
                                <Page
                                    pageNumber={currentIndex + 1}
                                    className="max-w-full max-h-full shadow-lg"
                                    width={window.innerWidth > 768 ? 800 : window.innerWidth * 0.9}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                    onLoadError={(error) => console.error("PDF Page Load Error:", error)}
                                    error={<div className="text-red-500 p-4 bg-red-100 rounded">Error loading page {currentIndex + 1}.</div>}
                                />
                            </Document>
                        </div>
                    ) : (
                        slides && slides[currentIndex] ? (
                            slides[currentIndex].imageUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                    src={slides[currentIndex].imageUrl}
                                    alt={slides[currentIndex].title}
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <div className="p-12 text-center max-w-2xl">
                                    <h2 className="text-4xl font-bold mb-6 text-primary">{slides[currentIndex].title}</h2>
                                    {slides[currentIndex].content && (
                                        <div className="text-xl text-gray-600 leading-relaxed whitespace-pre-wrap text-left">
                                            {slides[currentIndex].content}
                                        </div>
                                    )}
                                </div>
                            )
                        ) : (
                            <div className="text-gray-500">No content available</div>
                        )
                    )}
                </div>

                {/* Overlay Controls (Hover) */}
                <div className="absolute inset-0 flex items-center justify-between p-4 pointer-events-none z-20">
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
                        {currentIndex === totalSlides - 1 ? (
                            <svg className="w-6 h-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        )}
                    </button>
                </div>

                {/* Bottom Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 z-10">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>

            </div>

            {/* Helper Text */}
            <p className="text-gray-500 mt-4 text-sm z-0">
                Use arrows to navigate. Complete all slides to finish the chapter.
            </p>
        </div>
    );
}
