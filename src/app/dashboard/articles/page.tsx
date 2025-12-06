"use client";

import { useMemo, useState, useEffect } from "react";
import { ContentFilterBar } from "@/components/dashboard/ContentFilterBar";
import { ResourceCard } from "@/components/dashboard/ResourceCard";
import { TagFilterSidebar } from "@/components/dashboard/TagFilterSidebar";
import { ContentItem } from "@/types/content";

export default function ArticlesPage() {
    const [articles, setArticles] = useState<ContentItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<'date-desc' | 'date-asc' | 'title'>("date-desc");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    useEffect(() => {
        const fetchArticles = async () => {
            try {
                const res = await fetch('/api/articles');
                const data = await res.json();
                if (res.ok && data.articles) {
                    const mappedArticles: ContentItem[] = data.articles.map((a: any) => ({
                        id: a.id.toString(),
                        title: a.title,
                        description: `${a.journal || 'Journal'} - ${a.first_author || 'Author'}`,
                        date: a.publication_date,
                        type: 'article',
                        url: a.doi_link || '#',
                        author: a.first_author || a.last_author,
                        tags: [
                            ...(Array.isArray(a.application_domain) ? a.application_domain : JSON.parse(a.application_domain || '[]')),
                            ...(Array.isArray(a.imaging_method) ? a.imaging_method : JSON.parse(a.imaging_method || '[]'))
                        ].filter(Boolean),
                        isNew: false
                    }));
                    setArticles(mappedArticles);
                }
            } catch (error) {
                console.error("Failed to fetch articles", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchArticles();
    }, []);

    const allTags = useMemo(() => {
        return Array.from(new Set(articles.flatMap(a => a.tags || []))).sort();
    }, [articles]);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const filteredAndSortedArticles = useMemo(() => {
        let result = [...articles];

        // Filter by Search
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(a =>
                a.title.toLowerCase().includes(q) ||
                a.description.toLowerCase().includes(q) ||
                a.author?.toLowerCase().includes(q)
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
    }, [articles, search, sort, selectedTags]);

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
                    availableTags={allTags}
                    selectedTags={selectedTags}
                    onToggleTag={toggleTag}
                />

                {/* Results Grid */}
                <div className="flex-1">
                    {isLoading ? (
                        <div className="text-center py-20 text-gray-500">Loading articles...</div>
                    ) : (
                        <>
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
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
