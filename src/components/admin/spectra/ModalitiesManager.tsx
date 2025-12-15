import { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, Save, X, Edit2 } from 'lucide-react';

type OpticalComponent = {
    id: string;
    name: string;
    type: string;
};

type Modality = {
    id: string;
    name: string;
    product: string;
    dichroic_id?: string;
    splitter_id?: string;
    cam1_filter_id?: string;
    cam2_filter_id?: string;
};

interface ModalitiesManagerProps {
    optics: OpticalComponent[];
    dyes: any[];
}

export function ModalitiesManager({ optics, dyes }: ModalitiesManagerProps) {
    const [modalities, setModalities] = useState<Modality[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<string>('MN360');
    const [isLoading, setIsLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const formRef = useRef<HTMLDivElement>(null);

    // Form State
    const [newName, setNewName] = useState('');
    const [newDichroic, setNewDichroic] = useState('');
    const [newSplitter, setNewSplitter] = useState('');
    const [newCam1Filter, setNewCam1Filter] = useState('');
    const [newCam2Filter, setNewCam2Filter] = useState('');
    const [newAssociatedDyes, setNewAssociatedDyes] = useState<string[]>([]);

    const PRODUCTS = ['MN360', 'MN180', 'M90', 'M45'];

    // Filter optics
    const dichroics = optics.filter(o => o.type === 'dichroic' || !o.type);
    const splitters = optics.filter(o => o.type === 'imaging_splitter');
    const filters = optics.filter(o => o.type === 'emission_filter');

    useEffect(() => {
        fetchModalities();
    }, [selectedProduct]);

    const fetchModalities = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/spectra/modalities?product=${selectedProduct}`);
            if (res.ok) {
                const data = await res.json();
                setModalities(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setNewName('');
        setNewDichroic('');
        setNewSplitter('');
        setNewCam1Filter('');
        setNewCam2Filter('');
        setNewAssociatedDyes([]);
        setIsAdding(false);
        setEditId(null);
    };

    const handleEdit = (modality: Modality) => {
        setNewName(modality.name);
        setNewDichroic(modality.dichroic_id || '');
        setNewSplitter(modality.splitter_id || '');
        setNewCam1Filter(modality.cam1_filter_id || '');
        setNewCam2Filter(modality.cam2_filter_id || '');
        setNewAssociatedDyes(modality.associated_dyes || []);
        setEditId(modality.id);
        setIsAdding(true);
        // Scroll to form ref instead of window top
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    const toggleDyeSelection = (dyeId: string) => {
        setNewAssociatedDyes(prev =>
            prev.includes(dyeId)
                ? prev.filter(id => id !== dyeId)
                : [...prev, dyeId]
        );
    };

    const handleSave = async () => {
        if (!newName) return;

        try {
            const url = '/api/spectra/modalities';
            const method = editId ? 'PUT' : 'POST';
            const body = {
                id: editId, // Optional/Ignored for POST
                name: newName,
                product: selectedProduct,
                dichroic_id: newDichroic || null,
                splitter_id: newSplitter || null,
                cam1_filter_id: newCam1Filter || null,
                cam2_filter_id: newCam2Filter || null,
                associated_dyes: newAssociatedDyes
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                resetForm();
                fetchModalities();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            const res = await fetch(`/api/spectra/modalities/${id}`, { method: 'DELETE' });
            if (res.ok) fetchModalities();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
            <div className="p-4 border-b border-white/10 flex flex-wrap gap-4 items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Imaging Modalities</h2>
                    <p className="text-sm text-gray-400">Configure presets per product</p>
                </div>

                {/* Product Selector */}
                <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50"
                >
                    {PRODUCTS.map(p => <option key={p} value={p} className="bg-gray-900">{p}</option>)}
                </select>

                <button
                    onClick={() => {
                        resetForm();
                        setIsAdding(true);
                    }}
                    className="flex items-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-primary/20"
                >
                    <Plus size={16} /> Add Modality
                </button>
            </div>

            <div className="p-4 space-y-4">
                {isAdding && (
                    <div ref={formRef} className={`bg-white/5 p-4 rounded-lg border ${editId ? 'border-primary/50' : 'border-white/10'} space-y-4`}>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-semibold text-white">{editId ? 'Edit Modality' : 'New Modality'}</h3>
                            {editId && <button onClick={resetForm} className="text-xs text-red-400">Cancel Edit</button>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Modality Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. DAPI/Alexa488"
                                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-1.5 text-sm text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Dichroic (SAFe)</label>
                                <select
                                    value={newDichroic}
                                    onChange={(e) => setNewDichroic(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-1.5 text-sm text-white"
                                >
                                    <option value="" className="bg-gray-900">None</option>
                                    {dichroics.map(d => <option key={d.id} value={d.id} className="bg-gray-900">{d.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Imaging Splitter (Cube)</label>
                                <select
                                    value={newSplitter}
                                    onChange={(e) => setNewSplitter(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-1.5 text-sm text-white"
                                >
                                    <option value="" className="bg-gray-900">None</option>
                                    {splitters.map(s => <option key={s.id} value={s.id} className="bg-gray-900">{s.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Filter Cam T</label>
                                    <select
                                        value={newCam1Filter}
                                        onChange={(e) => setNewCam1Filter(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-1.5 text-sm text-white"
                                    >
                                        <option value="" className="bg-gray-900">None</option>
                                        {filters.map(f => <option key={f.id} value={f.id} className="bg-gray-900">{f.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Filter Cam R</label>
                                    <select
                                        value={newCam2Filter}
                                        onChange={(e) => setNewCam2Filter(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-1.5 text-sm text-white"
                                    >
                                        <option value="" className="bg-gray-900">None</option>
                                        {filters.map(f => <option key={f.id} value={f.id} className="bg-gray-900">{f.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Associated Dyes Selection */}
                            <div className="md:col-span-2">
                                <label className="block text-xs text-gray-400 mb-1">Associated Dyes (Click to toggle)</label>
                                <div className="flex flex-wrap gap-2 p-2 bg-black/20 border border-white/10 rounded max-h-40 overflow-y-auto">
                                    {dyes.map(dye => {
                                        const isSelected = newAssociatedDyes.includes(dye.id);
                                        return (
                                            <button
                                                key={dye.id}
                                                onClick={() => toggleDyeSelection(dye.id)}
                                                className={`px-2 py-1 text-xs rounded-full border transition-colors ${isSelected
                                                        ? 'bg-primary/20 border-primary text-white'
                                                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                                    }`}
                                            >
                                                {dye.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={resetForm} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
                            <button onClick={handleSave} className="flex items-center gap-2 bg-primary text-white px-3 py-1.5 rounded-lg text-sm"><Save size={14} /> {editId ? 'Update' : 'Save'}</button>
                        </div>
                    </div>
                )}

                {/* List */}
                <div className="space-y-2">
                    {modalities.length === 0 && !isLoading && <div className="text-gray-500 text-sm italic">No modalities configured for {selectedProduct}.</div>}
                    {modalities.map(m => (
                        <div key={m.id} className="bg-white/5 border border-white/10 p-3 rounded-lg flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-white">{m.name}</h3>
                                <div className="text-xs text-gray-400 flex flex-wrap gap-2 mt-1">
                                    {m.dichroic_id && <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10">Dichroic: {optics.find(o => o.id === m.dichroic_id)?.name}</span>}
                                    {m.splitter_id && <span className="bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 text-blue-200">Splitter: {optics.find(o => o.id === m.splitter_id)?.name}</span>}
                                    {m.cam1_filter_id && <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10">Cam T: {optics.find(o => o.id === m.cam1_filter_id)?.name}</span>}
                                    {m.cam2_filter_id && <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10">Cam R: {optics.find(o => o.id === m.cam2_filter_id)?.name}</span>}

                                    {/* Display Associated Dyes Count */}
                                    {m.associated_dyes && m.associated_dyes.length > 0 && (
                                        <span className="bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 text-purple-200">
                                            {m.associated_dyes.length} Dyes Linked
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleEdit(m)} className="text-blue-400 hover:text-blue-300 p-2"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(m.id)} className="text-red-400 hover:text-red-300 p-2"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
