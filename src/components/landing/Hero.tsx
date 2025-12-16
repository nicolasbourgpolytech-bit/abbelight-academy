import Image from "next/image";

interface HeroProps {
    articlesCount: number;
    webinarsCount: number;
    usersCount: number;
    modulesCount: number;
}

export function Hero({ articlesCount, webinarsCount, usersCount, modulesCount }: HeroProps) {
    const stats = [
        { label: "Scientific Articles", value: `${articlesCount}+`, color: "text-primary" },
        { label: "Exclusive Webinars", value: `${webinarsCount}+`, color: "text-secondary" },
        { label: "Active Researchers", value: `${usersCount}+`, color: "text-accent" },
        { label: "Learning Paths", value: `${modulesCount}`, color: "text-warning" },
    ];

    return (
        <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20 bg-black">
            {/* Background Image with Blending */}
            <div className="absolute top-0 right-0 h-full w-[60%] z-0 pointer-events-none overflow-hidden">
                <div className="relative h-full w-full [mask-image:linear-gradient(to_right,transparent,black_40%)]">
                    <Image
                        src="/hero-microscopy.jpg"
                        alt="Nanoscopy Background"
                        fill
                        className="object-contain object-right opacity-80"
                        priority
                    />
                </div>
            </div>

            {/* Left Gradient Blob for extra depth behind text */}
            <div className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />

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

                {/* Stats Grid integrated into Hero */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-12 w-full">
                    {stats.map((stat) => (
                        <div
                            key={stat.label}
                            className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 p-6 rounded-lg text-center hover:border-white/30 transition-all duration-300"
                        >
                            <div className={`text-4xl font-bold mb-2 ${stat.color}`}>
                                {stat.value}
                            </div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col items-center mt-12 animate-bounce">
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
