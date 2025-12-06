"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
            fetch('/api/articles')
                .then(res => res.json())
                .then(data => {
                    if (data.articles) setArticles(data.articles);
                })
                .catch(err => console.error(err));
        }
    }, [isAuthenticated]);

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
        setEditingWebinar({ ...editingWebinar, associated_products: [...currentProducts, { name: "", link: "" }] });
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
        setEditingWebinar({ ...editingWebinar, authors: [...currentAuthors, { name: "", firstName: "", title: "", institute: "", photo: "" }] });
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

    const handleImportArticles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm("Importing will add articles to the database. Ensure CSV format is: Title, Description, Content, CoverImageURL, Tags(semicolon sep), Date(YYYY-MM-DD). Continue?")) {
            e.target.value = ''; // Reset
            return;
        }

        setImporting(true);
        try {
            const text = await file.text();
            const lines = text.split('\n');
            let success = 0;

            for (let i = 1; i < lines.length; i++) { // Skip header
                const line = lines[i].trim();
                // Regex to split by comma outside quotes
                const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

                if (cols.length >= 2) {
                    const clean = (s: string) => s ? s.replace(/^"|"$/g, '').replace(/""/g, '"').trim() : '';

                    const title = clean(cols[0]);
                    const description = clean(cols[1]);
                    const content = clean(cols[2]);
                    const cover_image = clean(cols[3]);
                    const tagsStr = clean(cols[4]);
                    const date = clean(cols[5]);

                    if (!title) continue;

                    const tags = tagsStr ? tagsStr.split(';').map(t => t.trim()) : [];

                    await fetch('/api/articles', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title, description, content, cover_image, tags, date,
                            is_new: true,
                            authors: [], associated_products: []
                        })
                    });
                    success++;
                }
            }
            alert(`Imported ${success} articles successfully.`);
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

    // Article Helpers
    const addArticleTag = () => {
        if (!currentTag.trim()) return;
        const currentTags = editingArticle.tags || [];
        if (!currentTags.includes(currentTag.trim())) {
            setEditingArticle({ ...editingArticle, tags: [...currentTags, currentTag.trim()] });
        }
        setCurrentTag("");
    };

    const removeArticleTag = (tagToRemove: string) => {
        const currentTags = editingArticle.tags || [];
        setEditingArticle({ ...editingArticle, tags: currentTags.filter((t: string) => t !== tagToRemove) });
    };

    const addArticleAuthor = () => {
        const currentAuthors = editingArticle.authors || [];
        setEditingArticle({ ...editingArticle, authors: [...currentAuthors, { name: "", firstName: "", title: "", institute: "", photo: "" }] });
    };

    const removeArticleAuthor = (idx: number) => {
        const apps = editingArticle.authors || [];
        setEditingArticle({ ...editingArticle, authors: apps.filter((_: any, i: number) => i !== idx) });
    };

    const updateArticleAuthor = (idx: number, field: string, value: string) => {
        const apps = [...(editingArticle.authors || [])];
        apps[idx] = { ...apps[idx], [field]: value };
        setEditingArticle({ ...editingArticle, authors: apps });
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
                                placeholder="••••••••"
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
                    <span className="font-bold tracking-tight">Abbelight Academy <span className="text-gray-500 font-normal">| Admin</span></span>
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
                                            <div className="space-y-2">
                                                {editingWebinar?.associated_products?.map((prod: any, idx: number) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Product Name"
                                                            value={prod.name}
                                                            onChange={(e) => updateProduct(idx, 'name', e.target.value)}
                                                            className="flex-1 bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Link"
                                                            value={prod.link}
                                                            onChange={(e) => updateProduct(idx, 'link', e.target.value)}
                                                            className="flex-1 bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                                        />
                                                        <button type="button" onClick={() => removeProduct(idx)} className="text-red-500 hover:text-red-400 p-2">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                        </button>
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
                                                            <span className="text-xs bg-white/5 px-2 py-0.5 rounded text-gray-400">{new Date(article.date).toLocaleDateString()}</span>
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
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Article Title</label>
                                                <input
                                                    type="text"
                                                    value={editingArticle?.title || ""}
                                                    onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                                    placeholder="Article Title"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Date</label>
                                                <input
                                                    type="date"
                                                    value={editingArticle?.date ? new Date(editingArticle.date).toISOString().split('T')[0] : ""}
                                                    onChange={(e) => setEditingArticle({ ...editingArticle, date: e.target.value })}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description (Summary)</label>
                                            <textarea
                                                value={editingArticle?.description || ""}
                                                onChange={(e) => setEditingArticle({ ...editingArticle, description: e.target.value })}
                                                rows={3}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                                placeholder="Short summary..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Content (Markdown/HTML)</label>
                                            <textarea
                                                value={editingArticle?.content || ""}
                                                onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                                                rows={10}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors font-mono text-sm"
                                                placeholder="# Title\n\nContent..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cover Image URL</label>
                                            <input
                                                type="text"
                                                value={editingArticle?.cover_image || ""}
                                                onChange={(e) => setEditingArticle({ ...editingArticle, cover_image: e.target.value })}
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
                                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addArticleTag())}
                                                        className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                                        placeholder="Add a tag..."
                                                        list="tag-suggestions"
                                                    />
                                                    <datalist id="tag-suggestions">
                                                        {allUniqueTags.map((tag: any) => <option key={tag} value={tag} />)}
                                                    </datalist>
                                                    <button type="button" onClick={addArticleTag} className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-lg font-bold">+</button>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {editingArticle?.tags?.map((tag: string) => (
                                                        <span key={tag} className="bg-primary/20 text-primary text-xs px-2 py-1 rounded flex items-center gap-1">
                                                            {tag}
                                                            <button type="button" onClick={() => removeArticleTag(tag)} className="hover:text-white">&times;</button>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${editingArticle?.is_new ? 'bg-primary border-primary' : 'border-gray-500 bg-transparent'}`}>
                                                        {editingArticle?.is_new && <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={editingArticle?.is_new || false}
                                                        onChange={(e) => setEditingArticle({ ...editingArticle, is_new: e.target.checked })}
                                                    />
                                                    <span className="font-bold text-gray-300 group-hover:text-white transition-colors">Mark as "New"</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Authors */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-xs font-bold text-gray-500 uppercase">Authors</label>
                                                <button type="button" onClick={addArticleAuthor} className="text-xs text-primary hover:text-white font-bold">+ Add Author</button>
                                            </div>
                                            <div className="space-y-4">
                                                {editingArticle?.authors?.map((author: any, idx: number) => (
                                                    <div key={idx} className="bg-black/30 border border-white/5 rounded-lg p-3 relative">
                                                        <button type="button" onClick={() => removeArticleAuthor(idx)} className="absolute top-2 right-2 text-red-500 hover:text-red-400">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                        </button>
                                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                                            <input
                                                                type="text"
                                                                placeholder="First Name"
                                                                value={author.firstName}
                                                                onChange={(e) => updateArticleAuthor(idx, 'firstName', e.target.value)}
                                                                className="bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="Last Name"
                                                                value={author.name}
                                                                onChange={(e) => updateArticleAuthor(idx, 'name', e.target.value)}
                                                                className="bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
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
                </main>
            </div >
        </div >
    );
}
