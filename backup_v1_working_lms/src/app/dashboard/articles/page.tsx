"use client";

import { useMemo, useState } from "react";
import { ContentFilterBar } from "@/components/dashboard/ContentFilterBar";
import { ResourceCard } from "@/components/dashboard/ResourceCard";
import { TagFilterSidebar } from "@/components/dashboard/TagFilterSidebar";
import { ContentItem } from "@/types/content";

const MOCK_ARTICLES: ContentItem[] = [
    {
        id: "1",
        title: "Understanding dSTORM Blink Statistics",
        description: "A deep dive into the photophysics of fluorophores and how to optimize blinking for dSTORM.",
        date: "2025-11-20",
        type: "article",
        url: "#",
        author: "Dr. Emily Chen",
        tags: ["dSTORM", "Physics", "Education"]
    },
    {
        id: "2",
        title: "Optimizing Buffer Conditions for Long-Term Imaging",
        description: "Protocol for preparing buffers that reduce photobleaching during extended acquisition sessions.",
        date: "2025-10-15",
        type: "article",
        url: "#",
        author: "Abbelight R&D",
        tags: ["Sample Prep", "Reagents", "Protocols"]
    },
    {
        id: "3",
        title: "Data Processing Pipeline: From Raw to Render",
        description: "Step-by-step guide on how the NEO software processes raw camera frames into super-resolved images.",
        date: "2025-09-10",
        type: "article",
        url: "#",
        author: "Support Team",
        tags: ["Software", "NEO", "Data Analysis"]
    },
    {
        id: "4",
        title: "Troubleshooting Common Labeling Artifacts",
        description: "How to identify and fix common issues such as non-specific binding and antibody aggregation.",
        date: "2025-08-05",
        type: "article",
        url: "#",
        author: "Dr. House",
        tags: ["Troubleshooting", "Sample Prep"]
    },
    {
        id: "5",
        title: "Case Study: Synaptic Vesicle Tracking",
        description: "Tracking dynamics of synaptic vesicles in live neurons using high-speed SMLM.",
        date: "2025-12-02",
        type: "article",
        url: "#",
        author: "Guest Researcher",
        tags: ["Applications", "Neurobiology", "Case Study"]
    },
];

const ALL_TAGS = Array.from(new Set(MOCK_ARTICLES.flatMap(a => a.tags || []))).sort();


export default function ArticlesPage() {
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<'date-desc' | 'date-asc' | 'title'>("date-desc");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const filteredAndSortedArticles = useMemo(() => {
        let result = [...MOCK_ARTICLES];

        // Filter by Search
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(a =>
                a.title.toLowerCase().includes(q) ||
                a.description.toLowerCase().includes(q)
            );
        }

        // Filter by Tags
        if (selectedTags.length > 0) {
            result = result.filter(a =>
                a.tags && a.tags.some(tag => selectedTags.includes(tag))
            );
        }

        // Sort
        result.sort((a, b) => {
            if (sort === 'title') {
                return a.title.localeCompare(b.title);
            } else if (sort === 'date-asc') {
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            } else {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            }
        });

        return result;
    }, [search, sort, selectedTags]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="border-b border-white/10 pb-6">
                <h1 className="text-3xl font-bold text-white mb-2">Scientific Articles</h1>
                <p className="text-gray-400">Access our knowledge base of protocols, technical notes, and research papers.</p>
            </div>

            <ContentFilterBar onSearch={setSearch} onSortChange={setSort} />

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar */}
                <TagFilterSidebar
                    availableTags={ALL_TAGS}
                    selectedTags={selectedTags}
                    onToggleTag={toggleTag}
                />

                {/* Results Grid */}
                <div className="flex-1">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredAndSortedArticles.map(item => (
                            <ResourceCard key={item.id} item={item} />
                        ))}
                    </div>

                    {filteredAndSortedArticles.length === 0 && (
                        <div className="text-center py-20 text-gray-500 bg-white/5 rounded-2xl border border-white/10">
                            No articles found matching your criteria.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
