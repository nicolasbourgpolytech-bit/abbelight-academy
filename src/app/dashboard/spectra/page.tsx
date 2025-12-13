"use client";

import { SpectraChart } from "@/components/spectra/SpectraChart";

export default function SpectraPage() {
    return (
        <div className="flex flex-col min-h-screen bg-[#050505] text-white p-4 md:p-8 overflow-y-auto custom-scrollbar">
            <header className="mb-6 shrink-0">
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                        <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                            Spectra Viewer
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Visualize and compare fluorophore absorption and emission spectra.
                        </p>
                    </div>
                </div>
            </header>

            <main className="flex flex-col gap-6">
                {/* Introduction / Info Section */}
                <div className="mb-4 bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-white mb-2">Interactive Spectral Analysis</h2>
                            <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
                                Explore our comprehensive database of fluorophores, including Alexa Fluor dyes and fluorescent proteins.
                                Compare excitation and emission spectra to check for overlap and crosstalk.
                                <span className="text-primary/80 ml-1 font-medium">Optimized for Abbelight SAFe systems.</span>
                            </p>
                        </div>
                        {/* Optional decorative or functional element could go here */}
                    </div>
                </div>

                <div className="glass-card overflow-hidden relative border border-white/10 shadow-2xl h-[600px] shrink-0">
                    <SpectraChart />
                </div>
            </main>
        </div>
    );
}
