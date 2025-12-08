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

            {data && (
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
