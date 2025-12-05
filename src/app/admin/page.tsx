"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [activeTab, setActiveTab] = useState("modules");
    const [isEditing, setIsEditing] = useState(false);
    const [editingModule, setEditingModule] = useState<any>(null);

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
            const res = await fetch('/api/chapters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newChapter, module_id: selectedModuleForChapters.id }),
            });
            const data = await res.json();
            if (res.ok) {
                setChapters([...chapters, data.chapter]);
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

    // Fetch modules on load
    useEffect(() => {
        if (isAuthenticated) {
            fetch('/api/modules')
                .then(res => res.json())
                .then(data => {
                    if (data.modules) setModules(data.modules);
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
            const res = await fetch('/api/modules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingModule),
            });
            const data = await res.json();

            if (res.ok) {
                alert("Module saved successfully!");
                setModules([data.module, ...modules]);
                setIsEditing(false);
            } else {
                alert("Error: " + data.error);
            }
        } catch (error) {
            alert("Failed to save module");
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
                            onClick={() => setActiveTab("users")}
                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-gray-400 hover:bg-white/5 hooker:text-white'}`}
                        >
                            Users
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
                                                    <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
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
                                                <button onClick={() => handleDeleteChapter(chapter.id)} className="text-gray-500 hover:text-red-500 px-2">Delete</button>
                                            </div>
                                        ))}
                                        {chapters.length === 0 && <p className="text-gray-500 text-center py-4">No chapters yet.</p>}
                                    </div>

                                    {/* Add Chapter Form */}
                                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                                        <h4 className="text-sm font-bold text-white uppercase mb-4">Add New Chapter</h4>
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
                                                value={newChapter.content_url}
                                                onChange={e => setNewChapter({ ...newChapter, content_url: e.target.value })}
                                            />
                                            <p className="text-xs text-gray-500 mt-1">For MVP, paste a direct MP4 link here for videos.</p>
                                        </div>
                                        <button onClick={handleSaveChapter} className="w-full bg-primary text-black font-bold text-sm py-2 rounded-lg hover:bg-white transition-colors">
                                            Add Chapter
                                        </button>
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
                </main>
            </div >
        </div >
    );
}
