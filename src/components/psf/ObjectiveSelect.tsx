import React, { useState, useRef, useEffect } from 'react';
import { ObjectiveLens } from '@/data/objectives';
import { createPortal } from 'react-dom';

interface ObjectiveSelectProps {
    objectives: ObjectiveLens[];
    selectedId: string;
    onChange: (id: string) => void;
    className?: string;
}

export const ObjectiveSelect: React.FC<ObjectiveSelectProps> = ({ objectives, selectedId, onChange, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredObjective, setHoveredObjective] = useState<ObjectiveLens | null>(null);
    const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedObjective = objectives.find(o => o.id === selectedId) || objectives[0];

    // Grouping
    const groupedObjectives = objectives.reduce((acc, obj) => {
        const brand = obj.brand || "Other";
        if (!acc[brand]) acc[brand] = [];
        acc[brand].push(obj);
        return acc;
    }, {} as Record<string, ObjectiveLens[]>);

    const handleToggle = () => {
        if (!isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDropdownRect(rect);
        }
        setIsOpen(!isOpen);
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={handleToggle}
                className="w-full flex items-center justify-between bg-black/20 border border-white/20 px-3 py-2 text-xs text-brand-cyan hover:bg-white/5 transition-colors focus:outline-none focus:border-brand-cyan"
            >
                <span className="truncate">{selectedObjective?.name || "Select Objective"}</span>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className={`ml-2 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 bg-black/90 border border-white/20 shadow-xl max-h-80 overflow-y-auto custom-scrollbar backdrop-blur-sm"
                    style={{ top: '100%', left: 0 }}
                >
                    {Object.entries(groupedObjectives).map(([brand, lenses]) => (
                        <div key={brand}>
                            <div className="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase bg-white/5 border-y border-white/10 sticky top-0 backdrop-blur-md">
                                {brand}
                            </div>
                            {lenses.map(obj => (
                                <div
                                    key={obj.id}
                                    onClick={() => {
                                        onChange(obj.id);
                                        setIsOpen(false);
                                        setHoveredObjective(null);
                                    }}
                                    onMouseEnter={(e) => {
                                        setHoveredObjective(obj);
                                        // Update rect if needed for precise positioning relative to item?
                                        // For now, "Right of list" is fine.
                                    }}
                                    onMouseLeave={() => setHoveredObjective(null)}
                                    className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between group transition-colors ${obj.id === selectedId
                                            ? 'bg-brand-cyan/20 text-brand-cyan'
                                            : 'text-gray-300 hover:bg-brand-cyan/10 hover:text-white'
                                        }`}
                                >
                                    <span>{obj.name}</span>
                                    {obj.id === selectedId && (
                                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                            <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" />
                                        </svg>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* Hover Card (Portal) */}
            {isOpen && hoveredObjective && dropdownRect && createPortal(
                <div
                    className="fixed z-[9999] w-64 bg-black/90 border border-white/20 shadow-2xl backdrop-blur-md p-4 flex flex-col gap-3 pointer-events-none transition-opacity duration-200"
                    style={{
                        top: dropdownRect.top, // Align top with the select box
                        left: dropdownRect.right + 10, // 10px to the right of the select box
                        opacity: 1
                    }}
                >
                    {/* Header */}
                    <div className="border-b border-white/10 pb-2">
                        <div className="text-sm font-bold text-white">{hoveredObjective.name}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-widest">{hoveredObjective.brand}</div>
                    </div>

                    {/* Image */}
                    <div className="relative w-full aspect-square bg-white/5 rounded border border-white/10 overflow-hidden flex items-center justify-center p-2">
                        <img
                            src={hoveredObjective.imagePath}
                            alt={hoveredObjective.name}
                            className="max-w-full max-h-full object-contain drop-shadow-lg"
                        />
                    </div>

                    {/* Specs */}
                    <div className="grid grid-cols-2 gap-y-2 gap-x-1 text-[10px]">
                        <div>
                            <span className="text-gray-500 uppercase block">NA</span>
                            <span className="text-white font-mono">{hoveredObjective.NA.toFixed(2)}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 uppercase block">Magnification</span>
                            <span className="text-white font-mono">{hoveredObjective.magnification}x</span>
                        </div>
                        <div>
                            <span className="text-gray-500 uppercase block">Immersion</span>
                            <span className="text-white font-mono">{hoveredObjective.immersion} ({hoveredObjective.n_imm})</span>
                        </div>
                        <div>
                            <span className="text-gray-500 uppercase block">Collar</span>
                            <span className={`font-mono ${hoveredObjective.hasCorrectionCollar ? "text-green-400" : "text-gray-500"}`}>
                                {hoveredObjective.hasCorrectionCollar ? "Yes" : "No"}
                            </span>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
