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
                        // Helper to safely parse JSON arrays
                        const parseArray = (val: any) =>
                            Array.isArray(val) ? val : JSON.parse(val || '[]').filter(Boolean);

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
                            // Legacy tags for card display (combine first 2 categories)
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

    // Dynamically generate filter options
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
                return next.length > 0 ? { ...prev, [categoryId]: next } : { ...prev, [categoryId]: [] }; // Keep cleanup clean?
            } else {
                return { ...prev, [categoryId]: [...current, option] };
            }
        });
    };

    const handleClearAll = () => setSelectedFilters({});

    const filteredAndSortedArticles = useMemo(() => {
        let result = [...articles];

        // Filter by Search
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(a =>
                a.title.toLowerCase().includes(q) ||
                a.description.toLowerCase().includes(q) ||
                a.author?.toLowerCase().includes(q) ||
                (a.journal && a.journal.toLowerCase().includes(q))
            );
        }

        // Advanced Filtering Logic
        // Strategy: OR within category, AND across categories
        // E.g. (AppDomain=Bio OR AppDomain=Chem) AND (Product=SAFE360)
        Object.keys(selectedFilters).forEach(categoryId => {
            const selectedOptions = selectedFilters[categoryId];
            if (selectedOptions.length === 0) return;

            result = result.filter(a => {
                const val = a[categoryId as keyof ContentItem];
                if (!val) return false;

                if (Array.isArray(val)) {
                    // Start with intersection check (does array contain ANY of selected options?)
                    return val.some(v => selectedOptions.includes(v));
                } else {
                    return selectedOptions.includes(val as string);
                }
            });
        });

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
    }, [articles, search, sort, selectedFilters]);

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
