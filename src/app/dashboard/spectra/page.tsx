"use client";

import { SpectraChart } from "@/components/spectra/SpectraChart";

export default function SpectraPage() {
    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] bg-[#050505] text-white p-4 md:p-8">
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

            <main className="flex-1 flex flex-col min-h-0">
                <div className="glass-card flex-1 mb-6 overflow-hidden">
                    <SpectraChart />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/30 transition-colors">
                        <h3 className="text-base font-semibold text-white mb-1">Reference Database</h3>
                        <p className="text-xs text-gray-400">
                            Includes commonly used Alexa Fluor dyes, fluorescent proteins, and nuclear stains.
                        </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/30 transition-colors">
                        <h3 className="text-base font-semibold text-white mb-1">Interactive Comparison</h3>
                        <p className="text-xs text-gray-400">
                            Check for spectral overlap (cross-talk) to optimize multicolor imaging.
                        </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/30 transition-colors">
                        <h3 className="text-base font-semibold text-white mb-1">Abbelight Optimized</h3>
                        <p className="text-xs text-gray-400">
                            Tailored optimal excitation lines for Abbelight SAFe systems.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
