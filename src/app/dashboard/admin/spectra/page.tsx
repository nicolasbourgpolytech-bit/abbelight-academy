"use client";

import { useState, useEffect } from "react";
import { DyeForm } from "@/components/admin/spectra/DyeForm";
import { DyeList } from "@/components/admin/spectra/DyeList";
import { OpticsManager } from "@/components/admin/spectra/OpticsManager";

export type Dye = {
    id: string;
    name: string;
    category: 'UV' | 'Green' | 'Red' | 'Far-red';
    color: string;
    excitation_peak?: number;
    emission_peak?: number;
    visible: boolean;
    excitation_data?: any[];
    emission_data?: any[];
};

export default function SpectraAdminPage() {
    const [dyes, setDyes] = useState<Dye[]>([]);
    const [optics, setOptics] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingDye, setEditingDye] = useState<Dye | null>(null);

    const categories = ['UV', 'Green', 'Red', 'Far-red'];

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [dyesRes, opticsRes] = await Promise.all([
                fetch('/api/spectra'),
                fetch('/api/spectra/optics')
            ]);

            if (dyesRes.ok) {
                const data = await dyesRes.json();
                setDyes(data);
            }
            if (opticsRes.ok) {
                const data = await opticsRes.json();
                setOptics(data);
            }
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEdit = (dye: Dye) => {
        setEditingDye(dye);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this dye?")) return;
        try {
            await fetch(`/api/spectra/${id}`, { method: 'DELETE' });
            fetchData();
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    const handleFormSubmit = async () => {
        setIsFormOpen(false);
        setEditingDye(null);
        fetchData();
    };

    return (
        <div className="p-8 space-y-8 text-white min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                        Spectra Manager
                    </h1>
                    <p className="text-gray-400 mt-2">Manage fluorophore data for the Spectra Viewer.</p>
                </div>
                <button
                    onClick={() => { setEditingDye(null); setIsFormOpen(true); }}
                    className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Dye
                </button>
            </div>

            {isFormOpen ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold">{editingDye ? 'Edit Dye' : 'Add New Dye'}</h2>
                        <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-white">Cancel</button>
                    </div>
                    <DyeForm
                        initialData={editingDye}
                        onSubmit={handleFormSubmit}
                        onCancel={() => setIsFormOpen(false)}
                    />
                </div>
            ) : (
                <div className="grid gap-12">
                    {/* Dyes Section */}
                    <div className="space-y-8">
                        {categories.map(cat => {
                            const categoryDyes = dyes.filter(d => d.category === cat);
                            return (
                                <div key={cat} className="space-y-4">
                                    <h3 className="text-xl font-semibold border-b border-white/10 pb-2 flex items-center gap-2">
                                        <span className={`w-3 h-3 rounded-full ${cat === 'UV' ? 'bg-purple-400' :
                                            cat === 'Green' ? 'bg-green-400' :
                                                cat === 'Red' ? 'bg-red-500' : 'bg-pink-600'
                                            }`} />
                                        {cat} Dyes
                                        <span className="text-sm font-normal text-gray-500 ml-2">({categoryDyes.length})</span>
                                    </h3>

                                    {categoryDyes.length === 0 ? (
                                        <p className="text-gray-600 italic text-sm">No dyes in this category.</p>
                                    ) : (
                                        <DyeList
                                            dyes={categoryDyes}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Optics Section */}
                    <div className="space-y-12">
                        <OpticsManager
                            optics={optics.filter(o => o.type === 'dichroic' || !o.type)}
                            onRefresh={fetchData}
                            type="dichroic"
                            title="Abbelight SAFe Optics (Dichroics)"
                        />
                        <OpticsManager
                            optics={optics.filter(o => o.type === 'emission_filter')}
                            onRefresh={fetchData}
                            type="emission_filter"
                            title="Emission Filters"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
