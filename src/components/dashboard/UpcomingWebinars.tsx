"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Webinar {
    id: number;
    title: string;
    date: string; // ISO string
    description: string;
    duration: string;
    // other fields...
}

export function UpcomingWebinars() {
    const [webinars, setWebinars] = useState<Webinar[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/webinars')
            .then(res => res.json())
            .then(data => {
                if (data.webinars) {
                    // Filter for future dates
                    const now = new Date();
                    const pending = data.webinars
                        .filter((w: any) => new Date(w.date) > now)
                        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .slice(0, 2); // Take top 2
                    setWebinars(pending);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }, []);

    if (isLoading) return <div className="animate-pulse h-40 bg-white/5 rounded-lg"></div>;
    if (webinars.length === 0) return null;

    return (
        <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-widest">
                <span className="w-2 h-2 bg-secondary rounded-full"></span>
                Upcoming Webinars
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {webinars.map(webinar => (
                    <div key={webinar.id} className="glass-card p-6 border-white/5 hover:border-secondary/50 transition-colors group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-50 text-[100px] leading-none font-bold text-white/5 -rotate-12 select-none -translate-y-4 translate-x-4">
                            📅
                        </div>
                        <div className="relative z-10">
                            <div className="text-xs font-bold text-secondary mb-2 uppercase tracking-widest flex items-center gap-2">
                                <span>{new Date(webinar.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="w-1 h-1 bg-white/50 rounded-full"></span>
                                <span>{webinar.duration}</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{webinar.title}</h3>
                            <p className="text-gray-400 text-sm mb-4 line-clamp-2">{webinar.description}</p>

                            <a href={webinar.title.includes('Zoom') ? "#" : `/webinars/${webinar.id}`} className="inline-flex items-center text-sm font-bold text-secondary hover:text-white transition-colors uppercase tracking-wider">
                                Register Now <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
