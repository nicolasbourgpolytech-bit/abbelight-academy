"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";

export default function WebinarsAdminPage() {
    const { user } = useUser();
    const [webinars, setWebinars] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [isEditingWebinar, setIsEditingWebinar] = useState(false);
    const [editingWebinar, setEditingWebinar] = useState<any>(null);
    const [currentTag, setCurrentTag] = useState("");

    // Fetch Data
    useEffect(() => {
        if (user?.roles.includes('abbelighter_admin')) {
            fetch('/api/webinars')
                .then(res => res.json())
                .then(data => {
                    if (data.webinars) setWebinars(data.webinars);
                })
                .catch(err => console.error(err));

            fetch('/api/products')
                .then(res => res.json())
                .then(data => setProducts(data || []))
                .catch(err => console.error(err));
        }
    }, [user]);

    // Derived state for tag suggestions
    const allUniqueTags = Array.from(new Set([
        ...webinars.flatMap(w => {
            if (Array.isArray(w.tags)) return w.tags;
            if (typeof w.tags === 'string') return JSON.parse(w.tags);
            return [];
        })
    ])).sort();

    const handleSaveWebinar = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const isUpdate = !!editingWebinar.id;
            const method = isUpdate ? 'PUT' : 'POST';

            const res = await fetch('/api/webinars', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingWebinar),
            });
            const data = await res.json();

            if (res.ok) {
                alert("Webinar saved successfully!");
                if (isUpdate) {
                    setWebinars(webinars.map(w => w.id === data.webinar.id ? data.webinar : w));
                } else {
                    setWebinars([data.webinar, ...webinars]);
                }
                setIsEditingWebinar(false);
            } else {
                console.error("Save Error:", data);
                alert("Error: " + (data.error?.message || JSON.stringify(data.error)));
            }
        } catch (error) {
            alert("Failed to save webinar");
        }
    };

    const handleDeleteWebinar = async (id: number) => {
        if (!confirm("Are you sure you want to delete this webinar?")) return;
        try {
            const res = await fetch(`/api/webinars?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setWebinars(webinars.filter(w => w.id !== id));
            } else {
                const data = await res.json();
                alert("Failed to delete webinar: " + (data.error?.message || JSON.stringify(data.error)));
            }
        } catch (e) {
            alert("Error deleting webinar");
        }
    };

    const addProduct = () => {
        const currentProducts = editingWebinar.associated_products || [];
        setEditingWebinar({ ...editingWebinar, associated_products: [...currentProducts, { name: "", link: "", image_url: "" }] });
    };

    const removeProduct = (idx: number) => {
        const currentProducts = editingWebinar.associated_products || [];
        setEditingWebinar({ ...editingWebinar, associated_products: currentProducts.filter((_: any, i: number) => i !== idx) });
    };

    const updateProduct = (idx: number, field: string, value: string) => {
        const currentProducts = [...(editingWebinar.associated_products || [])];
        currentProducts[idx] = { ...currentProducts[idx], [field]: value };
        setEditingWebinar({ ...editingWebinar, associated_products: currentProducts });
    };

    const addAuthor = () => {
        const currentAuthors = editingWebinar.authors || [];
        setEditingWebinar({ ...editingWebinar, authors: [...currentAuthors, { name: "", firstName: "", title: "", institute: "", photo: "", linkedin: "" }] });
    };

    const removeAuthor = (idx: number) => {
        const currentAuthors = editingWebinar.authors || [];
        setEditingWebinar({ ...editingWebinar, authors: currentAuthors.filter((_: any, i: number) => i !== idx) });
    };

    const updateAuthor = (idx: number, field: string, value: string) => {
        const currentAuthors = [...(editingWebinar.authors || [])];
        currentAuthors[idx] = { ...currentAuthors[idx], [field]: value };
        setEditingWebinar({ ...editingWebinar, authors: currentAuthors });
    };

    const addTag = () => {
        if (!currentTag.trim()) return;
        const currentTags = editingWebinar.tags || [];
        if (!currentTags.includes(currentTag.trim())) {
            setEditingWebinar({ ...editingWebinar, tags: [...currentTags, currentTag.trim()] });
        }
        setCurrentTag("");
    };

    const removeTag = (tagToRemove: string) => {
        const currentTags = editingWebinar.tags || [];
        setEditingWebinar({ ...editingWebinar, tags: currentTags.filter((t: string) => t !== tagToRemove) });
    };

    if (!user || !user.roles.includes('abbelighter_admin')) {
        return (
            <div className="text-center p-20 text-red-500">
                Unauthorized. Admin access only.
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto pb-20">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">Webinars Management</h1>
                <p className="text-gray-400">Manage your webinar content.</p>
            </div>

            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                {!isEditingWebinar ? (
                    <>
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Webinars List</h2>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingWebinar({
                                        title: "", duration: "", description: "", video_url: "",
                                        associated_products: [], authors: [], tags: [], is_new: false,
                                        date: new Date().toISOString().split('T')[0] // Default to today
                                    });
                                    setIsEditingWebinar(true);
                                }}
                                className="bg-primary text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-white transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                New Webinar
                            </button>
                        </div>

                        <div className="space-y-4">
                            {webinars.map((webinar: any) => (
                                <div key={webinar.id} className="bg-gray-900/40 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-primary/30 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-gray-800 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-500 font-bold text-xl">
                                            W{webinar.id}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white group-hover:text-primary transition-colors">{webinar.title}</h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs bg-white/5 px-2 py-0.5 rounded text-gray-400">{webinar.duration}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setEditingWebinar(webinar);
                                                setIsEditingWebinar(true);
                                            }}
                                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Edit"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteWebinar(webinar.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {webinars.length === 0 && (
                                <div className="text-center py-10 text-gray-500">
                                    No webinars found. Create one to get started.
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <form onSubmit={handleSaveWebinar} className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-white">
                                {editingWebinar?.title ? 'Edit Webinar' : 'New Webinar'}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setIsEditingWebinar(false)}
                                className="text-sm text-gray-400 hover:text-white"
                            >
                                Cancel
                            </button>
                        </div>

                        <div className="bg-gray-900/40 border border-white/10 rounded-xl p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Webinar Title</label>
                                    <input
                                        type="text"
                                        value={editingWebinar?.title || ""}
                                        onChange={(e) => setEditingWebinar({ ...editingWebinar, title: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                        placeholder="Webinar Title"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Date</label>
                                    <input
                                        type="date"
                                        value={editingWebinar?.date ? new Date(editingWebinar.date).toISOString().split('T')[0] : ""}
                                        onChange={(e) => setEditingWebinar({ ...editingWebinar, date: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Duration</label>
                                    <input
                                        type="text"
                                        value={editingWebinar?.duration || ""}
                                        onChange={(e) => setEditingWebinar({ ...editingWebinar, duration: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                        placeholder="e.g. 45 min"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label>
                                <textarea
                                    value={editingWebinar?.description || ""}
                                    onChange={(e) => setEditingWebinar({ ...editingWebinar, description: e.target.value })}
                                    rows={4}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                    placeholder="Description..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Video URL</label>
                                <input
                                    type="text"
                                    value={editingWebinar?.video_url || ""}
                                    onChange={(e) => setEditingWebinar({ ...editingWebinar, video_url: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                    placeholder="https://..."
                                />
                            </div>

                            {/* Tags & New Flag */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tags</label>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={currentTag}
                                            onChange={(e) => setCurrentTag(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                            className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                            placeholder="Add a tag..."
                                            list="tag-suggestions"
                                        />
                                        <datalist id="tag-suggestions">
                                            {allUniqueTags.map((tag: any) => <option key={tag} value={tag} />)}
                                        </datalist>
                                        <button type="button" onClick={addTag} className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-lg font-bold">+</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {editingWebinar?.tags?.map((tag: string) => (
                                            <span key={tag} className="bg-primary/20 text-primary text-xs px-2 py-1 rounded flex items-center gap-1">
                                                {tag}
                                                <button type="button" onClick={() => removeTag(tag)} className="hover:text-white">&times;</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${editingWebinar?.is_new ? 'bg-primary border-primary' : 'border-gray-500 bg-transparent'}`}>
                                            {editingWebinar?.is_new && <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={editingWebinar?.is_new || false}
                                            onChange={(e) => setEditingWebinar({ ...editingWebinar, is_new: e.target.checked })}
                                        />
                                        <span className="font-bold text-gray-300 group-hover:text-white transition-colors">Mark as "New"</span>
                                    </label>
                                </div>
                            </div>

                            {/* Associated Products */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Associated Products</label>
                                    <button type="button" onClick={addProduct} className="text-xs text-primary hover:text-white font-bold">+ Add Product</button>
                                </div>
                                <div className="space-y-4">
                                    {editingWebinar?.associated_products?.map((prod: any, idx: number) => (
                                        <div key={idx} className="bg-black/30 border border-white/5 rounded-lg p-3 relative">
                                            <button type="button" onClick={() => removeProduct(idx)} className="absolute top-2 right-2 text-red-500 hover:text-red-400">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                            <div className="mb-2">
                                                <label className="block text-[10px] text-gray-500 mb-1">Select from Database (Auto-fill)</label>
                                                <select
                                                    className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-sm text-white"
                                                    onChange={(e) => {
                                                        const selected = products.find(p => p.id.toString() === e.target.value);
                                                        if (selected) {
                                                            const updatedProducts = [...editingWebinar.associated_products];
                                                            updatedProducts[idx] = {
                                                                name: selected.name,
                                                                link: selected.link,
                                                                image_url: selected.image_url
                                                            };
                                                            setEditingWebinar({ ...editingWebinar, associated_products: updatedProducts });
                                                        }
                                                    }}
                                                    value=""
                                                >
                                                    <option value="">-- Helper: Select Product --</option>
                                                    {Array.isArray(products) && products.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Product Name"
                                                    value={prod.name}
                                                    onChange={(e) => updateProduct(idx, 'name', e.target.value)}
                                                    className="bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Link"
                                                    value={prod.link}
                                                    onChange={(e) => updateProduct(idx, 'link', e.target.value)}
                                                    className="bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Image URL"
                                                value={prod.image_url || ""}
                                                onChange={(e) => updateProduct(idx, 'image_url', e.target.value)}
                                                className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white text-xs font-mono mt-2"
                                            />
                                        </div>
                                    ))}
                                    {(!editingWebinar?.associated_products || editingWebinar.associated_products.length === 0) && (
                                        <p className="text-xs text-gray-600 italic">No products linked.</p>
                                    )}
                                </div>
                            </div>

                            {/* Authors */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Speaker / Authors</label>
                                    <button type="button" onClick={addAuthor} className="text-xs text-primary hover:text-white font-bold">+ Add Author</button>
                                </div>
                                <div className="space-y-4">
                                    {editingWebinar?.authors?.map((author: any, idx: number) => (
                                        <div key={idx} className="bg-black/30 border border-white/5 rounded-lg p-3 relative">
                                            <button type="button" onClick={() => removeAuthor(idx)} className="absolute top-2 right-2 text-red-500 hover:text-red-400">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    placeholder="First Name"
                                                    value={author.firstName}
                                                    onChange={(e) => updateAuthor(idx, 'firstName', e.target.value)}
                                                    className="bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Last Name"
                                                    value={author.name}
                                                    onChange={(e) => updateAuthor(idx, 'name', e.target.value)}
                                                    className="bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    placeholder="Title / Role"
                                                    value={author.title}
                                                    onChange={(e) => updateAuthor(idx, 'title', e.target.value)}
                                                    className="bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Institute"
                                                    value={author.institute}
                                                    onChange={(e) => updateAuthor(idx, 'institute', e.target.value)}
                                                    className="bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Photo URL"
                                                value={author.photo}
                                                onChange={(e) => updateAuthor(idx, 'photo', e.target.value)}
                                                className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white text-xs font-mono"
                                            />
                                            <input
                                                type="text"
                                                placeholder="LinkedIn URL"
                                                value={author.linkedin || ""}
                                                onChange={(e) => updateAuthor(idx, 'linkedin', e.target.value)}
                                                className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white text-xs font-mono mt-2"
                                            />
                                        </div>
                                    ))}
                                    {(!editingWebinar?.authors || editingWebinar.authors.length === 0) && (
                                        <p className="text-xs text-gray-600 italic">No authors added.</p>
                                    )}
                                </div>
                            </div>


                        </div>

                        <div className="flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={() => setIsEditingWebinar(false)}
                                className="px-6 py-3 rounded-lg text-sm font-bold text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-8 py-3 bg-primary text-black rounded-lg font-bold uppercase text-sm hover:bg-white transition-colors shadow-lg shadow-primary/20"
                            >
                                Save Webinar
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
