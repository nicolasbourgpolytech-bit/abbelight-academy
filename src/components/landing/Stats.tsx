interface StatsProps {
    articlesCount: number;
    webinarsCount: number;
    usersCount: number;
    modulesCount: number;
}

export function Stats({ articlesCount, webinarsCount, usersCount, modulesCount }: StatsProps) {
    const stats = [
        { label: "Scientific Articles", value: `${articlesCount}+`, color: "text-primary" },
        { label: "Exclusive Webinars", value: `${webinarsCount}+`, color: "text-secondary" },
        { label: "Active Researchers", value: `${usersCount}+`, color: "text-accent" },
        { label: "Learning Paths", value: `${modulesCount}`, color: "text-warning" },
    ];

    return (
        <section className="relative z-10 py-32 bg-zinc-950 border-t border-white/10 pattern-grid">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, index) => (
                        <div
                            key={stat.label}
                            className="group relative bg-black/60 border border-white/10 p-8 hover:border-white/30 transition-all duration-300"
                        >
                            <div className={`text-5xl font-bold mb-4 ${stat.color} drop-shadow-lg`}>
                                {stat.value}
                            </div>
                            <div className="h-[2px] w-12 bg-white/20 mb-4 group-hover:w-full transition-all duration-500" />
                            <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                {stat.label}
                            </div>

                            {/* Corner Accent */}
                            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-white/20 group-hover:border-white/50 transition-colors" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
