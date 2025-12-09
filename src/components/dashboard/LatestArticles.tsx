"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Article {
    id: number;
    title: string;
    publication_date: string;
    journal: string;
    first_author: string;
}

export function LatestArticles() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/articles')
            .then(res => res.json())
            .then(data => {
                if (data.articles) {
                    setArticles(data.articles.slice(0, 3));
                }
            })
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }, []);

    if (isLoading) return <div className="animate-pulse h-40 bg-white/5 rounded-lg"></div>;
    if (articles.length === 0) return null;

    return (
        <section>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-widest">
                <span className="w-2 h-2 bg-white rounded-full"></span>
                Latest Scientific Updates
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {articles.map((article) => (
                    <Link href={`/articles/${article.id}`} key={article.id} className="glass-card p-6 min-h-[200px] flex flex-col justify-between hover:border-primary/50 cursor-pointer group transition-all hover:-translate-y-1">
                        <div>
                            <div className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest border border-white/10 inline-block px-2 py-1 rounded">
                                {article.journal || "Article"}
                            </div>
                            <h4 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors line-clamp-2">
                                {article.title}
                            </h4>
                            <p className="text-sm text-gray-400">
                                by {article.first_author} et al.
                            </p>
                        </div>
                        <div className="mt-4 flex items-center text-xs text-gray-500 font-medium">
                            <span>{new Date(article.publication_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
