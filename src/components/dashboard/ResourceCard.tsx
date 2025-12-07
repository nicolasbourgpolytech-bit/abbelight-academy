"use client";

import { ContentItem } from "@/types/content";
import Link from "next/link";

interface ResourceCardProps {
    item: ContentItem;
}

// Deterministic color assignment based on string hash
const getTagColor = (tag: string) => {
    const colors = [
        'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20',
        'bg-brand-green/10 text-brand-green border-brand-green/20',
        'bg-brand-magenta/10 text-brand-magenta border-brand-magenta/20',
        'bg-brand-orange/10 text-brand-orange border-brand-orange/20',
    ];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

export function ResourceCard({ item }: ResourceCardProps) {
    const isWebinar = item.type === 'webinar';

    return (
        <Link href={item.url} className="block group w-full">
            <div className="glass-card p-0 h-full flex flex-col md:flex-row overflow-hidden hover:border-primary/50 transition-all duration-300 hover:-translate-y-1">
                {/* Thumbnail Area - Left Side on Desktop */}
                <div className={`h-48 md:h-auto md:w-64 relative flex-shrink-0 bg-gradient-to-br ${isWebinar ? 'from-purple-900 to-black' : 'from-blue-900 to-black'} flex items-center justify-center`}>
                    {item.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                    ) : (
                        <div className="text-white/20">
                            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                                {isWebinar ? (
                                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                ) : (
                                    <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                )}
                            </svg>
                        </div>
                    )}

                    {/* Play Button Overlay for Webinars */}
                    {isWebinar && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-transparent transition-colors">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black pl-1 shadow-lg group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content - Right Side */}
                <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-wrap gap-2">
                            {item.isNew && (
                                <span className="bg-primary text-black text-[10px] font-bold px-2 py-0.5 rounded shadow animate-pulse">
                                    NEW
                                </span>
                            )}
                            <span className="text-xs text-gray-400 font-mono">
                                {new Date(item.date).toLocaleDateString()}
                            </span>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors">
                        {item.title}
                    </h3>

                    <p className="text-sm text-gray-400 mb-4 flex-1">
                        {item.description}
                    </p>

                    {/* Colorful Tags */}
                    {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {item.tags.map(tag => (
                                <span
                                    key={tag}
                                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${getTagColor(tag)}`}
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="border-t border-white/5 pt-4 flex items-center justify-between text-xs text-gray-500 font-medium mt-auto">
                        <span>{isWebinar ? item.duration : item.author}</span>
                        <span className="text-white group-hover:translate-x-1 transition-transform flex items-center gap-1">
                            Read more
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </span>
                    </div>
                </div>
            </div>
        </Link >
    );
}
