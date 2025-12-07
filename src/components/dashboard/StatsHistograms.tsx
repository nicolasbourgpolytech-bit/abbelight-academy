"use client";

import { ContentItem } from "@/types/content";
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface StatsHistogramsProps {
    articles: ContentItem[];
}

export function StatsHistograms({ articles }: StatsHistogramsProps) {
    const data = useMemo(() => {
        const yearCounts: Record<string, number> = {};
        const domainCounts: Record<string, number> = {};

        articles.forEach(article => {
            // Count by Year
            if (article.date) {
                const year = new Date(article.date).getFullYear().toString();
                yearCounts[year] = (yearCounts[year] || 0) + 1;
            }

            // Count by Application Domain
            // Assuming applicationDomain is string[] based on previous file analysis
            if (Array.isArray(article.applicationDomain)) {
                article.applicationDomain.forEach(domain => {
                    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
                });
            }
        });

        const years = Object.entries(yearCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.name.localeCompare(a.name)); // Descending so latest year is processed first

        const domains = Object.entries(domainCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value) // Sort by count descending
            .slice(0, 5); // Top 5 domains to keep it compact

        return { years, domains };
    }, [articles]);

    if (articles.length === 0) return null;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-black/80 border border-white/10 p-2 rounded shadow-xl backdrop-blur-md">
                    <p className="text-xs font-bold text-white mb-1">{label}</p>
                    <p className="text-xs text-primary">{`${payload[0].value} Articles`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex gap-8 items-center">
            {/* Articles by Year */}
            <div className="w-80">
                <p className="text-xs uppercase tracking-widest mb-2 text-right text-cyan-500 font-semibold">By Year</p>
                <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%" className="[&_.recharts-surface]:outline-none [&_*]:outline-none [&_*]:focus:outline-none">
                        <BarChart data={data.years} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={40}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 500 }}
                                interval={0}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {data.years.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill="rgba(6, 182, 212, 0.7)" /> // brand-cyan
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Articles by Domain */}
            <div className="w-[28rem]">
                <p className="text-xs uppercase tracking-widest mb-2 text-right text-fuchsia-500 font-semibold">By Domain</p>
                <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%" className="[&_.recharts-surface]:outline-none [&_*]:outline-none [&_*]:focus:outline-none">
                        <BarChart data={data.domains} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={140}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 500 }}
                                interval={0}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {data.domains.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill="rgba(217, 70, 239, 0.7)" /> // brand-magenta
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
