"use client";

import { useMemo, useState, useEffect } from "react";
import { ContentFilterBar } from "@/components/dashboard/ContentFilterBar";
import { ResourceCard } from "@/components/dashboard/ResourceCard";
import { TagFilterSidebar } from "@/components/dashboard/TagFilterSidebar";
import { ContentItem } from "@/types/content";

export default function WebinarsPage() {
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<'date-desc' | 'date-asc' | 'title'>("date-desc");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const [webinars, setWebinars] = useState<ContentItem[]>([]);
    const [allTags, setAllTags] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/webinars')
            .then(res => res.json())
            .then(data => {
                if (data.webinars) {
                    const mappedWebinars = data.webinars.map((w: any) => ({
                        id: w.id.toString(),
                        title: w.title,
                        description: w.description || "",
                        date: w.date || w.created_at || new Date().toISOString(),
                        type: "webinar",
                        url: `/dashboard/webinars/${w.id}`,
                        duration: w.duration,
                        tags: typeof w.tags === 'string' ? JSON.parse(w.tags) : w.tags || [],
                        isNew: w.is_new,
                        thumbnailUrl: w.video_url?.includes('youtube') ? `https://img.youtube.com/vi/${w.video_url.split('v=')[1]?.split('&')[0]}/maxresdefault.jpg` : "https://images.unsplash.com/photo-1550751827-4bd374c3f58b",
                        ...w // spread other props just in case
                    }));
                    setWebinars(mappedWebinars);

                    // Generate tags dynamically from fetched data
                    const tags = new Set<string>();
                    mappedWebinars.forEach((w: any) => {
                        if (Array.isArray(w.tags)) w.tags.forEach((t: string) => tags.add(t));
                    });
                    setAllTags(Array.from(tags).sort());
                }
            })
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }, []);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const filteredAndSortedWebinars = useMemo(() => {
        let result = [...webinars];

        // Filter by Search
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(w =>
                w.title.toLowerCase().includes(q) ||
                w.description?.toLowerCase().includes(q)
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
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;

            if (sort === 'title') {
                return a.title.localeCompare(b.title);
            } else if (sort === 'date-asc') {
                return dateA - dateB;
            } else {
                return dateB - dateA;
            }
        });

        return result;
    }, [search, sort, selectedTags, webinars]);

    if (isLoading) {
        return <div className="p-12 text-center text-gray-500 animate-pulse">Loading Webinars...</div>;
    }

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
                    availableTags={allTags}
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
