"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MultiSelect } from "@/components/admin/MultiSelect";

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [activeTab, setActiveTab] = useState("modules");
    const [isEditing, setIsEditing] = useState(false);
    const [editingModule, setEditingModule] = useState<any>(null);

    // Webinar State
    const [webinars, setWebinars] = useState<any[]>([]);
    const [editingWebinar, setEditingWebinar] = useState<any>(null);
    const [isEditingWebinar, setIsEditingWebinar] = useState(false);
    const [currentTag, setCurrentTag] = useState("");

    // Article State
    const [articles, setArticles] = useState<any[]>([]);
    const [editingArticle, setEditingArticle] = useState<any>(null);
    const [isEditingArticle, setIsEditingArticle] = useState(false);
    const [importing, setImporting] = useState(false);

    // User State
    const [users, setUsers] = useState<any[]>([]);
    const [userFilterStatus, setUserFilterStatus] = useState<string>('all');

    // Product State
    const [products, setProducts] = useState<any[]>([]);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [isEditingProduct, setIsEditingProduct] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Derived state for tag suggestions (Webinars + Articles)
    const allUniqueTags = Array.from(new Set([
        ...webinars.flatMap(w => {
            if (Array.isArray(w.tags)) return w.tags;
            if (typeof w.tags === 'string') return JSON.parse(w.tags);
            return [];
        }),
        ...articles.flatMap(a => {
            if (Array.isArray(a.tags)) return a.tags;
            if (typeof a.tags === 'string') return JSON.parse(a.tags);
            return [];
        })
    ])).sort();

    const getUniqueValues = (field: string) => Array.from(new Set(
        articles.flatMap(a => {
            const val = a[field];
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') {
                try {
                    const parsed = JSON.parse(val);
                    return Array.isArray(parsed) ? parsed : [val];
                } catch { return [val]; }
            }
            return [];
        })
    )).sort();

    const uniqueAppDomains = getUniqueValues('application_domain');
    const uniqueImgMethods = getUniqueValues('imaging_method');
    const uniqueModalities = getUniqueValues('abbelight_imaging_modality');
    const uniqueProducts = getUniqueValues('abbelight_product');

    const fieldOptions: Record<string, string[]> = {
        application_domain: uniqueAppDomains,
        imaging_method: uniqueImgMethods,
        abbelight_imaging_modality: uniqueModalities,
        abbelight_product: uniqueProducts
    };

    const [modules, setModules] = useState<any[]>([]);

    const [selectedModuleForChapters, setSelectedModuleForChapters] = useState<any>(null);
    const [chapters, setChapters] = useState<any[]>([]);
    const [newChapter, setNewChapter] = useState({ title: "", type: "video", content_url: "", duration: "5 min", data: {} });

    // Fetch chapters when a module is selected
    useEffect(() => {
        if (selectedModuleForChapters) {
            fetch(`/api/chapters?moduleId=${selectedModuleForChapters.id}`)
                .then(res => res.json())
                .then(data => setChapters(data.chapters || []))
                .catch(err => console.error(err));
        }
    }, [selectedModuleForChapters]);

    const handleSaveChapter = async () => {
        if (!newChapter.title || !selectedModuleForChapters) return alert("Title required");

        try {
            const isUpdate = !!(newChapter as any).id;
            const method = isUpdate ? 'PUT' : 'POST';

            const res = await fetch('/api/chapters', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newChapter,
                    module_id: selectedModuleForChapters.id
                }),
            });
            const data = await res.json();
            if (res.ok) {
                if (isUpdate) {
                    setChapters(chapters.map(c => c.id === data.chapter.id ? data.chapter : c));
                } else {
                    setChapters([...chapters, data.chapter]);
                }
                setNewChapter({ title: "", type: "video", content_url: "", duration: "5 min", data: {} });
            } else {
                alert(data.error);
            }
        } catch (e) { alert("Error saving chapter"); }
    };

    const handleDeleteChapter = async (id: number) => {
        if (!confirm("Delete chapter?")) return;
        await fetch(`/api/chapters?id=${id}`, { method: 'DELETE' });
        setChapters(chapters.filter(c => c.id !== id));
    };

    const fetchArticles = () => {
        fetch('/api/articles')
            .then(res => res.json())
            .then(data => {
                if (data.articles) setArticles(data.articles);
            })
            .catch(err => console.error(err));
    };

    const fetchProducts = () => {
        fetch('/api/products')
            .then(res => res.json())
            .then(data => setProducts(data || []))
            .catch(err => console.error(err));
    };

    // Fetch data on load
    useEffect(() => {
        if (isAuthenticated) {
            // Fetch modules
            fetch('/api/modules')
                .then(res => res.json())
                .then(data => {
                    if (data.modules) setModules(data.modules);
                })
                .catch(err => console.error(err));

            // Fetch webinars
            fetch('/api/webinars')
                .then(res => res.json())
                .then(data => {
                    if (data.webinars) setWebinars(data.webinars);
                })
                .catch(err => console.error(err));

            // Fetch articles
            fetchArticles();

            // Fetch users
            fetchUsers();

            // Fetch products
            fetchProducts();
        }
    }, [isAuthenticated]);

    // Re-fetch users when filter changes
    useEffect(() => {
        if (isAuthenticated && activeTab === 'users') {
            fetchUsers();
        }
    }, [userFilterStatus, activeTab]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Hardcoded password for MVP - user can change this
        if (password === "admin123" || password === "abbelight") {
            setIsAuthenticated(true);
        } else {
            alert("Incorrect Password");
        }
    };

    const handleSaveModule = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const isUpdate = !!editingModule.id;
            const method = isUpdate ? 'PUT' : 'POST';

            const res = await fetch('/api/modules', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingModule),
            });
            const data = await res.json();

            if (res.ok) {
                alert("Module saved successfully!");
                if (isUpdate) {
                    setModules(modules.map(m => m.id === data.module.id ? data.module : m));
                } else {
                    setModules([data.module, ...modules]);
                }
                setIsEditing(false);
            } else {
                alert("Error: " + data.error);
            }
        } catch (error) {
            alert("Failed to save module");
        }
    };

    const handleDeleteModule = async (id: number) => {
        if (!confirm("Are you sure you want to delete this module? This cannot be undone.")) return;

        try {
            const res = await fetch(`/api/modules?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setModules(modules.filter(m => m.id !== id));
            } else {
                alert("Failed to delete module");
            }
        } catch (e) {
            alert("Error deleting module");
        }
    };

    // --- PRODUCT HANDLERS ---

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const isUpdate = !!editingProduct.id;
            const method = isUpdate ? 'PUT' : 'POST';

            const res = await fetch('/api/products', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingProduct),
            });
            const data = await res.json();

            if (res.ok) {
                alert("Product saved!");
                fetchProducts();
                setIsEditingProduct(false);
            } else {
                alert("Error: " + data.error);
            }
        } catch (error) {
            alert("Failed to save product");
        }
    };

    const handleDeleteProduct = async (id: number) => {
        if (!confirm("Delete this product?")) return;
        try {
            await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
            fetchProducts();
        } catch (e) { alert("Error deleting product"); }
    };

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                setEditingProduct({ ...editingProduct, image_url: data.url });
            } else {
                alert("Upload failed");
            }
        } catch (error) {
            alert("Upload error");
        } finally {
            setUploading(false);
        }
    };

    // --- WEBINAR HANDLERS ---

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

    // --- USER HANDLERS ---

    const fetchUsers = async () => {
        try {
            const url = userFilterStatus === 'all'
                ? '/api/admin/users'
                : `/api/admin/users?status=${userFilterStatus}`;

            const res = await fetch(url);
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        }
    };

    const handleApproveUser = async (userId: number) => {
        if (!confirm("Approve this user and send password?")) return;

        try {
            const res = await fetch('/api/admin/users/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            const data = await res.json();

            if (res.ok) {
                alert(`User Approved! Temp Password: ${data.tempPassword} (Email Mocked)`);
                fetchUsers(); // Refresh
            } else {
                alert("Error: " + data.error);
            }
        } catch (error) {
            alert("Request failed");
        }
    };

    const getUserStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-500/20 text-green-400 border-green-500/20';
            case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20';
            case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/20';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/20';
        }
    };

    const handleRejectUser = async (userId: number) => {
        if (!confirm("Are you sure you want to reject this user?")) return;

        try {
            const res = await fetch('/api/admin/users/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            if (res.ok) {
                alert("User rejected.");
                fetchUsers(); // Refresh
            } else {
                const data = await res.json();
                alert("Error: " + data.error);
            }
        } catch (error) {
            alert("Request failed");
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (!confirm("Are you sure you want to PERMANENTLY delete this user?")) return;

        try {
            const res = await fetch(`/api/admin/users?id=${userId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                // alert("User deleted."); // Optional feedback
                fetchUsers(); // Refresh
            } else {
                const data = await res.json();
                alert("Error: " + data.error);
            }
        } catch (error) {
            alert("Request failed");
        }
    };

    // --- ARTICLE HANDLERS ---

    const handleSaveArticle = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const isUpdate = !!editingArticle.id;
            const method = isUpdate ? 'PUT' : 'POST';

            const res = await fetch('/api/articles', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingArticle),
            });
            const data = await res.json();

            if (res.ok) {
                alert("Article saved successfully!");
                if (isUpdate) {
                    setArticles(articles.map(a => a.id === data.article.id ? data.article : a));
                } else {
                    setArticles([data.article, ...articles]);
                }
                setIsEditingArticle(false);
            } else {
                alert("Error: " + (data.error?.message || JSON.stringify(data.error)));
            }
        } catch (error) {
            alert("Failed to save article");
        }
    };

    const handleDeleteArticle = async (id: number) => {
        if (!confirm("Are you sure you want to delete this article?")) return;
        try {
            const res = await fetch(`/api/articles?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setArticles(articles.filter(a => a.id !== id));
            } else {
                alert("Failed to delete article");
            }
        } catch (e) {
            alert("Error deleting article");
        }
    };

    const handleAnalyzeCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        if (lines.length < 2) return alert("Empty CSV");

        // Separator detection
        const header = lines[0];
        const semicolonCount = (header.match(/;/g) || []).length;
        const commaCount = (header.match(/,/g) || []).length;
        const separator = semicolonCount > commaCount ? ';' : ',';

        const splitRegex = new RegExp(`${separator}(?=(?:(?:[^"]*"){2})*[^"]*$)`);

        // Analyze first data row
        const firstRow = lines[1];
        const cols = firstRow.split(splitRegex);
        const clean = (s: string) => s ? s.replace(/^"|"$/g, '').replace(/""/g, '"').trim() : '';

        const msg = `
        Analysis Report:
        ----------------
        Separator Detected: "${separator}"
        Total Lines: ${lines.length}
        Columns in Row 1: ${cols.length} (Expected 11)
        
        Row 1 Data Preview:
        [0] Title: ${clean(cols[0])?.substring(0, 20)}...
        [5] Journal: ${clean(cols[5])}
        [6] First Author: ${clean(cols[6])}
        [7] Last Author: ${clean(cols[7])}
        [8] Customer: ${clean(cols[8])}
        [9] Date (Raw): "${clean(cols[9])}"
        [10] DOI: ${clean(cols[10])}
        `;

        alert(msg);
        e.target.value = ''; // Reset
    };

    const handleImportArticles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm("Importing will add articles to the database.\nEnsure CSV format is:\nTitle, Application Domain (sep ;), Imaging Method (sep ;), Modality (sep ;), Product (sep ;), Journal, First Author, Last Author, Customer, Date (YYYY-MM-DD), DOI.\nContinue?")) {
            e.target.value = ''; // Reset
            return;
        }

        setImporting(true);
        try {
            const text = await file.text();
            const lines = text.split('\n').filter(l => l.trim().length > 0);
            if (lines.length < 2) return alert("Empty CSV");

            // Detect separator from header
            const header = lines[0];
            const semicolonCount = (header.match(/;/g) || []).length;
            const commaCount = (header.match(/,/g) || []).length;
            const separator = semicolonCount > commaCount ? ';' : ',';

            console.log(`Detected CSV separator: '${separator}'`);

            // Regex: match separator only if not inside quotes
            const splitRegex = new RegExp(`${separator}(?=(?:(?:[^"]*"){2})*[^"]*$)`);

            let success = 0;
            let errors: string[] = [];

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                const cols = line.split(splitRegex);

                if (cols.length < 11) {
                    if (errors.length < 3) errors.push(`Line ${i + 1}: Found ${cols.length} columns, expected 11.`);
                    continue;
                }

                const clean = (s: string) => s ? s.replace(/^"|"$/g, '').replace(/""/g, '"').trim() : '';
                // For inner arrays, we assume they are separated by the OTHER separator or typical list chars like | or just ; if main is ,
                // But the requirement said "sep ;". If main separator is also ;, we have a problem unless quoted.
                // We will assume standard CSV: if cell contains separator, it MUST be quoted.
                // Our regex handles that. So inner content can have semicolons if quoted.

                const splitArray = (s: string) => s ? s.split(/[;|]/).map(v => v.trim()).filter(Boolean) : [];

                const title = clean(cols[0]);
                const application_domain = splitArray(clean(cols[1]));
                const imaging_method = splitArray(clean(cols[2]));
                const abbelight_imaging_modality = splitArray(clean(cols[3]));
                const abbelight_product = splitArray(clean(cols[4]));
                const journal = clean(cols[5]);
                const first_author = clean(cols[6]);
                const last_author = clean(cols[7]);
                const abbelight_customer = clean(cols[8]);
                let publication_date: string | null = clean(cols[9]);

                // Handle empty date or invalid format strictly, convert DD/MM/YYYY
                if (!publication_date) {
                    publication_date = null;
                } else if (publication_date.includes('/')) {
                    const parts = publication_date.split('/');
                    if (parts.length === 3) {
                        publication_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                }

                const doi_link = clean(cols[10]);

                if (!title) {
                    errors.push(`Line ${i + 1}: Missing title`);
                    continue;
                }

                const res = await fetch('/api/articles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title, application_domain, imaging_method,
                        abbelight_imaging_modality, abbelight_product,
                        journal, first_author, last_author, abbelight_customer,
                        publication_date, doi_link
                    })
                });

                if (res.ok) {
                    success++;
                } else {
                    const d = await res.json();
                    errors.push(`Line ${i + 1}: API Error - ${typeof d.error === 'object' ? JSON.stringify(d.error) : d.error}`);
                }
            }

            if (success === 0 && errors.length > 0) {
                alert(`Import Failed. 0/${lines.length - 1} imported. \nSeparator detected: "${separator}"\nErrors:\n${errors.join('\n')}`);
            } else {
                alert(`Imported ${success} articles successfully. ${errors.length > 0 ? `\nWith some errors:\n${errors.slice(0, 5).join('\n')}` : ''}`);
            }

            // Refresh
            const res = await fetch('/api/articles');
            const data = await res.json();
            if (data.articles) setArticles(data.articles);

        } catch (err) {
            alert("Error importing: " + err);
        } finally {
            setImporting(false);
            e.target.value = '';
        }
    };



    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 pattern-grid opacity-20"></div>
                <div className="w-full max-w-md bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 text-primary mb-4">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white">Admin Access</h1>
                        <p className="text-gray-400 text-sm mt-2">Enter your credentials to manage content.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-primary text-black font-bold uppercase text-sm py-3 rounded-lg hover:bg-white transition-colors shadow-lg shadow-primary/20"
                        >
                            Login
                        </button>
                    </form>
                    <div className="mt-6 text-center">
                        <Link href="/" className="text-xs text-gray-500 hover:text-white transition-colors">Back to Home</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Header */}
            <header className="h-16 border-b border-white/10 bg-gray-900/50 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center font-bold text-black">A</div>
                    <span className="font-bold tracking-tight">Abbelight Academy <span className="text-gray-500 font-normal">| Admin</span> <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded ml-2 border border-primary/30">v2.1</span></span>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/academy" className="text-sm text-gray-400 hover:text-white transition-colors">View Site</Link>
                    <button onClick={() => setIsAuthenticated(false)} className="text-sm text-red-500 hover:text-red-400 transition-colors">Logout</button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 border-r border-white/10 bg-black/20 hidden md:flex flex-col">
                    <nav className="p-4 space-y-1">
                        <button
                            onClick={() => setActiveTab("modules")}
                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'modules' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-gray-400 hover:bg-white/5 hooker:text-white'}`}
                        >
                            Modules
                        </button>
                        <button
                            onClick={() => setActiveTab("media")}
                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'media' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-gray-400 hover:bg-white/5 hooker:text-white'}`}
                        >
                            Media Library
                        </button>
                        <button
                            onClick={() => setActiveTab("webinars")}
                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'webinars' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-gray-400 hover:bg-white/5 hooker:text-white'}`}
                        >
                            Webinars
                        </button>
                        <button
                            onClick={() => setActiveTab("users")}
                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-gray-400 hover:bg-white/5 hooker:text-white'}`}
                        >
                            Users
                        </button>
                        <button
                            onClick={() => setActiveTab("articles")}
                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'articles' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-gray-400 hover:bg-white/5 hooker:text-white'}`}
                        >
                            Articles
                        </button>
                        <button
                            onClick={() => setActiveTab("products")}
                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'products' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-gray-400 hover:bg-white/5 hooker:text-white'}`}
                        >
                            Products
                        </button>
                    </nav>
                </aside>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-8">
                    {activeTab === 'modules' && (
                        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                            {!isEditing ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">Modules</h2>
                                            <p className="text-gray-400 text-sm">Manage your course content and structure.</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditingModule({ title: "", description: "", level: "Beginner", xp: 100 });
                                                setIsEditing(true);
                                            }}
                                            className="bg-primary text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-white transition-colors flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            New Module
                                        </button>
                                    </div>

                                    {/* Mock List of Modules */}
                                    <div className="space-y-4">
                                        {modules.map((module: any) => (
                                            <div key={module.id} className="bg-gray-900/40 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-primary/30 transition-colors group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-16 h-16 bg-gray-800 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-500 font-bold text-xl">
                                                        M{module.id}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-white group-hover:text-primary transition-colors">{module.title}</h3>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className="text-xs bg-white/5 px-2 py-0.5 rounded text-gray-400">{module.xp} XP</span>
                                                            <span className="text-xs bg-white/5 px-2 py-0.5 rounded text-gray-400">{module.level}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setSelectedModuleForChapters(module)}
                                                        className="px-3 py-1.5 bg-white/5 text-white text-xs font-bold rounded hover:bg-white/10 border border-white/10 mr-2"
                                                    >
                                                        Manage Content
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingModule(module);
                                                            setIsEditing(true);
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Edit"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteModule(module.id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {modules.length === 0 && (
                                            <div className="text-center py-10 text-gray-500">
                                                No modules found. Create one to get started.
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <form onSubmit={handleSaveModule} className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold text-white">
                                            {editingModule?.title ? 'Edit Module' : 'New Module'}
                                        </h2>
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="text-sm text-gray-400 hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                    </div>

                                    <div className="bg-gray-900/40 border border-white/10 rounded-xl p-6 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Module Title</label>
                                                <input
                                                    type="text"
                                                    value={editingModule?.title || ""}
                                                    onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                                    placeholder="e.g. Intro to Microscopy"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">XP Reward</label>
                                                <input
                                                    type="number"
                                                    value={editingModule?.xp || 0}
                                                    onChange={(e) => setEditingModule({ ...editingModule, xp: parseInt(e.target.value) })}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label>
                                            <textarea
                                                value={editingModule?.description || ""}
                                                onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })}
                                                rows={4}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                                placeholder="What will the user learn?"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Difficulty Level</label>
                                            <div className="flex gap-4">
                                                {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
                                                    <button
                                                        key={level}
                                                        type="button"
                                                        onClick={() => setEditingModule({ ...editingModule, level })}
                                                        className={`px-4 py-2 rounded-lg text-sm border transition-colors ${editingModule?.level === level ? 'bg-primary text-black border-primary font-bold' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}
                                                    >
                                                        {level}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="px-6 py-3 rounded-lg text-sm font-bold text-gray-400 hover:text-white transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-8 py-3 bg-primary text-black rounded-lg font-bold uppercase text-sm hover:bg-white transition-colors shadow-lg shadow-primary/20"
                                        >
                                            Save Module
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}


                    {/* CHAPTER MANAGEMENT OVERLAY */}
                    {activeTab === 'modules' && !isEditing && selectedModuleForChapters && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                            <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Manage Content</h3>
                                        <p className="text-gray-400 text-sm">Chapters for: <span className="text-primary">{selectedModuleForChapters.title}</span></p>
                                    </div>
                                    <button onClick={() => setSelectedModuleForChapters(null)} className="text-gray-400 hover:text-white">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    {/* List Chapters */}
                                    <div className="space-y-3">
                                        {chapters.map((chapter: any, idx) => (
                                            <div key={chapter.id} className="bg-black/40 border border-white/5 p-4 rounded-lg flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-gray-500 font-mono text-sm">#{idx + 1}</span>
                                                    <div>
                                                        <div className="font-bold text-white flex items-center gap-2">
                                                            {chapter.title}
                                                            <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${chapter.type === 'video' ? 'border-blue-500 text-blue-500' :
                                                                chapter.type === 'quiz' ? 'border-purple-500 text-purple-500' :
                                                                    'border-yellow-500 text-yellow-500'
                                                                }`}>{chapter.type}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setNewChapter(chapter)}
                                                        className="text-gray-400 hover:text-white px-2 transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteChapter(chapter.id)}
                                                        className="text-gray-400 hover:text-red-500 px-2 transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {chapters.length === 0 && <p className="text-gray-500 text-center py-4">No chapters yet.</p>}
                                    </div>

                                    {/* Add/Edit Chapter Form */}
                                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                                        <h4 className="text-sm font-bold text-white uppercase mb-4">
                                            {(newChapter as any).id ? 'Edit Chapter' : 'Add New Chapter'}
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <input
                                                type="text"
                                                placeholder="Chapter Title"
                                                className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                                value={newChapter.title}
                                                onChange={e => setNewChapter({ ...newChapter, title: e.target.value })}
                                            />
                                            <select
                                                className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                                value={newChapter.type}
                                                onChange={e => setNewChapter({ ...newChapter, type: e.target.value })}
                                            >
                                                <option value="video">Video</option>
                                                <option value="slides">Slides</option>
                                                <option value="quiz">Quiz</option>
                                            </select>
                                        </div>
                                        <div className="mb-4">
                                            <input
                                                type="text"
                                                placeholder={newChapter.type === 'video' ? "Video URL (mp4 or youtube)" : "Content URL / JSON Data"}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono"
                                                value={newChapter.content_url || ""}
                                                onChange={e => setNewChapter({ ...newChapter, content_url: e.target.value })}
                                            />
                                            <p className="text-xs text-gray-500 mt-1">For MVP, paste a direct MP4 link here for videos.</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <button onClick={handleSaveChapter} className="flex-1 bg-primary text-black font-bold text-sm py-2 rounded-lg hover:bg-white transition-colors">
                                                {(newChapter as any).id ? 'Save Changes' : 'Add Chapter'}
                                            </button>
                                            {(newChapter as any).id && (
                                                <button
                                                    onClick={() => setNewChapter({ title: "", type: "video", content_url: "", duration: "5 min", data: {} })}
                                                    className="px-4 py-2 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                                                >
                                                    Cancel Edit
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'media' && (
                        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Media Library</h2>
                                    <p className="text-gray-400 text-sm">Upload videos and images for your courses.</p>
                                </div>
                                <button className="bg-white/10 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-white/20 transition-colors flex items-center gap-2 border border-white/10">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Upload File
                                </button>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center border-dashed">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
                                    <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <h3 className="text-lg font-bold text-white">No media found</h3>
                                <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">Upload files to easy access them when creating your course modules.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'webinars' && (
                        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                            {!isEditingWebinar ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">Webinars</h2>
                                            <p className="text-gray-400 text-sm">Manage your webinar content.</p>
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
                                                                {products.map(p => (
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
                    )}

                    {activeTab === 'articles' && (
                        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                            {!isEditingArticle ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">Articles</h2>
                                            <p className="text-gray-400 text-sm">Manage blog posts and technical articles.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <label className={`bg-white/10 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-white/20 transition-colors flex items-center gap-2 border border-white/10 cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                {importing ? 'Importing...' : 'Import CSV'}
                                                <input type="file" accept=".csv" onChange={handleImportArticles} className="hidden" disabled={importing} />
                                            </label>
                                            <label className="bg-white/10 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-white/20 transition-colors flex items-center gap-2 border border-white/10 cursor-pointer">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                                Analyze CSV
                                                <input type="file" accept=".csv" onChange={handleAnalyzeCSV} className="hidden" />
                                            </label>
                                            <button
                                                onClick={() => {
                                                    setEditingArticle({
                                                        title: "", description: "", content: "", cover_image: "",
                                                        authors: [], tags: [], is_new: false,
                                                        date: new Date().toISOString().split('T')[0]
                                                    });
                                                    setIsEditingArticle(true);
                                                }}
                                                className="bg-primary text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-white transition-colors flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                New Article
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {articles.map((article: any) => (
                                            <div key={article.id} className="bg-gray-900/40 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-primary/30 transition-colors group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-16 h-16 bg-gray-800 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-500 font-bold text-xl overflow-hidden">
                                                        {article.cover_image ? <img src={article.cover_image} alt="" className="w-full h-full object-cover" /> : 'A' + article.id}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-white group-hover:text-primary transition-colors">{article.title}</h3>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className="text-xs bg-white/5 px-2 py-0.5 rounded text-gray-400">{new Date(article.publication_date).toLocaleDateString()}</span>
                                                            <div className="flex gap-1">
                                                                {article.tags?.slice(0, 3).map((t: string) => <span key={t} className="text-[10px] bg-primary/10 text-primary px-1 rounded">{t}</span>)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingArticle(article);
                                                            setIsEditingArticle(true);
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Edit"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteArticle(article.id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {articles.length === 0 && (
                                            <div className="text-center py-10 text-gray-500">
                                                No articles found. Create one or Import CSV.
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <form onSubmit={handleSaveArticle} className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold text-white">
                                            {editingArticle?.title ? 'Edit Article' : 'New Article'}
                                        </h2>
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingArticle(false)}
                                            className="text-sm text-gray-400 hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                    </div>

                                    <div className="bg-gray-900/40 border border-white/10 rounded-xl p-6 space-y-6">
                                        {/* Title & Date */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Paper Title</label>
                                                <input
                                                    type="text"
                                                    value={editingArticle?.title || ""}
                                                    onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                                    placeholder="Title"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Publication Date</label>
                                                <input
                                                    type="date"
                                                    value={editingArticle?.publication_date ? new Date(editingArticle.publication_date).toISOString().split('T')[0] : ""}
                                                    onChange={(e) => setEditingArticle({ ...editingArticle, publication_date: e.target.value })}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                                />
                                            </div>
                                        </div>

                                        {/* Single Text Fields */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Journal</label>
                                                <input
                                                    type="text"
                                                    value={editingArticle?.journal || ""}
                                                    onChange={(e) => setEditingArticle({ ...editingArticle, journal: e.target.value })}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                                    placeholder="Nature"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">First Author</label>
                                                <input
                                                    type="text"
                                                    value={editingArticle?.first_author || ""}
                                                    onChange={(e) => setEditingArticle({ ...editingArticle, first_author: e.target.value })}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                                    placeholder="Smith A."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Last Author</label>
                                                <input
                                                    type="text"
                                                    value={editingArticle?.last_author || ""}
                                                    onChange={(e) => setEditingArticle({ ...editingArticle, last_author: e.target.value })}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                                    placeholder="Doe J."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Abbelight Customer</label>
                                                <input
                                                    type="text"
                                                    value={editingArticle?.abbelight_customer || ""}
                                                    onChange={(e) => setEditingArticle({ ...editingArticle, abbelight_customer: e.target.value })}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                                    placeholder="Institute / Lab Name"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">DOI Link</label>
                                                <input
                                                    type="text"
                                                    value={editingArticle?.doi_link || ""}
                                                    onChange={(e) => setEditingArticle({ ...editingArticle, doi_link: e.target.value })}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                                    placeholder="https://doi.org/..."
                                                />
                                            </div>
                                        </div>

                                        {/* Array Fields */}
                                        <div className="space-y-6">
                                            {[
                                                { label: "Application Domain", field: "application_domain" },
                                                { label: "Imaging Method", field: "imaging_method" },
                                                { label: "Abbelight Modality", field: "abbelight_imaging_modality" },
                                                { label: "Abbelight Product", field: "abbelight_product" },
                                            ].map((item) => (
                                                <MultiSelect
                                                    key={item.field}
                                                    label={item.label}
                                                    value={Array.isArray(editingArticle?.[item.field]) ? editingArticle?.[item.field] : []}
                                                    options={fieldOptions[item.field] || []}
                                                    onChange={(val) => setEditingArticle({ ...editingArticle, [item.field]: val })}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingArticle(false)}
                                            className="px-6 py-3 rounded-lg text-sm font-bold text-gray-400 hover:text-white transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-8 py-3 bg-primary text-black rounded-lg font-bold uppercase text-sm hover:bg-white transition-colors shadow-lg shadow-primary/20"
                                        >
                                            Save Article
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">User Management</h2>
                                    <p className="text-gray-400 text-sm">Validate new account requests and manage permissions.</p>
                                </div>
                                <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                                    {['all', 'pending', 'active', 'rejected'].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setUserFilterStatus(status)}
                                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${userFilterStatus === status
                                                ? 'bg-primary text-black shadow-lg'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {users.length === 0 ? (
                                <div className="text-center py-20 bg-white/5 rounded-xl border border-white/10">
                                    <p className="text-gray-400 text-lg">No users found</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {users.map((user: any) => (
                                        <div key={user.id} className="bg-white/5 border border-white/10 p-6 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-white/[0.07] transition-colors group">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{user.first_name} {user.last_name}</h3>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase border ${getUserStatusColor(user.status)}`}>
                                                        {user.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                                    <span className="flex items-center gap-2">
                                                        📧 {user.email}
                                                    </span>
                                                    <span className="flex items-center gap-2">
                                                        🏢 {user.company}
                                                    </span>
                                                </div>
                                                <div className="pt-2">
                                                    <span className="px-2 py-1 rounded bg-white/5 text-gray-300 text-xs border border-white/10">
                                                        {Array.isArray(user.roles) ? user.roles.join(', ') : (typeof user.roles === 'string' ? JSON.parse(user.roles).join(', ') : "general")}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Registered: {new Date(user.created_at).toLocaleDateString()}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {user.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApproveUser(user.id)}
                                                            className="px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 rounded-lg font-semibold transition-colors text-sm"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectUser(user.id)}
                                                            className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg font-semibold transition-colors text-sm"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                {user.status === 'active' && (
                                                    <button className="px-4 py-2 bg-white/5 text-gray-400 border border-white/10 rounded-lg font-semibold text-sm cursor-not-allowed opacity-50">
                                                        Active
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-lg font-semibold transition-colors text-sm ml-2"
                                                    title="Permanently Delete User"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'products' && (
                        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                            {!isEditingProduct ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">Products</h2>
                                            <p className="text-gray-400 text-sm">Manage associated products library.</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditingProduct({ name: "", link: "", image_url: "", description: "" });
                                                setIsEditingProduct(true);
                                            }}
                                            className="bg-primary text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-white transition-colors flex items-center gap-2"
                                        >
                                            + New Product
                                        </button>
                                    </div>
                                    <div className="grid gap-4">
                                        {products.map((prod: any) => (
                                            <div key={prod.id} className="bg-gray-900/40 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-primary/30 transition-colors group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-16 h-16 bg-gray-800 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-500 font-bold text-xl overflow-hidden border border-white/5">
                                                        {prod.image_url ? <img src={prod.image_url} alt="" className="w-full h-full object-cover" /> : prod.name?.[0]}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-white group-hover:text-primary transition-colors">{prod.name}</h3>
                                                        <div className="text-xs text-gray-400 truncate max-w-md">{prod.description || prod.link}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingProduct(prod);
                                                            setIsEditingProduct(true);
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteProduct(prod.id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {products.length === 0 && <p className="text-center text-gray-500 py-10">No products found.</p>}
                                    </div>
                                </>
                            ) : (
                                <form onSubmit={handleSaveProduct} className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold text-white">{editingProduct.id ? 'Edit Product' : 'New Product'}</h2>
                                        <button type="button" onClick={() => setIsEditingProduct(false)} className="text-sm text-gray-400 hover:text-white">Cancel</button>
                                    </div>
                                    <div className="bg-gray-900/40 border border-white/10 rounded-xl p-6 space-y-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Product Name</label>
                                            <input
                                                type="text"
                                                value={editingProduct.name}
                                                onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Link</label>
                                            <input
                                                type="text"
                                                value={editingProduct.link || ""}
                                                onChange={e => setEditingProduct({ ...editingProduct, link: e.target.value })}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Product Image</label>
                                            <div className="flex items-center gap-4">
                                                <div className="w-20 h-20 bg-black/50 border border-white/10 rounded-lg flex items-center justify-center overflow-hidden">
                                                    {editingProduct.image_url ? (
                                                        <img src={editingProduct.image_url} alt="Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-gray-600 text-xs">No Image</span>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleUploadImage}
                                                        className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-colors"
                                                        disabled={uploading}
                                                    />
                                                    {uploading && <p className="text-xs text-primary mt-1">Uploading...</p>}
                                                    <input
                                                        type="text"
                                                        value={editingProduct.image_url || ""}
                                                        onChange={e => setEditingProduct({ ...editingProduct, image_url: e.target.value })}
                                                        className="w-full bg-black/50 border border-white/10 rounded mt-2 px-2 py-1 text-xs text-gray-400 font-mono"
                                                        placeholder="Or paste URL..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label>
                                            <textarea
                                                value={editingProduct.description || ""}
                                                onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                                                rows={3}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-4">
                                        <button type="submit" className="px-8 py-3 bg-primary text-black rounded-lg font-bold uppercase text-sm hover:bg-white transition-colors">
                                            Save Product
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </main>
            </div >
        </div >
    );
}
