"use client";

import { ContentItem } from "@/types/content";
import Link from "next/link";

interface ResourceCardProps {
    item: ContentItem;
}

export function ResourceCard({ item }: ResourceCardProps) {
    const isWebinar = item.type === 'webinar';

    // Helper to render tag group with strict alignment
    const renderTagGroup = (label: string, tags: string[] | undefined, colorClass: string, labelColor: string) => {
        if (!tags || tags.length === 0) return null;
        return (
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5">
                <span className={`w-28 shrink-0 text-[10px] font-bold uppercase tracking-wider ${labelColor} opacity-80 pt-0.5 whitespace-nowrap`}>{label}</span>
                <div className="flex flex-wrap gap-1">
                    {tags.map(tag => (
                        <span
                            key={tag}
                            // Reduced font size and padding for compactness
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${colorClass}`}
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <Link
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group w-full"
        >
            <div className="glass-card p-0 h-full flex flex-col overflow-hidden hover:border-primary/50 transition-all duration-300 hover:-translate-y-1">
                {/* Content - Compact Layout */}
                <div className="p-3 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex flex-wrap gap-2 items-center">
                            {item.isNew && (
                                <span className="bg-primary text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow animate-pulse">
                                    NEW
                                </span>
                            )}
                            <span className="text-[10px] text-gray-500 font-mono">
                                {new Date(item.date).toLocaleDateString()}
                            </span>
                        </div>
                    </div>

                    <h3 className="text-base font-bold text-white mb-1 group-hover:text-primary transition-colors leading-tight">
                        {item.title}
                    </h3>

                    {/* Journal and Authors Line */}
                    <div className="mb-2 text-xs text-gray-400 flex flex-wrap items-center gap-2 border-b border-white/5 pb-2">
                        {item.journal && (
                            <span className="font-semibold text-gray-300">{item.journal}</span>
                        )}

                        {(item.firstAuthor || item.lastAuthor) && item.journal && (
                            <span className="text-gray-600">•</span>
                        )}

                        {item.firstAuthor && (
                            <span className="italic">
                                <span className="text-[10px] uppercase tracking-wide text-gray-500 not-italic mr-1">First:</span>
                                {item.firstAuthor}
                            </span>
                        )}

                        {item.lastAuthor && item.firstAuthor && (
                            <span className="text-gray-600">•</span>
                        )}

                        {item.lastAuthor && (
                            <span className="italic">
                                <span className="text-[10px] uppercase tracking-wide text-gray-500 not-italic mr-1">Last:</span>
                                {item.lastAuthor}
                            </span>
                        )}

                        {/* Fallback if no specific authors but generic author exists */}
                        {!item.firstAuthor && !item.lastAuthor && item.author && (
                            <span>{item.author}</span>
                        )}
                    </div>

                    {/* Highly Structured Tag Stack - Compact Single Column */}
                    <div className="flex flex-col gap-1 mt-auto">
                        {renderTagGroup("Imaging Method", item.imagingMethod, "bg-brand-green/10 text-brand-green border-brand-green/20", "text-brand-green")}
                        {renderTagGroup("App Domain", item.applicationDomain, "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20", "text-brand-cyan")}
                        {renderTagGroup("Modality", item.modality, "bg-brand-magenta/10 text-brand-magenta border-brand-magenta/20", "text-brand-magenta")}
                        {renderTagGroup("Product", item.product, "bg-brand-orange/10 text-brand-orange border-brand-orange/20", "text-brand-orange")}
                    </div>
                </div>
            </div>
        </Link >
    );
}
