"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ContentItem } from "@/types/content";

// Temporary Mock Data for Detail Page (ideally fetched from backend)
const MOCK_WEBINAR_DETAILS: Record<string, ContentItem> = {
    "1": {
        id: "1",
        title: "Mastering SMLM: From Sample to Image",
        description: "A comprehensive walkthrough of the Single Molecule Localization Microscopy workflow. In this hour-long session, we cover:\n\n1. Sample Preparation best practices\n2. Selecting the right fluorophores\n3. Optimizing buffer conditions\n4. Acquisition strategies on SAFe 360\n\nPerfect for new users and those looking to refine their technique.",
        date: "2025-11-15",
        type: "webinar",
        url: "/dashboard/webinars/1",
        duration: "45 min",
        tags: ["SMLM", "Sample Prep", "Education"]
    },
    // Add fallback for others if needed or handle 404
};

const SUGGESTED_WEBINARS = [
    { id: "2", title: "Live Q&A: Advanced Data Analysis", thumbnail: "", duration: "60 min", views: "1.2k" },
    { id: "3", title: "Breakthroughs in Neurobiology", thumbnail: "", duration: "50 min", views: "850" },
    { id: "4", title: "Intro to Super-Resolution", thumbnail: "", duration: "30 min", views: "2.4k" },
];

export default function WebinarDetailPage({ params }: { params: Promise<{ id: string }> }) {
    // Fix for Next.js 15+ param handling: unwrap promise
    const [id, setId] = useState<string | null>(null);

    useEffect(() => {
        params.then(p => setId(p.id));
    }, [params]);

    if (!id) return <div className="p-10 text-center">Loading...</div>;

    const video = MOCK_WEBINAR_DETAILS["1"]; // For demo, always load ID 1 content or fallback
    const displayVideo = video || { ...MOCK_WEBINAR_DETAILS["1"], title: `Webinar ID: ${id} (Demo Content)` };

    return (
        <div className="animate-fade-in max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-8">

                {/* Main Content (Video Player) */}
                <div className="flex-1">
                    {/* Video Player (YouTube Embed) */}
                    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 relative group mb-6">
                        <iframe
                            width="100%"
                            height="100%"
                            src="https://www.youtube.com/embed/YOSO7gJl4tA?autoplay=0&rel=0"
                            title="Abbelight Webinar"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0 w-full h-full"
                        ></iframe>
                    </div>

                    {/* Title & Actions */}
                    <h1 className="text-2xl font-bold text-white mb-2">{displayVideo.title}</h1>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-4 mb-6 gap-4">
                        <div className="flex gap-4 text-sm text-gray-400">
                            <span>1,024 views</span>
                            <span>•</span>
                            <span>{new Date(displayVideo.date).toLocaleDateString()}</span>
                        </div>

                        <div className="flex gap-4">
                            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-sm font-bold text-gray-300">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                                Like
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-sm font-bold text-gray-300">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                Share
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-full hover:bg-white transition-colors text-sm font-bold">
                                Download Slides
                            </button>
                        </div>
                    </div>

                    {/* Description Box */}
                    <div className="bg-white/5 rounded-xl p-4">
                        <div className="flex gap-2 flex-wrap mb-4">
                            {displayVideo.tags?.map(tag => (
                                <span key={tag} className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">#{tag}</span>
                            ))}
                        </div>
                        <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                            {displayVideo.description}
                        </p>
                        <button className="text-gray-500 text-sm font-bold mt-4 hover:text-white uppercase">Show Transcripts</button>
                    </div>

                    {/* Comments Placeholder */}
                    <div className="mt-8">
                        <h3 className="text-xl font-bold text-white mb-4">2 Comments</h3>
                        <div className="flex gap-4 mb-6">
                            <div className="w-10 h-10 bg-gray-700 rounded-full flex-shrink-0 flex items-center justify-center font-bold">JD</div>
                            <div className="flex-1">
                                <input type="text" placeholder="Add a comment..." className="w-full bg-transparent border-b border-gray-700 pb-2 focus:border-primary focus:outline-none text-white transition-colors" />
                            </div>
                        </div>

                        <div className="flex gap-4 mb-4">
                            <div className="w-10 h-10 bg-purple-900 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs">AS</div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-sm text-white">Alice Sci</span>
                                    <span className="text-xs text-gray-500">2 days ago</span>
                                </div>
                                <p className="text-gray-400 text-sm">Great overview of the buffer preparation! Very helpful.</p>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right Sidebar (Suggested) */}
                <div className="w-full lg:w-[350px] flex-shrink-0">
                    <h3 className="text-lg font-bold text-white mb-4">Up Next</h3>
                    <div className="flex flex-col gap-4">
                        {SUGGESTED_WEBINARS.map(rec => (
                            <div key={rec.id} className="flex gap-3 group cursor-pointer">
                                <div className="w-40 h-24 bg-gray-800 rounded-lg relative overflow-hidden flex-shrink-0 border border-white/10 group-hover:border-primary/50 transition-colors">
                                    {/* Thumbnail Placeholder */}
                                    <div className="absolute inset-0 flex items-center justify-center text-white/10">
                                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </div>
                                    <div className="absolute bottom-1 right-1 bg-black/80 px-1 rounded text-[10px] font-mono">{rec.duration}</div>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-white line-clamp-2 mb-1 group-hover:text-primary transition-colors">{rec.title}</h4>
                                    <div className="text-xs text-gray-500">Abbelight Academy</div>
                                    <div className="text-xs text-gray-500">{rec.views} views • 1 week ago</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
