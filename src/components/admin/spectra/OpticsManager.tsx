"use client";

import { useState, useRef } from "react";

type OpticalComponent = {
    id: string;
    name: string;
    type: string;
    visible: boolean;
    data: { wavelength: number; value: number }[];
};

interface OpticsManagerProps {
    optics: OpticalComponent[];
    onRefresh: () => void;
    type: 'dichroic' | 'emission_filter';
    title: string;
}

export function OpticsManager({ optics, onRefresh, type, title }: OpticsManagerProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [name, setName] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !name) return;

        setIsUploading(true);
        const reader = new FileReader();

        reader.onload = async (event) => {
            const text = event.target?.result as string;
            // Parse CSV: Expecting "Wavelength, Transmission"
            const lines = text.split('\n');
            const data: { wavelength: number; value: number }[] = [];

            lines.forEach((line, index) => {
                // Skip header if it contains text
                if (index === 0 && isNaN(parseFloat(line.split(',')[0]))) return;

                const parts = line.split(',').map(p => p.trim());
                if (parts.length >= 2) {
                    const wl = parseFloat(parts[0]);
                    const trans = parseFloat(parts[1]);

                    if (!isNaN(wl) && !isNaN(trans)) {
                        // Normalize transmission to 0-1 range if it's 0-100
                        // Heuristic: if max value > 1, assume percentage
                        data.push({ wavelength: wl, value: trans });
                    }
                }
            });

            // Normalize check
            const maxVal = Math.max(...data.map(d => d.value));
            const normalizedData = maxVal > 1.1
                ? data.map(d => ({ ...d, value: d.value / 100 }))
                : data;

            try {
                const res = await fetch('/api/spectra/optics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        data: normalizedData,
                        type, // Use prop
                        color: type === 'dichroic' ? '#ffffff' : '#FFD700', // Different default for filters? Maybe gold?
                        line_style: type === 'dichroic' ? 'dashed' : 'solid' // Maybe solid for filters? Or dashed too? User said "dashed, semi-transparent" for Dichroic. Filters might be different. Let's keep existing style or make filters distinct. User didn't specify filter style, but different is good. Let's start with dashed for consistency or maybe 'dotted'.
                        // Actually, user said "Cela sera les mêmes filtres pour toutes les cameras".
                        // In page.tsx: "Add Emission Filters section...".
                        // Let's stick to dashed for now but maybe different color if verified.
                        // For now, let's keep hardcoded white/dashed or slight var.
                        // Reverting complexity: just pass type.
                    })
                });

                if (res.ok) {
                    setName("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                    onRefresh();
                } else {
                    console.error("Upload failed");
                }
            } catch (error) {
                console.error("Upload error", error);
            } finally {
                setIsUploading(false);
            }
        };

        reader.readAsText(file);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this component?")) return;
        try {
            await fetch(`/api/spectra/optics?id=${id}`, { method: 'DELETE' });
            onRefresh();
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold border-b border-white/10 pb-2 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-white" />
                {title}
                <span className="text-sm font-normal text-gray-500 ml-2">({optics.length})</span>
            </h3>

            {/* Upload Form */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                <h4 className="text-sm font-medium text-gray-300">Add New {title.slice(0, -1)}</h4>
                <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-1">
                        <label className="text-xs text-gray-500">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Quad Band Filter"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                        />
                    </div>
                    <div className="flex-1 space-y-1">
                        <label className="text-xs text-gray-500">CSV File (Wavelength, Transmission %)</label>
                        <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            disabled={!name}
                            onChange={handleFileUpload}
                            className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>
                </div>
                {isUploading && <p className="text-xs text-primary animate-pulse">Uploading and processing...</p>}
            </div>

            {/* List */}
            <div className="grid gap-3">
                {optics.map(optic => (
                    <div key={optic.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/20 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-medium text-white">{optic.name}</h4>
                                <p className="text-xs text-gray-500">{optic.type} • {optic.data?.length || 0} points</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleDelete(optic.id)}
                            className="text-gray-500 hover:text-red-500 p-2 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                ))}
                {optics.length === 0 && (
                    <p className="text-gray-600 italic text-sm text-center py-4">No optical components added yet.</p>
                )}
            </div>
        </div>
    );
}
