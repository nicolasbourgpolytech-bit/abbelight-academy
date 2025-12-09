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
        <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-8 animate-fade-in relative z-10">

            {/* Slide Container - Glassmorphism Card */}
            <div className="w-full max-w-[95%] h-[85vh] bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col group/container hover:border-white/20 transition-colors">

                {/* Header */}
                <div className="bg-black/60 p-4 border-b border-white/10 flex justify-between items-center z-10 shrink-0">
                    <h3 className="font-bold text-gray-200 tracking-wide">
                        {isPdfMode ? 'Presentation Slides' : slides?.[currentIndex]?.title}
                    </h3>
                    <div className="flex flex-col items-end">
                        <span className="text-xs font-mono text-primary font-bold">
                            SLIDE {currentIndex + 1} / {totalSlides}
                        </span>
                        {isPdfMode && <span className="text-[10px] text-gray-600">PDF RENDERER v{pdfjs.version}</span>}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 relative flex items-center justify-center bg-black/20 overflow-hidden" ref={containerRef}>
                    {isPdfMode ? (
                        <div className="h-full w-full flex items-center justify-center overflow-auto relative scrollbar-hide">
                            {/* Show explicit error if exists */}
                            {pageError && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                                    <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-xl max-w-lg shadow-xl">
                                        <h3 className="text-red-400 font-bold text-lg mb-2 flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            Rendering Error
                                        </h3>
                                        <p className="text-gray-300 font-mono text-sm break-words mb-4">{pageError.message}</p>
                                        <p className="text-gray-500 text-xs text-center">
                                            Rendering via PDF.js worker.<br />
                                            If this persists, the file may be corrupted or incompatible with web rendering.
                                        </p>
                                        <button
                                            onClick={() => window.location.reload()}
                                            className="mt-4 px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/50 text-xs font-bold rounded hover:bg-red-600/40 transition-colors"
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
                                    className="flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity"
                                    loading={<div className="text-primary animate-pulse font-mono flex items-center gap-2"><div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" /> Loading PDF...</div>}
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
                                            className="shadow-2xl shadow-black max-w-full"
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
                                    className="w-full h-full object-contain drop-shadow-2xl"
                                />
                            ) : (
                                <div className="p-12 text-center max-w-2xl bg-black/40 backdrop-blur-md rounded-2xl border border-white/5">
                                    <h2 className="text-4xl font-bold mb-6 text-primary tracking-tight">{slides[currentIndex].title}</h2>
                                    {slides[currentIndex].content && (
                                        <div className="text-xl text-gray-300 leading-relaxed whitespace-pre-wrap text-left font-light">
                                            {slides[currentIndex].content}
                                        </div>
                                    )}
                                </div>
                            )
                        ) : (
                            <div className="text-gray-500 font-mono">No content available</div>
                        )
                    )}
                </div>

                {/* Overlay Controls (Hover) in Slide Container */}
                <div className="absolute inset-0 flex items-center justify-between p-4 pointer-events-none z-20">
                    <button
                        onClick={prevSlide}
                        disabled={currentIndex === 0}
                        className={`pointer-events-auto p-4 rounded-full bg-black/40 border border-white/10 hover:bg-primary/20 hover:border-primary/50 text-white backdrop-blur-lg transition-all transform hover:scale-110 shadow-lg ${currentIndex === 0 ? 'opacity-0 cursor-default translate-x-[-20px]' : 'opacity-100'}`}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>

                    <button
                        onClick={nextSlide}
                        className="pointer-events-auto p-4 rounded-full bg-[#00CAF8]/20 border border-[#00CAF8]/20 hover:bg-[#00CAF8]/40 hover:border-[#00CAF8]/50 text-white backdrop-blur-lg transition-all transform hover:scale-110 shadow-[0_0_15px_rgba(0,202,248,0.2)] hover:shadow-[0_0_25px_rgba(0,202,248,0.4)]"
                    >
                        {currentIndex === totalSlides - 1 ? (
                            <svg className="w-6 h-6 text-[#00D296]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        )}
                    </button>
                </div>

                {/* Bottom Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-10">
                    <div className="h-full bg-[#00CAF8] shadow-[0_0_10px_rgba(0,202,248,0.8)] transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>

            </div>

            {/* Helper Text */}
            <p className="text-gray-500 mt-4 text-xs font-mono tracking-widest uppercase z-0 opacity-60">
                Use arrows to navigate • Complete to finish
            </p>
        </div>
    );
}
