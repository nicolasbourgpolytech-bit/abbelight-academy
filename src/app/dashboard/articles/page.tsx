"use client";

import { useMemo, useState, useEffect } from "react";
import { ContentFilterBar } from "@/components/dashboard/ContentFilterBar";
import { ResourceCard } from "@/components/dashboard/ResourceCard";
import { MultiCategoryFilterSidebar } from "@/components/dashboard/MultiCategoryFilterSidebar";
import { ContentItem } from "@/types/content";

export default function ArticlesPage() {
    const [articles, setArticles] = useState<ContentItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<'date-desc' | 'date-asc' | 'title'>("date-desc");

    // Advanced Filter State: { "categoryId": ["option1", "option2"] }
    const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});

    useEffect(() => {
        const fetchArticles = async () => {
            try {
                const res = await fetch('/api/articles');
                const data = await res.json();
                if (res.ok && data.articles) {
                    const mappedArticles: ContentItem[] = data.articles.map((a: any) => {
                        // Helper to safely parse JSON arrays and flatten nested JSON strings
                        const parseArray = (val: any) => {
                            let arr = Array.isArray(val) ? val : JSON.parse(val || '[]');
                            return arr.flatMap((item: any) => {
                                if (typeof item === 'string' && item.trim().startsWith('[') && item.trim().endsWith(']')) {
                                    try {
                                        const parsed = JSON.parse(item);
                                        return Array.isArray(parsed) ? parsed : item;
                                    } catch { return item; }
                                }
                                return item;
                            }).filter(Boolean);
                        };

                        const appDomains = parseArray(a.application_domain);
                        const imgMethods = parseArray(a.imaging_method);
                        const modalities = parseArray(a.abbelight_imaging_modality);
                        const products = parseArray(a.abbelight_product);

                        return {
                            id: a.id.toString(),
                            title: a.title,
                            description: `${a.journal || 'Journal'} - ${a.first_author || 'Author'}`,
                            date: a.publication_date,
                            type: 'article',
                            url: a.doi_link || '#',
                            author: a.first_author || a.last_author,
                            tags: [...appDomains, ...imgMethods].slice(0, 3),
                            isNew: false,

                            // Extended Metadata for Filtering
                            applicationDomain: appDomains,
                            imagingMethod: imgMethods,
                            modality: modalities,
                            product: products,
                            journal: a.journal,
                            firstAuthor: a.first_author,
                            lastAuthor: a.last_author,
                            customer: a.abbelight_customer
                        };
                    });
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

    const filterCategories = useMemo(() => {
        if (articles.length === 0) return [];

        const extractOptions = (key: keyof ContentItem, isArray = false) => {
            const options = new Set<string>();
            articles.forEach(a => {
                const val = a[key];
                if (!val) return;
                if (isArray && Array.isArray(val)) {
                    val.forEach(v => options.add(v as string));
                } else if (!isArray && typeof val === 'string') {
                    options.add(val);
                }
            });
            return Array.from(options).sort();
        };

        return [
            { id: 'applicationDomain', title: 'Application Domain', options: extractOptions('applicationDomain', true) },
            { id: 'imagingMethod', title: 'Imaging Method', options: extractOptions('imagingMethod', true) },
            { id: 'modality', title: 'Modality', options: extractOptions('modality', true) },
            { id: 'product', title: 'Product', options: extractOptions('product', true) },
            { id: 'journal', title: 'Journal', options: extractOptions('journal') },
            { id: 'firstAuthor', title: 'First Author', options: extractOptions('firstAuthor') },
            { id: 'lastAuthor', title: 'Last Author', options: extractOptions('lastAuthor') },
            { id: 'customer', title: 'Customer', options: extractOptions('customer') }
        ].filter(c => c.options.length > 0);
    }, [articles]);

    const handleToggleFilter = (categoryId: string, option: string) => {
        setSelectedFilters(prev => {
            const current = prev[categoryId] || [];
            if (current.includes(option)) {
                const next = current.filter(o => o !== option);
                return next.length > 0 ? { ...prev, [categoryId]: next } : { ...prev, [categoryId]: [] };
            } else {
                return { ...prev, [categoryId]: [...current, option] };
            }
        });
    };

    const handleClearAll = () => setSelectedFilters({});

    // Filter Logic Helper (matches an article against filters)
    const matchesFilters = (article: ContentItem, filters: Record<string, string[]>) => {
        return Object.keys(filters).every(categoryId => {
            const selectedOptions = filters[categoryId];
            if (!selectedOptions || selectedOptions.length === 0) return true;

            const val = article[categoryId as keyof ContentItem];
            if (!val) return false;

            if (Array.isArray(val)) {
                return val.some(v => selectedOptions.includes(v));
            } else {
                return selectedOptions.includes(val as string);
            }
        });
    };

    // Filter by Search & Global Filters for list display
    const filteredAndSortedArticles = useMemo(() => {
        let result = [...articles];

        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(a =>
                a.title.toLowerCase().includes(q) ||
                a.description.toLowerCase().includes(q) ||
                a.author?.toLowerCase().includes(q) ||
                (a.journal && a.journal.toLowerCase().includes(q))
            );
        }

        result = result.filter(a => matchesFilters(a, selectedFilters));

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
    }, [articles, search, sort, selectedFilters]);


    // Dynamic Counts Calculation
    const filterCounts = useMemo(() => {
        const counts: Record<string, Record<string, number>> = {};

        // Categories map to their keys in ContentItem
        const categoryKeys: Record<string, { key: keyof ContentItem, isArray: boolean }> = {
            'applicationDomain': { key: 'applicationDomain', isArray: true },
            'imagingMethod': { key: 'imagingMethod', isArray: true },
            'modality': { key: 'modality', isArray: true },
            'product': { key: 'product', isArray: true },
            'journal': { key: 'journal', isArray: false },
            'firstAuthor': { key: 'firstAuthor', isArray: false },
            'lastAuthor': { key: 'lastAuthor', isArray: false },
            'customer': { key: 'customer', isArray: false }
        };

        // For each category, we want count of options based on "What if I select this option given OTHER categories are filtered?"
        // This is standard Faceted Search:
        // Context for Category C = Articles filtered by (All Active Filters EXCEPT C).

        Object.keys(categoryKeys).forEach(catId => {
            // Build context filters (exclude current catId)
            const contextFilters = { ...selectedFilters };
            delete contextFilters[catId]; // Remove restriction on current category to see full potential

            // Get articles matching this context
            const contextArticles = articles.filter(a =>
                // First apply search
                (search.trim() ? (
                    a.title.toLowerCase().includes(search.toLowerCase()) ||
                    a.description.toLowerCase().includes(search.toLowerCase()) ||
                    a.author?.toLowerCase().includes(search.toLowerCase()) ||
                    (a.journal && a.journal.toLowerCase().includes(search.toLowerCase()))
                ) : true) &&
                // Then apply context filters
                matchesFilters(a, contextFilters)
            );

            // Compute counts for options in this category within contextArticles
            const catCounts: Record<string, number> = {};
            const { key, isArray } = categoryKeys[catId];

            contextArticles.forEach(a => {
                const val = a[key];
                if (!val) return;

                if (isArray && Array.isArray(val)) {
                    val.forEach(v => {
                        catCounts[v as string] = (catCounts[v as string] || 0) + 1;
                    });
                } else if (!isArray && typeof val === 'string') {
                    catCounts[val] = (catCounts[val] || 0) + 1;
                }
            });

            counts[catId] = catCounts;
        });

        return counts;
    }, [articles, selectedFilters, search]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="border-b border-white/10 pb-6">
                <h1 className="text-3xl font-bold text-white mb-2">Scientific Articles</h1>
                <p className="text-gray-400">Access our knowledge base of protocols, technical notes, and research papers.</p>
            </div>

            <ContentFilterBar onSearch={setSearch} onSortChange={setSort} />

            <div className="flex flex-col md:flex-row gap-8">
                {/* Advanced Sidebar */}
                <MultiCategoryFilterSidebar
                    categories={filterCategories}
                    selectedFilters={selectedFilters}
                    counts={filterCounts}
                    onToggleFilter={handleToggleFilter}
                    onClearAll={handleClearAll}
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
                                    <br />
                                    <button
                                        onClick={handleClearAll}
                                        className="text-primary hover:underline mt-2 text-sm"
                                    >
                                        Clear all filters
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
