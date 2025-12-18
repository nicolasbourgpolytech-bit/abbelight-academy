"use client";

import PSFSimulator from "@/components/psf/PSFSimulator";

export default function PSFSimulationPage() {
    return (
        <div className="flex flex-col min-h-screen bg-[#050505] text-white p-4 md:p-8 overflow-hidden">
            <header className="mb-6 shrink-0">
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                        {/* Aperture Icon */}
                        <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                            PSF Simulator
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Interactive Point Spread Function simulation using Vectorial Diffraction Theory.
                        </p>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-[1600px] mx-auto flex flex-col gap-6">
                {/* Introduction / Info Section */}
                <div className="mb-4 bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    <div className="relative z-10">
                        <h2 className="text-lg font-semibold text-white mb-2">High-Accuracy Vectorial PSF Simulation</h2>
                        <div className="text-sm text-gray-400 max-w-4xl leading-relaxed space-y-2">
                            <p>
                                This interactive simulation calculates the PSF and BFP patterns using the <span className="text-white font-medium">rigorous vectorial physical model</span> by <span className="text-white font-medium">W. E. Moerner et al. (Nobel Prize 2014)</span>.
                            </p>
                            <p>
                                Unlike simple scalar approximations, this model naturally handles <span className="text-primary/80">high-NA polarization effects</span>, <span className="text-primary/80">dipole orientation</span>, and <span className="text-primary/80">interface physics (SAF)</span>. It also enables the integration of complex aberrations and phase masks.
                            </p>
                            <p className="pt-2 text-xs border-t border-white/10 mt-3 inline-block">
                                <span className="text-gray-500 uppercase tracking-widest mr-2">Reference:</span>
                                <a
                                    href="https://pubs.acs.org/doi/10.1021/jp501778z"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/80 hover:underline transition-colors"
                                >
                                    Three-Dimensional Point Spread Functions for Single-Molecule Fluorescence Imaging (ACS Link)
                                </a>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-h-0">
                    <PSFSimulator />
                </div>
            </main>
        </div>
    );
}
