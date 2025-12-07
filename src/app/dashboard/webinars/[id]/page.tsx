"use client";

import { useEffect, useState } from "react";
import { ContentItem } from "@/types/content";



export default function WebinarDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const [id, setId] = useState<string | null>(null);
    const [webinar, setWebinar] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        params.then(p => setId(p.id));
    }, [params]);

    useEffect(() => {
        if (!id) return;

        fetch(`/api/webinars?id=${id}`)
            .then(res => res.json())
            .then(data => {
                if (data.webinar) {
                    setWebinar(data.webinar);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }, [id]);

    if (!id || isLoading) return <div className="p-10 text-center text-gray-400 animate-pulse">Loading Webinar...</div>;

    if (!webinar) return <div className="p-10 text-center text-gray-500">Webinar not found.</div>;

    // Parse specific fields if they come as strings, though the API might return objects depending on content-type header
    // Ideally the API route returns them as objects if they are JSONB in DB and we used standard pg client, 
    // but @vercel/postgres sometimes returns strings for jsonb. Let's be safe.
    const authors = typeof webinar.authors === 'string' ? JSON.parse(webinar.authors) : webinar.authors || [];
    const products = typeof webinar.associated_products === 'string' ? JSON.parse(webinar.associated_products) : webinar.associated_products || [];

    // Extract YouTube ID
    const youtubeId = webinar.video_url?.includes('v=') ? webinar.video_url.split('v=')[1]?.split('&')[0] : null;
    const embedUrl = youtubeId ? `https://www.youtube.com/embed/${youtubeId}` : webinar.video_url;

    return (
        <div className="animate-fade-in max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-8">

                {/* Main Content (Video Player) */}
                <div className="flex-1">
                    {/* Video Player */}
                    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 relative group mb-6">
                        {youtubeId ? (
                            <iframe
                                width="100%"
                                height="100%"
                                src={embedUrl}
                                title={webinar.title}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="absolute inset-0 w-full h-full"
                            ></iframe>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                Video URL format not recognized or missing.
                            </div>
                        )}
                    </div>

                    {/* Title & Actions */}
                    <h1 className="text-2xl font-bold text-white mb-2">{webinar.title}</h1>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-4 mb-6 gap-4">
                        <div className="flex gap-4 text-sm text-gray-400">
                            <span>{webinar.duration || "N/A"}</span>
                            <span>•</span>
                            <span>{new Date(webinar.created_at).toLocaleDateString()}</span>
                        </div>

                        <div className="flex gap-4">
                            {/* Actions Buttons */}
                            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-sm font-bold text-gray-300">
                                Share
                            </button>
                        </div>
                    </div>

                    {/* Description Box */}
                    <div className="bg-white/5 rounded-xl p-6 mb-8">
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">About this session</h3>
                        <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                            {webinar.description}
                        </p>
                    </div>



                </div>

                {/* Right Sidebar (Suggested) */}
                {/* Right Sidebar (Speakers & Products) */}
                <div className="w-full lg:w-[350px] flex-shrink-0 flex flex-col gap-8">

                    {/* Speakers Section */}
                    {authors.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-white mb-4">Speakers</h3>
                            <div className="flex flex-col gap-3">
                                {authors.map((author: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                                        <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                                            {author.photo ? <img src={author.photo} alt={author.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-white">{author.firstName?.[0]}</div>}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-white">{author.firstName} {author.name}</div>
                                            <div className="text-[10px] text-primary">{author.title}</div>
                                            <div className="text-[10px] text-gray-400">{author.institute}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Associated Products Section */}
                    {products.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-white mb-4">Featured Products</h3>
                            <div className="flex flex-col gap-2">
                                {products.map((prod: any, idx: number) => (
                                    <a key={idx} href={prod.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 px-3 py-2 rounded-lg transition-colors group">
                                        <span className="font-bold text-sm text-primary group-hover:text-white transition-colors">{prod.name}</span>
                                        <svg className="w-3 h-3 text-primary ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                </div>

            </div>
        </div>
    );
}
