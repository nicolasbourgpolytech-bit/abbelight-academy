"use client";

import { useUser } from "@/context/UserContext";
import { useState, useEffect } from "react";

export default function DebugPage() {
    const { user } = useUser();
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchDebug = async () => {
        if (!user?.email) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/debug?email=${encodeURIComponent(user.email)}`);
            const json = await res.json();
            setData(json);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchDebug();
    }, [user]);

    if (!user) return <div className="p-10 text-white">Please log in.</div>;

    return (
        <div className="p-8 text-white space-y-8 pb-20">
            <h1 className="text-3xl font-bold text-red-500">Debug Console</h1>
            <p>Use this page to check the raw data stored in your database.</p>

            <button
                onClick={fetchDebug}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 transition"
            >
                Refresh Data
            </button>

            {isLoading && <div className="text-gray-400">Loading...</div>}

            {/* Error Display */}
            {data?.error && (
                <div className="bg-red-900/50 p-6 rounded-xl border border-red-500 mb-8">
                    <h3 className="text-xl font-bold text-red-500 flex items-center gap-2">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        API Error Detected
                    </h3>
                    <pre className="mt-4 bg-black/50 p-4 rounded text-red-200 overflow-auto whitespace-pre-wrap font-mono text-sm">
                        {JSON.stringify(data.error, null, 2)}
                    </pre>
                    <div className="mt-4 flex flex-col gap-2">
                        <button
                            onClick={async () => {
                                if (!confirm("Create Progress Tables?")) return;
                                try {
                                    const res = await fetch('/api/setup-progress-db');
                                    alert(JSON.stringify(await res.json()));
                                    window.location.reload();
                                } catch (e) { alert("Failed: " + e); }
                            }}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-colors text-sm"
                        >
                            1. Create Progress Tables
                        </button>
                        <button
                            onClick={async () => {
                                if (!confirm("Create Learning Path Tables?")) return;
                                try {
                                    const res = await fetch('/api/setup-learning-paths-db');
                                    alert(JSON.stringify(await res.json()));
                                    window.location.reload();
                                } catch (e) { alert("Failed: " + e); }
                            }}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold transition-colors text-sm"
                        >
                            2. Create Learning Path Tables
                        </button>
                        <button
                            onClick={async () => {
                                if (!confirm("Create Modules Tables?")) return;
                                try {
                                    const res = await fetch('/api/seed');
                                    alert(JSON.stringify(await res.json()));
                                    window.location.reload();
                                } catch (e) { alert("Failed: " + e); }
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-colors text-sm"
                        >
                            3. Create Modules/Chapters Tables
                        </button>
                    </div>
                </div>
            )}

            {/* Client Side Context Check */}
            <div className="mb-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-2">Client Context State</h3>
                <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                    <div>
                        <span className="text-gray-500">Email:</span> <span className="text-white">{user?.email}</span>
                    </div>
                    <div>
                        <span className="text-gray-500">ID:</span> <span className="text-white">{user?.id}</span>
                    </div>
                </div>
            </div>

            {data && !data.error && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* User Record */}
                    <div className="bg-gray-900 p-4 rounded border border-white/10">
                        <h2 className="font-bold text-xl mb-4 text-blue-400">User Record (From DB)</h2>
                        <pre className="text-xs bg-black p-4 rounded overflow-auto h-64 border border-white/5">
                            {JSON.stringify(data.user, null, 2)}
                        </pre>
                    </div>

                    {/* Module Progress */}
                    <div className="bg-gray-900 p-4 rounded border border-white/10">
                        <h2 className="font-bold text-xl mb-4 text-green-400">Module Progress ({data.moduleProgress?.length})</h2>
                        <pre className="text-xs bg-black p-4 rounded overflow-auto h-64 border border-white/5">
                            {JSON.stringify(data.moduleProgress, null, 2)}
                        </pre>
                    </div>

                    {/* Chapter Progress */}
                    <div className="bg-gray-900 p-4 rounded border border-white/10">
                        <h2 className="font-bold text-xl mb-4 text-yellow-400">Chapter Progress ({data.chapterProgress?.length})</h2>
                        <pre className="text-xs bg-black p-4 rounded overflow-auto h-64 border border-white/5">
                            {JSON.stringify(data.chapterProgress, null, 2)}
                        </pre>
                    </div>

                    {/* Learning Paths */}
                    <div className="bg-gray-900 p-4 rounded border border-white/10">
                        <h2 className="font-bold text-xl mb-4 text-purple-400">User Learning Paths ({data.paths?.length})</h2>
                        <pre className="text-xs bg-black p-4 rounded overflow-auto h-64 border border-white/5">
                            {JSON.stringify(data.paths, null, 2)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}
