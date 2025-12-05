"use client";

import { ContentItem } from "@/types/content";
import Link from "next/link";

interface ResourceCardProps {
    item: ContentItem;
}

export function ResourceCard({ item }: ResourceCardProps) {
    const isWebinar = item.type === 'webinar';

    return (
        <Link href={item.url} className="block group h-full">
            <div className="glass-card p-0 h-full flex flex-col overflow-hidden hover:border-primary/50 transition-all duration-300 hover:-translate-y-1">
                {/* Thumbnail Area */}
                <div className={`h-48 w-full relative bg-gradient-to-br ${isWebinar ? 'from-purple-900 to-black' : 'from-blue-900 to-black'} flex items-center justify-center`}>
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

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${isWebinar ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                            {item.type}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                            {new Date(item.date).toLocaleDateString()}
                        </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {item.title}
                    </h3>
                    <p className="text-sm text-gray-400 line-clamp-3 mb-4 flex-1">
                        {item.description}
                    </p>

                    <div className="border-t border-white/5 pt-4 flex items-center justify-between text-xs text-gray-500 font-medium">
                        <span>{isWebinar ? item.duration : item.author}</span>
                        <span className="text-white group-hover:translate-x-1 transition-transform">Read more &rarr;</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
