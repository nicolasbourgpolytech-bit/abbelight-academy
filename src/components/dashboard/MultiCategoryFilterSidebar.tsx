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
    counts: Record<string, Record<string, number>>;
    onToggleFilter: (categoryId: string, option: string) => void;
    onClearAll: () => void;
}

export function MultiCategoryFilterSidebar({ categories, selectedFilters, counts, onToggleFilter, onClearAll }: MultiCategoryFilterSidebarProps) {
    const hasActiveFilters = Object.values(selectedFilters).some(list => list.length > 0);
    const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
        categories.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {})
    );

    const toggleCategory = (id: string) => {
        setOpenCategories(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="w-full md:w-72 flex-shrink-0 space-y-6">
            {/* Active Filters Summary */}
            {hasActiveFilters && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 animate-fade-in shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-brand-cyan uppercase tracking-wider">Active Filters</h4>
                        <button
                            onClick={onClearAll}
                            className="text-[10px] text-gray-400 hover:text-white transition-colors underline hover:no-underline"
                        >
                            Clear All
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(selectedFilters).flatMap(([catId, options]) => {
                            // Dynamic Chip Color based on Category
                            const getChipColorClass = (id: string) => {
                                switch (id) {
                                    case 'imagingMethod': return 'bg-brand-green/20 text-brand-green border-brand-green/30 hover:bg-brand-green/30';
                                    case 'applicationDomain': return 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/30 hover:bg-brand-cyan/30';
                                    case 'modality': return 'bg-brand-magenta/20 text-brand-magenta border-brand-magenta/30 hover:bg-brand-magenta/30';
                                    case 'product': return 'bg-brand-orange/20 text-brand-orange border-brand-orange/30 hover:bg-brand-orange/30';
                                    default: return 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/20';
                                }
                            };
                            const colorClass = getChipColorClass(catId);

                            return options.map(option => (
                                <button
                                    key={`${catId}-${option}`}
                                    onClick={() => onToggleFilter(catId, option)}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors border group ${colorClass}`}
                                >
                                    <span>{option}</span>
                                    <svg className="w-3 h-3 opacity-60 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            ));
                        })}
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                    Filters
                </h3>
            </div>

            <div className="space-y-4">
                {categories.map((category) => {
                    const isOpen = openCategories[category.id];
                    const activeCount = selectedFilters[category.id]?.length || 0;
                    const catCounts = counts[category.id] || {};

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
                                        // Use Brand Cyan for the count badge
                                        <span className="bg-brand-cyan text-black text-[10px] font-bold px-1.5 rounded-full min-w-[1.25rem] h-5 flex items-center justify-center">
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
                                        const count = catCounts[option] || 0;
                                        const isDisabled = count === 0 && !isSelected;

                                        return (
                                            <label
                                                key={option}
                                                className={`flex items-start gap-2.5 cursor-pointer group py-1 select-none transition-colors 
                                                    ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}
                                                    ${isSelected ? 'text-white' : 'text-gray-400 hover:text-gray-300'}`}
                                            >
                                                <div className="relative flex items-center mt-0.5">
                                                    <input
                                                        type="checkbox"
                                                        className="peer sr-only"
                                                        checked={isSelected}
                                                        disabled={isDisabled}
                                                        onChange={() => !isDisabled && onToggleFilter(category.id, option)}
                                                    />
                                                    <div className={`w-4 h-4 rounded border transition-all duration-200 flex items-center justify-center
                                                        ${isSelected
                                                            // Use Brand Cyan for the checkbox itself
                                                            ? 'bg-brand-cyan border-brand-cyan text-black'
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
                                                <div className="flex-1 flex justify-between gap-2">
                                                    <span className="text-sm break-words leading-tight">{option}</span>
                                                    <span className="text-xs text-gray-600 font-mono group-hover:text-gray-500 transition-colors">({count})</span>
                                                </div>
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
