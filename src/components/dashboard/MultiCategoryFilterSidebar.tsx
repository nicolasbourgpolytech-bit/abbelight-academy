"use client";

import { useState } from "react";

interface FilterCategory {
    id: string;
    title: string;
    options: string[];
}

interface MultiCategoryFilterSidebarProps {
    categories: FilterCategory[];
    selectedFilters: Record<string, string[]>;
    onToggleFilter: (categoryId: string, option: string) => void;
    onClearAll: () => void;
}

export function MultiCategoryFilterSidebar({ categories, selectedFilters, onToggleFilter, onClearAll }: MultiCategoryFilterSidebarProps) {
    // Determine if any filters are active
    const hasActiveFilters = Object.values(selectedFilters).some(list => list.length > 0);
    const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
        // Default all open or maybe just the first few? Let's default all open for visibility.
        categories.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {})
    );

    const toggleCategory = (id: string) => {
        setOpenCategories(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="w-full md:w-72 flex-shrink-0 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                    Filters
                </h3>
                {hasActiveFilters && (
                    <button
                        onClick={onClearAll}
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                        Clear All
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {categories.map((category) => {
                    const isOpen = openCategories[category.id];
                    const activeCount = selectedFilters[category.id]?.length || 0;

                    return (
                        <div key={category.id} className="border-b border-white/10 pb-4 last:border-0">
                            <button
                                onClick={() => toggleCategory(category.id)}
                                className="w-full flex items-center justify-between text-left mb-3 group"
                            >
                                <span className={`text-sm font-semibold transition-colors ${activeCount > 0 ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                                    {category.title}
                                </span>
                                <div className="flex items-center gap-2">
                                    {activeCount > 0 && (
                                        <span className="bg-primary text-black text-[10px] font-bold px-1.5 rounded-full min-w-[1.25rem] h-5 flex items-center justify-center">
                                            {activeCount}
                                        </span>
                                    )}
                                    <svg
                                        className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>

                            {isOpen && (
                                <div className="space-y-1.5 animate-fade-in pl-1">
                                    {category.options.map((option) => {
                                        const isSelected = selectedFilters[category.id]?.includes(option);
                                        return (
                                            <label
                                                key={option}
                                                className={`flex items-start gap-2.5 cursor-pointer group py-1 select-none transition-colors ${isSelected ? 'text-white' : 'text-gray-400 hover:text-gray-300'}`}
                                            >
                                                <div className="relative flex items-center mt-0.5">
                                                    <input
                                                        type="checkbox"
                                                        className="peer sr-only"
                                                        checked={isSelected}
                                                        onChange={() => onToggleFilter(category.id, option)}
                                                    />
                                                    <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center
                                                        ${isSelected
                                                            ? 'bg-primary border-primary text-black'
                                                            : 'bg-white/5 border-white/20 group-hover:border-white/40'
                                                        }`}
                                                    >
                                                        {isSelected && (
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="text-sm break-words leading-tight">{option}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
