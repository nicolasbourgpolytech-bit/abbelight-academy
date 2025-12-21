import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface Fluorophore {
    id: string;
    name: string;
    type: string;
    category: string;
    color: string;
    excitation_peak?: number;
    emission_peak?: number;
    description?: string;
}

interface DyeSelectProps {
    selectedDye: Fluorophore | null;
    onSelect: (dye: Fluorophore) => void;
}

const CATEGORY_ORDER = ['UV', 'Blue', 'Green', 'Red', 'Far-red'];

export const DyeSelect: React.FC<DyeSelectProps> = ({ selectedDye, onSelect }) => {
    const [dyes, setDyes] = useState<Fluorophore[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [hoveredDye, setHoveredDye] = useState<Fluorophore | null>(null);
    const [hoverPosition, setHoverPosition] = useState<{ top: number; left: number } | null>(null);

    // Fetch Dyes
    useEffect(() => {
        const fetchDyes = async () => {
            try {
                const res = await fetch('/api/spectra');
                if (res.ok) {
                    const data = await res.json();
                    setDyes(data);

                    // Default Selection Logic
                    if (!selectedDye) {
                        const alexa647 = data.find((d: Fluorophore) => d.name.toLowerCase().includes("alexa fluor 647") || d.name.toLowerCase().includes("alexa 647"));
                        if (alexa647) {
                            onSelect(alexa647);
                        } else {
                            const farRed = data.find((d: Fluorophore) => d.category.toUpperCase() === "FAR-RED");
                            if (farRed) {
                                onSelect(farRed);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch dyes", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDyes();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Group and Sort
    const groupedDyes = React.useMemo(() => {
        const groups: Record<string, Fluorophore[]> = {};
        dyes.forEach(dye => {
            if (!groups[dye.category]) groups[dye.category] = [];
            groups[dye.category].push(dye);
        });

        // Sort within groups by emission peak
        Object.keys(groups).forEach(cat => {
            groups[cat].sort((a, b) => (a.emission_peak || 0) - (b.emission_peak || 0));
        });

        return groups;
    }, [dyes]);

    const sortedCategories = Object.keys(groupedDyes).sort((a, b) => {
        const idxA = CATEGORY_ORDER.indexOf(a);
        const idxB = CATEGORY_ORDER.indexOf(b);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    return (
        <div className="relative z-500" ref={dropdownRef}> {/* High Z-index for dropdown */}
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Fluorophore</label>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-black/40 border border-white/20 p-2 text-left text-sm text-white flex justify-between items-center hover:bg-white/5 transition-colors focus:outline-none focus:border-brand-cyan relative"
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {selectedDye ? (
                        <>
                            {selectedDye.color && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedDye.color }}></div>}
                            <span className="truncate">{selectedDye.name}</span>
                            <span className="text-xs text-gray-500 font-mono ml-1">
                                {selectedDye.emission_peak ? `${selectedDye.emission_peak}nm` : ''}
                            </span>
                        </>
                    ) : (
                        <span className="text-gray-400 italic">Select a fluorophore...</span>
                    )}
                </div>
                <span className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} shrink-0 ml-2`}>
                    {/* Chevron Down */}
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L5 5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
            </button>

            {/* Hover Card (Floating via Portal) */}
            {hoveredDye && hoverPosition && (typeof document !== 'undefined') &&
                createPortal(
                    <div
                        className="fixed pointer-events-none z-[9999] w-64 p-3 bg-black/95 border border-white/20 shadow-2xl backdrop-blur-md rounded flex flex-col gap-2"
                        style={{
                            top: hoverPosition.top,
                            left: hoverPosition.left,
                            transform: 'translateY(-50%)' // Center vertically relative to item
                        }}
                    >
                        <div className="flex justify-between items-start border-b border-white/10 pb-2">
                            <div>
                                <div className="text-sm font-bold text-brand-cyan">{hoveredDye.name}</div>
                                <div className="text-[10px] text-gray-400 uppercase tracking-wider">{hoveredDye.type}</div>
                            </div>
                            {hoveredDye.color && <div className="w-4 h-4 rounded-full border border-white/20 shadow-[0_0_10px_currentColor]" style={{ color: hoveredDye.color, backgroundColor: hoveredDye.color }}></div>}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div>
                                <span className="block text-gray-500">Category</span>
                                <span className="text-white">{hoveredDye.category}</span>
                            </div>
                            <div>
                                <span className="block text-gray-500">Emission</span>
                                <span className="text-white font-mono">{hoveredDye.emission_peak ? `${hoveredDye.emission_peak} nm` : 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-gray-500">Excitation</span>
                                <span className="text-white font-mono">{hoveredDye.excitation_peak ? `${hoveredDye.excitation_peak} nm` : 'N/A'}</span>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }
            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-black/90 border border-white/20 backdrop-blur-xl max-h-[300px] overflow-y-auto z-50 shadow-2xl">
                    {loading ? (
                        <div className="p-4 text-center text-xs text-gray-500">Loading library...</div>
                    ) : (
                        sortedCategories.map(category => (
                            <div key={category}>
                                <div className="sticky top-0 bg-black/95 backdrop-blur px-3 py-1.5 text-[10px] font-bold text-brand-cyan uppercase tracking-widest border-b border-white/10 z-10">
                                    {category}
                                </div>
                                <div>
                                    {groupedDyes[category].map(dye => (
                                        <button
                                            key={dye.id}
                                            onClick={() => {
                                                onSelect(dye);
                                                setIsOpen(false);
                                                setHoveredDye(null);
                                            }}
                                            onMouseEnter={(e) => {
                                                setHoveredDye(dye);
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                // Position card to the right of the item
                                                setHoverPosition({
                                                    top: rect.top + rect.height / 2,
                                                    left: rect.right + 10
                                                });
                                            }}
                                            onMouseLeave={() => {
                                                setHoveredDye(null);
                                                setHoverPosition(null);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between group transition-colors
                                                ${selectedDye?.id === dye.id ? 'bg-brand-cyan/20 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}
                                            `}
                                        >
                                            <span>{dye.name}</span>
                                            <span className="font-mono text-[10px] opacity-50 group-hover:opacity-100">{dye.emission_peak}nm</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
