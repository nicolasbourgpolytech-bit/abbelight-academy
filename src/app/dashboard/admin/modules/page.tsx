"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { upload } from '@vercel/blob/client';
import RichTextEditor from "@/components/ui/RichTextEditor";

// --- Internal Components ---

interface QuizBuilderProps {
    data: any;
    onChange: (data: any) => void;
}

function QuizBuilder({ data, onChange }: QuizBuilderProps) {
    // Ensure data is array
    const questions = Array.isArray(data) ? data : [];

    const addQuestion = () => {
        onChange([
            ...questions,
            {
                id: `q${Date.now()}`,
                question: "",
                options: ["", "", "", ""],
                correctAnswer: 0,
                explanation: ""
            }
        ]);
    };

    const updateQuestion = (index: number, field: string, value: any) => {
        const newQuestions = [...questions];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        onChange(newQuestions);
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...questions];
        const newOptions = [...newQuestions[qIndex].options];
        newOptions[oIndex] = value;
        newQuestions[qIndex].options = newOptions;
        onChange(newQuestions);
    };

    const removeQuestion = (index: number) => {
        onChange(questions.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-6">
            {questions.map((q: any, qIndex: number) => (
                <div key={q.id || qIndex} className="bg-black/30 border border-white/10 p-4 rounded-xl">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-gray-500 uppercase">Question {qIndex + 1}</span>
                        <button type="button" onClick={() => removeQuestion(qIndex)} className="text-red-500 hover:text-red-400 text-xs">Remove</button>
                    </div>

                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Enter question here..."
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-bold"
                            value={q.question}
                            onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                        />
                    </div>

                    <div className="space-y-2 mb-4">
                        <label className="text-xs text-gray-500 block">Options (Click circle to select correct answer)</label>
                        {q.options.map((opt: string, oIndex: number) => (
                            <div key={oIndex} className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${q.correctAnswer === oIndex ? 'bg-green-500 border-green-500' : 'border-gray-600 hover:border-gray-400'}`}
                                >
                                    {q.correctAnswer === oIndex && <div className="w-2 h-2 bg-black rounded-full" />}
                                </button>
                                <input
                                    type="text"
                                    placeholder={`Option ${oIndex + 1}`}
                                    className={`flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm ${q.correctAnswer === oIndex ? 'border-green-500/50' : ''}`}
                                    value={opt}
                                    onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Explanation (Optional)</label>
                        <textarea
                            rows={2}
                            placeholder="Why is this answer correct?"
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                            value={q.explanation || ""}
                            onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                        />
                    </div>
                </div>
            ))}

            <button
                type="button"
                onClick={addQuestion}
                className="w-full py-3 border-2 border-dashed border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/30 transition-colors flex items-center justify-center gap-2 font-bold text-sm"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Question
            </button>
        </div>
    );
}


export default function ModulesAdminPage() {
    const { user } = useUser();
    const [modules, setModules] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editingModule, setEditingModule] = useState<any>(null);

    // Chapters State
    const [selectedModuleForChapters, setSelectedModuleForChapters] = useState<any>(null);
    const [chapters, setChapters] = useState<any[]>([]);
    const [newChapter, setNewChapter] = useState({ title: "", type: "video", content_url: "", duration: "5 min", description: "", data: {} as any });
    const [uploading, setUploading] = useState(false); // New upload state

    // Fetch Modules
    useEffect(() => {
        if (user?.roles.includes('abbelighter_admin')) {
            fetch('/api/modules')
                .then(res => res.json())
                .then(data => {
                    if (data.modules) setModules(data.modules);
                })
                .catch(err => console.error(err));
        }
    }, [user]);

    // Fetch chapters when a module is selected
    useEffect(() => {
        if (selectedModuleForChapters) {
            fetch(`/api/chapters?moduleId=${selectedModuleForChapters.id}`)
                .then(res => res.json())
                .then(data => setChapters(data.chapters || []))
                .catch(err => console.error(err));
        }
    }, [selectedModuleForChapters]);

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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        // Remove manual FormData fetch
        try {
            const newBlob = await upload(file.name, file, {
                access: 'public',
                handleUploadUrl: '/api/upload',
            });
            setNewChapter({ ...newChapter, content_url: newBlob.url });
        } catch (error) {
            alert("Upload error: " + (error as any).message);
        } finally {
            setUploading(false);
        }
    };

    const handleSaveChapter = async () => {
        if (!newChapter.title || !selectedModuleForChapters) return alert("Title required");
        try {
            // Parse JSON data if it's a string (from textarea)
            let parsedData = newChapter.data;
            if (typeof newChapter.data === 'string') {
                try {
                    parsedData = JSON.parse(newChapter.data);
                } catch (e) {
                    return alert("Invalid JSON Format in Data field");
                }
            }

            const isUpdate = !!(newChapter as any).id;
            const method = isUpdate ? 'PUT' : 'POST';
            const res = await fetch('/api/chapters', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newChapter,
                    data: { ...parsedData, description: (newChapter as any).description },
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
                setNewChapter({ title: "", type: "video", content_url: "", duration: "5 min", description: "", data: {} });
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
                <h1 className="text-3xl font-bold text-white mb-2">Modules Management</h1>
                <p className="text-gray-400">Create, edit, and organize learning modules.</p>
            </div>

            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                {!isEditing ? (
                    <>
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Modules List</h2>
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

            {/* CHAPTER MANAGEMENT OVERLAY */}
            {!isEditing && selectedModuleForChapters && (
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
                                                            chapter.type === 'pdf' ? 'border-red-500 text-red-500' :
                                                                'border-yellow-500 text-yellow-500'
                                                        }`}>{chapter.type}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setNewChapter({ ...chapter, description: chapter.data?.description || "" })}
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
                                        <option value="pdf">PDF Document</option>
                                        <option value="gif">GIF Animation</option>
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Content URL / File</label>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            placeholder={newChapter.type === 'video' ? "Video URL (mp4 or youtube)" : "Content URL"}
                                            className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono"
                                            value={newChapter.content_url || ""}
                                            onChange={e => setNewChapter({ ...newChapter, content_url: e.target.value })}
                                        />
                                        <label className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm flex items-center gap-2">
                                            {uploading ? (
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            )}
                                            Upload
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={handleFileUpload}
                                                accept={(newChapter.type === 'pdf' || newChapter.type === 'slides') ? '.pdf' : 'video/*,image/*'}
                                            />
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {newChapter.type === 'video' ? "Paste a direct link or upload an MP4." :
                                            (newChapter.type === 'pdf' || newChapter.type === 'slides') ? "Upload a PDF to create a lecture/carousel." :
                                                newChapter.type === 'gif' ? "Upload a GIF image." :
                                                    "URL for external content (optional)."}
                                    </p>
                                </div>

                                {newChapter.type === 'gif' && (
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label>
                                        <RichTextEditor
                                            value={(newChapter as any).description || ""}
                                            onChange={val => setNewChapter({ ...newChapter, description: val } as any)}
                                            placeholder="Describe the animation (colors, styles allowed)..."
                                        />
                                    </div>
                                )}

                                {(newChapter.type === 'quiz' || newChapter.type === 'slides') && (
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                            {newChapter.type === 'quiz' ? 'Quiz Configuration' : 'Slides Configuration (JSON)'}
                                        </label>

                                        {newChapter.type === 'quiz' ? (
                                            <QuizBuilder
                                                data={typeof newChapter.data === 'string' ? [] : newChapter.data}
                                                onChange={(newData) => setNewChapter({ ...newChapter, data: newData })}
                                            />
                                        ) : (
                                            <>
                                                <textarea
                                                    rows={6}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-mono"
                                                    placeholder='[{"question": "...", "options": [...], "correctAnswer": 0}]'
                                                    value={typeof newChapter.data === 'string' ? newChapter.data : JSON.stringify(newChapter.data, null, 2)}
                                                    onChange={e => setNewChapter({ ...newChapter, data: e.target.value })}
                                                />
                                                <p className="text-xs text-gray-500 mt-1">Paste your JSON configuration here.</p>
                                            </>
                                        )}
                                    </div>
                                )}
                                <div className="flex gap-4">
                                    <button onClick={handleSaveChapter} className="flex-1 bg-primary text-black font-bold text-sm py-2 rounded-lg hover:bg-white transition-colors">
                                        {(newChapter as any).id ? 'Save Changes' : 'Add Chapter'}
                                    </button>
                                    {(newChapter as any).id && (
                                        <button
                                            onClick={() => setNewChapter({ title: "", type: "video", content_url: "", duration: "5 min", description: "", data: {} })}
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
        </div>
    );
}
