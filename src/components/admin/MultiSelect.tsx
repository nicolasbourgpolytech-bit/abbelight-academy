import { useState, useEffect, useRef } from "react";

interface MultiSelectProps {
    label: string;
    value: string[];
    options: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
}

export function MultiSelect({ label, value = [], options = [], onChange, placeholder }: MultiSelectProps) {
    const [inputValue, setInputValue] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter options based on input and exclude already selected
    const filteredOptions = options.filter(
        opt => opt.toLowerCase().includes(inputValue.toLowerCase()) && !value.includes(opt)
    );

    const handleAdd = (item: string) => {
        if (!item.trim()) return;
        if (!value.includes(item)) {
            onChange([...value, item]);
        }
        setInputValue("");
        setShowSuggestions(false);
    };

    const handleRemove = (item: string) => {
        onChange(value.filter(i => i !== item));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (inputValue.trim()) {
                handleAdd(inputValue.trim());
            }
        } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
            handleRemove(value[value.length - 1]);
        }
    };

    // Close suggestions on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{label}</label>
            <div className="bg-black/50 border border-white/10 rounded-lg p-2 flex flex-wrap gap-2 min-h-[42px] focus-within:border-primary transition-colors">
                {value.map((item) => (
                    <span key={item} className="bg-primary/20 text-primary text-xs px-2 py-1 rounded flex items-center gap-1">
                        {item}
                        <button
                            type="button"
                            onClick={() => handleRemove(item)}
                            className="hover:text-white focus:outline-none"
                        >
                            &times;
                        </button>
                    </span>
                ))}
                <div className="relative flex-1 min-w-[120px]">
                    <input
                        type="text"
                        className="w-full bg-transparent text-white text-sm outline-none placeholder-gray-600"
                        placeholder={value.length === 0 ? placeholder || `Add ${label}...` : ""}
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onKeyDown={handleKeyDown}
                    />

                    {showSuggestions && (inputValue || filteredOptions.length > 0) && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                            {filteredOptions.map((opt) => (
                                <button
                                    key={opt}
                                    type="button"
                                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                                    onClick={() => handleAdd(opt)}
                                >
                                    {opt}
                                </button>
                            ))}
                            {inputValue && !filteredOptions.includes(inputValue) && !value.includes(inputValue) && (
                                <button
                                    type="button"
                                    className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-white/10 transition-colors border-t border-white/5"
                                    onClick={() => handleAdd(inputValue)}
                                >
                                    Create "{inputValue}"
                                </button>
                            )}
                            {filteredOptions.length === 0 && !inputValue && (
                                <div className="px-4 py-2 text-sm text-gray-600 italic">No suggestions</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
