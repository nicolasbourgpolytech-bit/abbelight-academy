"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";

export default function ProductsAdminPage() {
    const { user } = useUser();
    const [products, setProducts] = useState<any[]>([]);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [isEditingProduct, setIsEditingProduct] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (user?.roles.includes('abbelighter_admin')) {
            fetch('/api/products')
                .then(res => res.json())
                .then(data => setProducts(data || []))
                .catch(err => console.error(err));
        }
    }, [user]);

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const isUpdate = !!editingProduct.id;
            const method = isUpdate ? 'PUT' : 'POST';

            // Ensure category is set (default to SAFe instrument if missing from old data)
            const productPayload = {
                ...editingProduct,
                category: editingProduct.category || "SAFe instrument"
            };

            const res = await fetch('/api/products', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productPayload),
            });
            const data = await res.json();
            if (res.ok) {
                alert("Product saved!");
                if (isUpdate) {
                    setProducts(products.map(p => p.id === data.id ? data : p));
                } else {
                    setProducts([data, ...products]);
                }
                setIsEditingProduct(false);
            } else {
                alert("Error: " + data.error);
            }
        } catch (e: any) {
            console.error(e);
            alert("Failed to save product. Details: " + (e.message || e));
        }
    };

    const handleDeleteProduct = async (id: number) => {
        if (!confirm("Delete product?")) return;
        try {
            const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
            if (res.ok) setProducts(products.filter(p => p.id !== id));
            else alert("Failed to delete product");
        } catch (e) { alert("Error deleting product"); }
    };

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                setEditingProduct({ ...editingProduct, image_url: data.url });
            } else {
                alert("Upload failed: " + data.error);
            }
        } catch (error) {
            alert("Upload error");
        } finally {
            setUploading(false);
        }
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
                <h1 className="text-3xl font-bold text-white mb-2">Products Management</h1>
                <p className="text-gray-400">Manage product catalog and images.</p>
            </div>

            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                {!isEditingProduct ? (
                    <>
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-white">Products List</h2>
                            <button
                                onClick={() => {
                                    setEditingProduct({
                                        name: "",
                                        description: "",
                                        link: "",
                                        image_url: "",
                                        category: "SAFe instrument",
                                        subcategory: "",
                                        reference: "",
                                        magnification: null,
                                        na: null,
                                        immersion: "",
                                        tube_lens_focal_length: null
                                    });
                                    setIsEditingProduct(true);
                                }}
                                className="bg-primary text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-white transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                New Product
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {products.map((product: any) => (
                                <div key={product.id} className="bg-gray-900/40 border border-white/10 rounded-xl p-4 flex gap-4 hover:border-primary/30 transition-colors group">
                                    <div className="w-20 h-20 bg-black/50 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/5">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-gray-600 text-xs">No Img</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-white mb-1 group-hover:text-primary transition-colors">{product.name}</h3>
                                        {product.category === "3rd party instrument" ? (
                                            <div className="mb-2">
                                                <p className="text-xs text-primary font-semibold">{product.subcategory}</p>
                                                {product.subcategory === "Objective lens" && (
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        <span className="text-gray-500">Ref:</span> {product.reference} | <span className="text-gray-500">Mag:</span> {product.magnification}x | <span className="text-gray-500">NA:</span> {product.na} | <span className="text-gray-500">Imm:</span> {product.immersion}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 mb-1">{product.category}</p>
                                        )}
                                        <p className="text-xs text-gray-500 mb-2 truncate">{product.link}</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditingProduct(product);
                                                    setIsEditingProduct(true);
                                                }}
                                                className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-gray-300 transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteProduct(product.id)}
                                                className="text-xs px-2 py-1 bg-white/5 hover:bg-red-900/20 text-gray-300 hover:text-red-500 rounded transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {products.length === 0 && <p className="text-gray-500 text-center py-10 col-span-2">No products found.</p>}
                        </div>
                    </>
                ) : (
                    <form onSubmit={handleSaveProduct} className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-white">
                                {editingProduct?.name ? 'Edit Product' : 'New Product'}
                            </h2>
                            <button type="button" onClick={() => setIsEditingProduct(false)} className="text-sm text-gray-400 hover:text-white">Cancel</button>
                        </div>

                        <div className="bg-gray-900/40 border border-white/10 rounded-xl p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Product Name</label>
                                    <input
                                        type="text"
                                        value={editingProduct?.name || ""}
                                        onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                        placeholder="e.g. SAFe 360"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Category</label>
                                    <select
                                        value={editingProduct?.category || "SAFe instrument"}
                                        onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                    >
                                        <option value="SAFe instrument">SAFe instrument</option>
                                        <option value="Smart Reagent">Smart Reagent</option>
                                        <option value="NEO Software">NEO Software</option>
                                        <option value="3rd party instrument">3rd party instrument</option>
                                    </select>
                                </div>

                                {editingProduct?.category === "3rd party instrument" && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Subcategory</label>
                                        <select
                                            value={editingProduct?.subcategory || ""}
                                            onChange={(e) => setEditingProduct({ ...editingProduct, subcategory: e.target.value })}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                        >
                                            <option value="">-- Select --</option>
                                            <option value="Objective lens">Objective lens</option>
                                            <option value="Microscope body">Microscope body</option>
                                            <option value="Camera">Camera</option>
                                            <option value="Light source">Light source</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {editingProduct?.category === "3rd party instrument" && editingProduct?.subcategory === "Objective lens" && (
                                <div className="space-y-6 border-t border-white/10 pt-6 mt-6">
                                    <h3 className="text-lg font-bold text-primary">Optical Parameters</h3>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Reference</label>
                                        <input
                                            type="text"
                                            value={editingProduct?.reference || ""}
                                            onChange={(e) => setEditingProduct({ ...editingProduct, reference: e.target.value })}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                            placeholder="e.g. OBJ-1234"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Magnification (4-100)</label>
                                            <input
                                                type="number"
                                                min="4"
                                                max="100"
                                                value={editingProduct?.magnification || ""}
                                                onChange={(e) => setEditingProduct({ ...editingProduct, magnification: e.target.value ? parseInt(e.target.value) : "" })}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">NA (0.2-1.7)</label>
                                            <input
                                                type="text"
                                                value={editingProduct?.na || ""}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/,/g, '.');
                                                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                        setEditingProduct({ ...editingProduct, na: val })
                                                    }
                                                }}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                                placeholder="e.g. 1.45"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Immersion Medium</label>
                                            <select
                                                value={editingProduct?.immersion || ""}
                                                onChange={(e) => setEditingProduct({ ...editingProduct, immersion: e.target.value })}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                            >
                                                <option value="">-- Select --</option>
                                                <option value="Air">Air (n=1)</option>
                                                <option value="Water">Water (n=1.33)</option>
                                                <option value="Silicon oil">Silicon oil (n=1.4)</option>
                                                <option value="Oil">Oil (n=1.518)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tube Lens Focal Length (mm)</label>
                                            <input
                                                type="text"
                                                value={editingProduct?.tube_lens_focal_length || ""}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/,/g, '.');
                                                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                        setEditingProduct({ ...editingProduct, tube_lens_focal_length: val })
                                                    }
                                                }}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                                placeholder="e.g. 200"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3 pt-2">
                                        <input
                                            type="checkbox"
                                            id="correction_collar"
                                            checked={!!editingProduct?.correction_collar}
                                            onChange={(e) => setEditingProduct({ ...editingProduct, correction_collar: e.target.checked })}
                                            className="w-5 h-5 bg-black/50 border border-white/10 rounded focus:ring-primary text-primary"
                                        />
                                        <label htmlFor="correction_collar" className="text-sm font-bold text-gray-300 select-none cursor-pointer">
                                            Correction Collar
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label>
                                <textarea
                                    value={editingProduct?.description || ""}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                                    rows={3}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Product Page Link</label>
                                <input
                                    type="text"
                                    value={editingProduct?.link || ""}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, link: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Image URL</label>
                                <div className="flex gap-4">
                                    <input
                                        type="text"
                                        value={editingProduct?.image_url || ""}
                                        onChange={(e) => setEditingProduct({ ...editingProduct, image_url: e.target.value })}
                                        className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                    />
                                    <label className={`px-4 py-3 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <input type="file" className="hidden" onChange={handleUploadImage} disabled={uploading} accept="image/*" />
                                        {uploading ? '...' : 'Upload'}
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4">
                            <button type="button" onClick={() => setIsEditingProduct(false)} className="px-6 py-3 rounded-lg text-sm font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
                            <button type="submit" className="px-8 py-3 bg-primary text-black rounded-lg font-bold uppercase text-sm hover:bg-white transition-colors shadow-lg shadow-primary/20">Save Product</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
