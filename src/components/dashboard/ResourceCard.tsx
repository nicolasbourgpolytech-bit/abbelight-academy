"use client";

import { ContentItem } from "@/types/content";
import Link from "next/link";

interface ResourceCardProps {
    item: ContentItem;
}

export function ResourceCard({ item }: ResourceCardProps) {
    const isWebinar = item.type === 'webinar';

    // Helper to render tag group
    const renderTagGroup = (label: string, tags: string[] | undefined, colorClass: string, labelColor: string) => {
        if (!tags || tags.length === 0) return null;
        return (
            <div className="flex flex-wrap items-baseline gap-2 mb-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${labelColor} opacity-70`}>{label}:</span>
                {tags.map(tag => (
                    <span
                        key={tag}
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${colorClass}`}
                    >
                        {tag}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <Link href={item.url} className="block group w-full">
            <div className="glass-card p-0 h-full flex flex-col md:flex-row overflow-hidden hover:border-primary/50 transition-all duration-300 hover:-translate-y-1">
                {/* Thumbnail Area */}
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
                </div>

                {/* Content */}
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

                    <p className="text-sm text-gray-400 mb-4">
                        {item.description}
                    </p>

                    {/* Categorized Tags - Grid Layout 2x2 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mb-4">
                        {renderTagGroup("Imaging Method", item.imagingMethod, "bg-brand-green/10 text-brand-green border-brand-green/20", "text-brand-green")}
                        {renderTagGroup("App Domain", item.applicationDomain, "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20", "text-brand-cyan")}
                        {renderTagGroup("Modality", item.modality, "bg-brand-magenta/10 text-brand-magenta border-brand-magenta/20", "text-brand-magenta")}
                        {renderTagGroup("Product", item.product, "bg-brand-orange/10 text-brand-orange border-brand-orange/20", "text-brand-orange")}
                    </div>

                    <div className="border-t border-white/5 pt-4 flex items-center justify-between text-xs text-gray-500 font-medium mt-auto">
                        <div className="flex flex-col gap-1">
                            {/* Explicit Authors */}
                            {item.firstAuthor && (
                                <span className="flex items-center gap-1">
                                    <span className="text-gray-600 uppercase text-[10px]">First Author:</span>
                                    <span className="text-gray-300">{item.firstAuthor}</span>
                                </span>
                            )}
                            {item.lastAuthor && (
                                <span className="flex items-center gap-1">
                                    <span className="text-gray-600 uppercase text-[10px]">Last Author:</span>
                                    <span className="text-gray-300">{item.lastAuthor}</span>
                                </span>
                            )}
                            {/* Fallback if no structured authors */}
                            {!item.firstAuthor && !item.lastAuthor && item.author && (
                                <span>{item.author}</span>
                            )}
                        </div>

                        <span className="text-white group-hover:translate-x-1 transition-transform flex items-center gap-1 self-end">
                            Read more
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </span>
                    </div>
                </div>
            </div>
        </Link >
    );
}
