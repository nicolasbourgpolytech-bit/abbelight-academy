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
        <section className="relative min-h-screen flex items-center overflow-hidden bg-black px-8 md:px-20">
            {/* Background Image with Blending (No Rotation) */}
            <div className="absolute top-0 right-0 h-full w-[90%] z-0 pointer-events-none overflow-hidden">
                <div className="relative h-full w-full opacity-80 [mask-image:linear-gradient(to_right,transparent_20%,black_60%)]">
                    <Image
                        src="/hero-microscopy.jpg"
                        alt="Nanoscopy Background"
                        fill
                        className="object-contain object-right"
                        priority
                    />
                </div>
                {/* Extra blending layer for left fade */}
                <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent w-[50%]" />
                {/* Right side darken */}
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-black/10 to-black/80" />
            </div>

            {/* Background Glows */}
            <div className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />

            <div className="z-10 text-left space-y-10 max-w-4xl animate-fade-in relative z-10 w-full">
                <div className="inline-block px-4 py-1.5 border border-primary/30 bg-primary/10 text-primary text-sm font-bold tracking-widest uppercase mb-4">
                    Abbelight Academy
                </div>

                <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-white leading-tight">
                    Master nanoscopy.<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent">
                        Unlock Discovery.
                    </span>
                </h1>

                <p className="text-xl text-gray-400 max-w-xl leading-relaxed">
                    The ultimate learning platform for <span className="text-white font-semibold">Single Molecule Localization Microscopy</span>.
                    Train, learn, and excel with Abbelight technology.
                </p>

                {/* Stats Grid integrated into Hero */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-3xl">
                    {stats.map((stat) => (
                        <div
                            key={stat.label}
                            className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 p-6 rounded-lg text-left hover:border-white/30 transition-all duration-300"
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
            </div>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce z-20">
                <span className="text-white text-sm tracking-widest uppercase mb-2 drop-shadow-md font-semibold">Scroll Down</span>
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
                    className="text-primary w-8 h-8 drop-shadow-md"
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </div>
        </section>
    );
}
