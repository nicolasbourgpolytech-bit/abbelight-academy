"use client";

interface TagFilterSidebarProps {
    availableTags: string[];
    selectedTags: string[];
    onToggleTag: (tag: string) => void;
}

export function TagFilterSidebar({ availableTags, selectedTags, onToggleTag }: TagFilterSidebarProps) {
    return (
        <div className="w-full md:w-64 flex-shrink-0">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
                Filter by Topic
            </h3>
            <div className="flex flex-col gap-2">
                {availableTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                        <button
                            key={tag}
                            onClick={() => onToggleTag(tag)}
                            className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 border flex justify-between items-center group ${isSelected
                                    ? "bg-primary/20 text-primary border-primary/20"
                                    : "bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-white"
                                }`}
                        >
                            <span>{tag}</span>
                            {isSelected && (
                                <span className="bg-primary/20 text-primary p-1 rounded-full">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
