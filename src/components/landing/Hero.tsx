export function Hero() {
    return (
        <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20 bg-black">
            {/* Geometric Background Element (Right Side) */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] translate-x-1/3 -translate-y-1/4 opacity-20 pointer-events-none">
                <div className="absolute inset-0 border-[1px] border-secondary rounded-full animate-spin-slow" />
                <div className="absolute inset-[40px] border-[1px] border-primary rounded-full animate-spin-slow duration-[25000ms]" />
                <div className="absolute inset-[80px] border-[1px] border-accent rounded-full animate-spin-slow duration-[30000ms]" />
                <div className="absolute inset-[120px] border-[1px] border-warning rounded-full animate-spin-slow duration-[35000ms]" />
                {/* Dotted pattern rings */}
                <div className="absolute inset-[200px] border-[4px] border-dotted border-white/20 rounded-full animate-spin-slow duration-[60000ms]" />
            </div>

            {/* Left Gradient Blob */}
            <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="z-10 text-center space-y-10 p-8 max-w-5xl animate-fade-in relative">
                <div className="inline-block px-4 py-1.5 border border-primary/30 bg-primary/10 text-primary text-sm font-bold tracking-widest uppercase mb-6">
                    Abbelight Academy
                </div>

                <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-white">
                    Master nanoscopy.<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent">
                        Unlock Discovery.
                    </span>
                </h1>

                <p className="text-xl text-gray-400 text-center max-w-2xl mx-auto leading-relaxed">
                    The ultimate learning platform for <span className="text-white font-semibold">Single Molecule Localization Microscopy</span>.
                    Train, learn, and excel with Abbelight technology.
                </p>

                <div className="flex flex-col items-center mt-20 animate-bounce">
                    <span className="text-gray-500 text-sm tracking-widest uppercase mb-2">Scroll Down</span>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary w-8 h-8"
                    >
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </div>
            </div>


        </section>
    );
}
