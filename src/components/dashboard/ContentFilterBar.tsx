"use client";

import { useState } from "react";

interface ContentFilterBarProps {
    onSearch: (query: string) => void;
    onSortChange: (sort: 'date-desc' | 'date-asc' | 'title') => void;
}

export function ContentFilterBar({ onSearch, onSortChange }: ContentFilterBarProps) {
    return (
        <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-colors text-base"
                    placeholder="Search by title or keyword..."
                    onChange={(e) => onSearch(e.target.value)}
                />
            </div>

            {/* Sort Dropdown */}
            <div className="w-full md:w-64">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                        </svg>
                    </div>
                    <select
                        className="block w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-colors appearance-none cursor-pointer text-base"
                        onChange={(e) => onSortChange(e.target.value as any)}
                        defaultValue="date-desc"
                    >
                        <option value="date-desc" className="bg-black text-gray-300">Newest First</option>
                        <option value="date-asc" className="bg-black text-gray-300">Oldest First</option>
                        <option value="title" className="bg-black text-gray-300">Title (A-Z)</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
}
