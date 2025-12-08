"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Module {
    id: number;
    title: string;
    description: string;
}

interface LearningPath {
    id: number;
    title: string;
    description: string;
}

export default function EditLearningPathPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [path, setPath] = useState<LearningPath | null>(null);
    const [pathModules, setPathModules] = useState<Module[]>([]);
    const [allModules, setAllModules] = useState<Module[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form states
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [showAddModuleModal, setShowAddModuleModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Path Details
                const pathRes = await fetch(`/api/learning-paths/${id}`);
                if (!pathRes.ok) throw new Error('Failed to fetch path details');
                const pathData = await pathRes.json();

                setPath(pathData.path);
                setTitle(pathData.path.title);
                setDescription(pathData.path.description || "");
                setPathModules(pathData.modules || []);

                // Fetch All Modules for selection
                const modulesRes = await fetch('/api/modules');
                if (modulesRes.ok) {
                    const modulesData = await modulesRes.json();
                    setAllModules(modulesData.modules || []);
                }

            } catch (err) {
                setError((err as Error).message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(`/api/learning-paths/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description,
                    moduleIds: pathModules.map(m => m.id)
                }),
            });

            if (!response.ok) throw new Error('Failed to update path');

            // Show success feedback
            alert('Path updated successfully!');

        } catch (err) {
            alert('Error updating path: ' + (err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    const addModule = (module: Module) => {
        if (pathModules.find(m => m.id === module.id)) return;
        setPathModules([...pathModules, module]);
        setShowAddModuleModal(false);
    };

    const removeModule = (moduleId: number) => {
        setPathModules(pathModules.filter(m => m.id !== moduleId));
    };

    const moveModule = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === pathModules.length - 1) return;

        const newModules = [...pathModules];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newModules[index], newModules[swapIndex]] = [newModules[swapIndex], newModules[index]];
        setPathModules(newModules);
    };

    if (isLoading) return <div className="text-gray-500 text-center py-12">Loading editor...</div>;
    if (error) return <div className="text-red-500 text-center py-12">Error: {error}</div>;
    if (!path) return <div className="text-gray-500 text-center py-12">Path not found</div>;

    const availableModules = allModules.filter(m => !pathModules.find(pm => pm.id === m.id));

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/admin/learning-paths"
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Edit Learning Path</h1>
                        <p className="text-sm text-gray-400">Managing modules and settings for "{path.title}"</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content (Modules) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-white">Path Content</h2>
                            <button
                                onClick={() => setShowAddModuleModal(true)}
                                className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Module
                            </button>
                        </div>

                        <div className="space-y-3">
                            {pathModules.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-white/10 rounded-xl">
                                    No modules in this path yet.
                                </div>
                            ) : (
                                pathModules.map((module, index) => (
                                    <div key={module.id} className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-center gap-4 group hover:border-primary/30 transition-colors">
                                        <div className="text-gray-500 font-mono text-sm w-6 text-center">{index + 1}</div>
                                        <div className="flex-1">
                                            <h4 className="font-medium text-white">{module.title}</h4>
                                            <p className="text-xs text-gray-400 line-clamp-1">{module.description}</p>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => moveModule(index, 'up')}
                                                disabled={index === 0}
                                                className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white disabled:opacity-30"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => moveModule(index, 'down')}
                                                disabled={index === pathModules.length - 1}
                                                className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white disabled:opacity-30"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                            <div className="w-px h-4 bg-white/10 mx-1" />
                                            <button
                                                onClick={() => removeModule(module.id)}
                                                className="p-1.5 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-500"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Settings */}
                <div className="space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                        <h2 className="text-lg font-bold text-white mb-4">Settings</h2>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Description</label>
                            <textarea
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                            />
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4">Access Control</h2>
                        <p className="text-sm text-gray-500 italic">User assignment and prerequisites management coming soon.</p>
                    </div>
                </div>
            </div>

            {/* Add Module Modal */}
            {showAddModuleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddModuleModal(false)} />
                    <div className="relative bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-fade-in-up">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">Add Module to Path</h3>
                            <button onClick={() => setShowAddModuleModal(false)} className="text-gray-400 hover:text-white">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-2">
                            {availableModules.length === 0 ? (
                                <p className="text-center text-gray-500">No available modules to add.</p>
                            ) : (
                                availableModules.map((module) => (
                                    <button
                                        key={module.id}
                                        onClick={() => addModule(module)}
                                        className="w-full text-left bg-black/40 hover:bg-white/5 border border-white/5 hover:border-primary/30 p-4 rounded-xl transition-all group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-medium text-white group-hover:text-primary transition-colors">{module.title}</h4>
                                            <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">Add +</span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{module.description}</p>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
