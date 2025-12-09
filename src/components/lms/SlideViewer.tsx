"use client";

import { useState, useEffect, useRef } from "react";
import { Slide } from "@/types/lms";
import { Document, Page, pdfjs } from 'react-pdf';
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

interface SlideViewerProps {
    slides: Slide[] | undefined;
    pdfUrl?: string; // New prop for PDF mode
    onComplete: () => void;
}

export function SlideViewer({ slides, pdfUrl, onComplete }: SlideViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [numPages, setNumPages] = useState<number>(0);
    const [pageError, setPageError] = useState<Error | null>(null);

    // Container dimensions for responsive PDF rendering
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

    const isPdfMode = !!pdfUrl;
    const totalSlides = isPdfMode ? numPages : (slides?.length || 0);

    // Initialize Worker & Setup ResizeObserver
    useEffect(() => {
        // Ensure worker is set up only on client side
        if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
            pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        }

        const observeTarget = containerRef.current;
        if (!observeTarget) return;

        const resizeObserver = new ResizeObserver((entries) => {
            if (entries[0]) {
                const { width, height } = entries[0].contentRect;
                setContainerDimensions({ width, height });
            }
        });

        resizeObserver.observe(observeTarget);

        return () => {
            if (observeTarget) resizeObserver.unobserve(observeTarget);
        };
    }, []);


    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const onDocumentLoadSuccess = (document: any) => {
        setNumPages(document.numPages);
        setPageError(null);
    };

    const nextSlide = () => {
        if (currentIndex < totalSlides - 1) {
            setCurrentIndex(prev => prev + 1);
            setPageError(null); // Reset error on slide change
        } else {
            // Reached the end
            onComplete();
        }
    };

    const prevSlide = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setPageError(null); // Reset error on slide change
        }
    };

    // Calculate progress percentage
    const progress = totalSlides > 0 ? Math.round(((currentIndex + 1) / totalSlides) * 100) : 0;

    // Configure PDF options suitable for standard builds
    const options = {
        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
        cMapPacked: true,
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-8 animate-fade-in relative bg-gray-900">

            {/* Slide Container */}
            <div className="w-full max-w-[95%] h-[85vh] bg-white text-black rounded-xl overflow-hidden shadow-2xl relative flex flex-col">

                {/* Header */}
                <div className="bg-gray-100 p-4 border-b border-gray-200 flex justify-between items-center z-10 shrink-0">
                    <h3 className="font-bold text-gray-700">
                        {isPdfMode ? 'Presentation Slides' : slides?.[currentIndex]?.title}
                    </h3>
                    <div className="flex flex-col items-end">
                        <span className="text-xs font-mono text-gray-500">
                            {currentIndex + 1} / {totalSlides}
                        </span>
                        {isPdfMode && <span className="text-[10px] text-gray-400">v{pdfjs.version}</span>}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 relative flex items-center justify-center bg-gray-50 overflow-hidden" ref={containerRef}>
                    {isPdfMode ? (
                        <div className="h-full w-full flex items-center justify-center overflow-auto relative">
                            {/* Show explicit error if exists */}
                            {pageError && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm p-4">
                                    <div className="bg-red-50 border border-red-200 p-6 rounded-xl max-w-lg shadow-xl">
                                        <h3 className="text-red-600 font-bold text-lg mb-2">Rendering Error</h3>
                                        <p className="text-gray-800 font-mono text-sm break-words mb-4">{pageError.message}</p>
                                        <p className="text-gray-500 text-xs text-center">
                                            Rendering via PDF.js worker.<br />
                                            If this persists, the file may be corrupted or incompatible with web rendering.
                                        </p>
                                        <button
                                            onClick={() => window.location.reload()}
                                            className="mt-4 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700"
                                        >
                                            Force Reload Page
                                        </button>
                                    </div>
                                </div>
                            )}

                            <ErrorBoundary maxRetries={3}>
                                <Document
                                    file={pdfUrl}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    onLoadError={(error) => setPageError(error)}
                                    className="flex items-center justify-center"
                                    loading={<div className="text-primary animate-pulse">Loading PDF...</div>}
                                    error={null} // Handled by pageError state above
                                    options={options}
                                >
                                    {/* Responsive Page */}
                                    {containerDimensions.height > 0 && (
                                        <Page
                                            key={`page_${currentIndex + 1}`}
                                            pageNumber={currentIndex + 1}
                                            // Prioritize height to fit the screen (slide deck style), fallback to width if needed
                                            height={containerDimensions.height}
                                            className="shadow-lg max-w-full"
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                            onLoadError={(error) => setPageError(error)}
                                            error={null}
                                        />
                                    )}
                                </Document>
                            </ErrorBoundary>
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

                {/* Overlay Controls (Hover) in Slide Container */}
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
