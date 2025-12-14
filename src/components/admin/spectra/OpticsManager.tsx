"use client";

import { useState, useRef } from "react";
import { Edit2, Trash2 } from "lucide-react";

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
    type: 'dichroic' | 'emission_filter' | 'imaging_splitter';
    title: string;
}

export function OpticsManager({ optics, onRefresh, type, title }: OpticsManagerProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [name, setName] = useState("");
    const [editId, setEditId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const formRef = useRef<HTMLDivElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !name) return;

        setIsUploading(true);
        const reader = new FileReader();

        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split(/\r?\n/); // Handle CRLF and LF
            const data: { wavelength: number; value: number }[] = [];

            lines.forEach((line, index) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return;

                // Detect delimiter: Tab, Semicolon, Comma, Space
                let parts: string[] = [];
                if (trimmedLine.includes('\t')) {
                    parts = trimmedLine.split('\t');
                } else if (trimmedLine.includes(';')) {
                    parts = trimmedLine.split(';');
                } else if (trimmedLine.includes(',')) {
                    // Check if it's "1,2" (decimal) vs "1, 2" (separator)
                    // If multiple commas, it's ambiguous, but let's try standard CSV split first
                    // or if it looks like "380 0,5", there's no comma separator, only decimal.
                    // Actually, if we are here, there's a comma.
                    // If strictly 2 parts with a comma in between...
                    // Let's assume standard CSV.
                    parts = trimmedLine.split(',');
                } else {
                    parts = trimmedLine.split(/\s+/);
                }

                parts = parts.map(p => p.trim()).filter(p => p !== '');

                // Skip header if first part is not a number
                if (index === 0) {
                    // Try to parse first part.
                    // Handle "0,5" style before checking
                    const testStr = parts[0]?.replace(',', '.');
                    if (isNaN(parseFloat(testStr))) return;
                }

                if (parts.length >= 2) {
                    // Handle comma decimal (French format) e.g. "0,08" -> "0.08"
                    const wlStr = parts[0].replace(',', '.');
                    const valStr = parts[1].replace(',', '.');

                    const wl = parseFloat(wlStr);
                    const trans = parseFloat(valStr);

                    if (!isNaN(wl) && !isNaN(trans)) {
                        data.push({ wavelength: wl, value: trans });
                    }
                }
            });

            // Normalize check
            if (data.length > 0) {
                const maxVal = Math.max(...data.map(d => d.value));
                // Heuristic: if max > 1.1, assume 0-100 scale and normalize to 0-1
                // User said "multiplier par 100 pour mettre en %", implies input 0-1 is standard.
                // But if input is already 80 (meaning 80%), we handle it.
                const normalizedData = maxVal > 1.1
                    ? data.map(d => ({ ...d, value: d.value / 100 }))
                    : data;

                try {
                    const url = '/api/spectra/optics';
                    const method = editId ? 'PUT' : 'POST';
                    const body = {
                        id: editId, // Optional for POST, required for PUT
                        name,
                        data: normalizedData,
                        type,
                        color: type === 'dichroic' ? '#ffffff' : '#FFD700',
                        line_style: type === 'dichroic' ? 'dashed' : 'solid'
                    };

                    const res = await fetch(url, {
                        method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });

                    if (res.ok) {
                        resetForm();
                        onRefresh();
                    } else {
                        console.error("Upload failed");
                    }
                } catch (error) {
                    console.error("Upload error", error);
                } finally {
                    setIsUploading(false);
                }
            } else {
                setIsUploading(false);
                alert("Could not parse file. Please check format.");
            }
        };

        reader.readAsText(file);
    };

    const resetForm = () => {
        setName("");
        setEditId(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleEdit = (optic: OpticalComponent) => {
        setEditId(optic.id);
        setName(optic.name);
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const handleSaveWithoutFile = async () => {
        if (!editId || !name) return;
        try {
            const res = await fetch('/api/spectra/optics', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editId,
                    name,
                    type,
                    color: type === 'dichroic' ? '#ffffff' : '#FFD700',
                    line_style: type === 'dichroic' ? 'dashed' : 'solid'
                })
            });
            if (res.ok) {
                resetForm();
                onRefresh();
            }
        } catch (e) {
            console.error(e);
        }
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
            <div ref={formRef} className={`bg-white/5 border ${editId ? 'border-primary/50' : 'border-white/10'} rounded-xl p-4 space-y-4 transition-colors`}>
                <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium text-gray-300">{editId ? `Edit ${title.slice(0, -1)}` : `Add New ${title.slice(0, -1)}`}</h4>
                    {editId && (
                        <button onClick={resetForm} className="text-xs text-red-400 hover:text-red-300">Cancel Edit</button>
                    )}
                </div>
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
                        <label className="text-xs text-gray-500">File (CSV or TXT - Wavelength, Transmission)</label>
                        <input
                            type="file"
                            accept=".csv,.txt"
                            ref={fileInputRef}
                            disabled={!name}
                            onChange={handleFileUpload}
                            className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>
                </div>
                {/* Save Button for Name-Only Edits */}
                {editId && (
                    <div className="flex justify-end">
                        <button
                            onClick={handleSaveWithoutFile}
                            className="bg-primary hover:bg-primary/90 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Update Name Only
                        </button>
                    </div>
                )}
                {isUploading && <p className="text-xs text-primary animate-pulse">Uploading and processing...</p>}
            </div>

            {/* List */}
            <div className="grid gap-3">
                {
                    optics.map(optic => (
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
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleEdit(optic)}
                                    className="text-gray-500 hover:text-blue-500 p-2 transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(optic.id)}
                                    className="text-gray-500 hover:text-red-500 p-2 transition-colors"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                }
            </div >
            {
                optics.length === 0 && (
                    <p className="text-gray-600 italic text-sm text-center py-4">No optical components added yet.</p>
                )
            }
        </div >
    );
}
