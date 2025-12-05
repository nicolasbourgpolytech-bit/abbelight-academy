"use client";

import { useMemo, useState } from "react";
import { ContentFilterBar } from "@/components/dashboard/ContentFilterBar";
import { ResourceCard } from "@/components/dashboard/ResourceCard";
import { TagFilterSidebar } from "@/components/dashboard/TagFilterSidebar";
import { ContentItem } from "@/types/content";

const MOCK_WEBINARS: ContentItem[] = [
    {
        id: "1",
        title: "Mastering SMLM: From Sample to Image",
        description: "A comprehensive walkthrough of the Single Molecule Localization Microscopy workflow, focusing on sample preparation best practices.",
        date: "2025-11-15",
        type: "webinar",
        url: "/dashboard/webinars/1",
        duration: "45 min",
        tags: ["SMLM", "Sample Prep", "Education"],
        thumbnailUrl: "https://img.youtube.com/vi/YOSO7gJl4tA/maxresdefault.jpg"
    },
    {
        id: "2",
        title: "Live Q&A: Advanced Data Analysis with NEO",
        description: "Our experts answer your questions about spectral demixing and 3D reconstruction using the NEO software suite.",
        date: "2025-10-22",
        type: "webinar",
        url: "/dashboard/webinars/2",
        duration: "60 min",
        tags: ["Software", "NEO", "Analysis"],
        thumbnailUrl: "https://img.youtube.com/vi/_t3tI9w86t4/maxresdefault.jpg"
    },
    {
        id: "3",
        title: "Breakthroughs in Neurobiology using SAFe 360",
        description: "Case studies demonstrating how the SAFe 360 system enables deep tissue imaging at the nanoscale.",
        date: "2025-09-05",
        type: "webinar",
        url: "/dashboard/webinars/3",
        duration: "50 min",
        tags: ["Applications", "Neurobiology", "Hardware"],
        thumbnailUrl: "https://img.youtube.com/vi/Zf0Z8x8y_g0/maxresdefault.jpg"
    },
    {
        id: "4",
        title: "Introduction to Super-Resolution for New Users",
        description: "Getting started with super-resolution microscopy? This session covers the basics and safety protocols.",
        date: "2025-12-01",
        type: "webinar",
        url: "/dashboard/webinars/4",
        duration: "30 min",
        tags: ["Education", "Basics"],
        thumbnailUrl: "https://img.youtube.com/vi/fX8b4t3b5zI/maxresdefault.jpg"
    },
];

const ALL_TAGS = Array.from(new Set(MOCK_WEBINARS.flatMap(w => w.tags || []))).sort();

export default function WebinarsPage() {
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<'date-desc' | 'date-asc' | 'title'>("date-desc");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const filteredAndSortedWebinars = useMemo(() => {
        let result = [...MOCK_WEBINARS];

        // Filter by Search
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(w =>
                w.title.toLowerCase().includes(q) ||
                w.description.toLowerCase().includes(q)
            );
        }

        // Filter by Tags
        if (selectedTags.length > 0) {
            result = result.filter(w =>
                w.tags && w.tags.some(tag => selectedTags.includes(tag))
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
                <h1 className="text-3xl font-bold text-white mb-2">Exclusive Webinars</h1>
                <p className="text-gray-400">Watch replays of our technical sessions and scientific deep-dives.</p>
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
                        {filteredAndSortedWebinars.map(item => (
                            <ResourceCard key={item.id} item={item} />
                        ))}
                    </div>

                    {filteredAndSortedWebinars.length === 0 && (
                        <div className="text-center py-20 text-gray-500 bg-white/5 rounded-2xl border border-white/10">
                            No webinars found matching your criteria.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
