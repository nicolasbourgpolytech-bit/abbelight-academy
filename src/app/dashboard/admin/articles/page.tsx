"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { MultiSelect } from "@/components/admin/MultiSelect";

export default function ArticlesAdminPage() {
    const { user } = useUser();
    const [articles, setArticles] = useState<any[]>([]);
    const [editingArticle, setEditingArticle] = useState<any>(null);
    const [isEditingArticle, setIsEditingArticle] = useState(false);
    const [importing, setImporting] = useState(false);

    // Derived state for multi-select options
    const getUniqueValues = (field: string) => Array.from(new Set(
        articles.flatMap(a => {
            const val = a[field];
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') {
                try {
                    const parsed = JSON.parse(val);
                    return Array.isArray(parsed) ? parsed : [val];
                } catch { return [val]; }
            }
            return [];
        })
    )).sort();

    const uniqueAppDomains = getUniqueValues('application_domain');
    const uniqueImgMethods = getUniqueValues('imaging_method');
    const uniqueModalities = getUniqueValues('abbelight_imaging_modality');
    const uniqueProducts = getUniqueValues('abbelight_product');

    const fieldOptions: Record<string, string[]> = {
        application_domain: uniqueAppDomains,
        imaging_method: uniqueImgMethods,
        abbelight_imaging_modality: uniqueModalities,
        abbelight_product: uniqueProducts
    };

    const fetchArticles = () => {
        fetch('/api/articles')
            .then(res => res.json())
            .then(data => {
                if (data.articles) setArticles(data.articles);
            })
            .catch(err => console.error(err));
    };

    useEffect(() => {
        if (user?.roles.includes('abbelighter_admin')) {
            fetchArticles();
        }
    }, [user]);

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

    const handleAnalyzeCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        if (lines.length < 2) return alert("Empty CSV");

        // Separator detection
        const header = lines[0];
        const semicolonCount = (header.match(/;/g) || []).length;
        const commaCount = (header.match(/,/g) || []).length;
        const separator = semicolonCount > commaCount ? ';' : ',';

        const splitRegex = new RegExp(`${separator}(?=(?:(?:[^"]*"){2})*[^"]*$)`);

        // Analyze first data row
        const firstRow = lines[1];
        const cols = firstRow.split(splitRegex);
        const clean = (s: string) => s ? s.replace(/^"|"$/g, '').replace(/""/g, '"').trim() : '';

        const msg = `
        Analysis Report:
        ----------------
        Separator Detected: "${separator}"
        Total Lines: ${lines.length}
        Columns in Row 1: ${cols.length} (Expected 11)
        
        Row 1 Data Preview:
        [0] Title: ${clean(cols[0])?.substring(0, 20)}...
        [5] Journal: ${clean(cols[5])}
        [6] First Author: ${clean(cols[6])}
        [7] Last Author: ${clean(cols[7])}
        [8] Customer: ${clean(cols[8])}
        [9] Date (Raw): "${clean(cols[9])}"
        [10] DOI: ${clean(cols[10])}
        `;

        alert(msg);
        e.target.value = ''; // Reset
    };

    const handleImportArticles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm("Importing will add articles to the database.\nEnsure CSV format is:\nTitle, Application Domain (sep ;), Imaging Method (sep ;), Modality (sep ;), Product (sep ;), Journal, First Author, Last Author, Customer, Date (YYYY-MM-DD), DOI.\nContinue?")) {
            e.target.value = ''; // Reset
            return;
        }

        setImporting(true);
        try {
            const text = await file.text();
            const lines = text.split('\n').filter(l => l.trim().length > 0);
            if (lines.length < 2) return alert("Empty CSV");

            // Detect separator from header
            const header = lines[0];
            const semicolonCount = (header.match(/;/g) || []).length;
            const commaCount = (header.match(/,/g) || []).length;
            const separator = semicolonCount > commaCount ? ';' : ',';

            console.log(`Detected CSV separator: '${separator}'`);

            // Regex: match separator only if not inside quotes
            const splitRegex = new RegExp(`${separator}(?=(?:(?:[^"]*"){2})*[^"]*$)`);

            let success = 0;
            let errors: string[] = [];

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                const cols = line.split(splitRegex);

                if (cols.length < 11) {
                    if (errors.length < 3) errors.push(`Line ${i + 1}: Found ${cols.length} columns, expected 11.`);
                    continue;
                }

                const clean = (s: string) => s ? s.replace(/^"|"$/g, '').replace(/""/g, '"').trim() : '';
                const splitArray = (s: string) => s ? s.split(/[;|]/).map(v => v.trim()).filter(Boolean) : [];

                const title = clean(cols[0]);
                const application_domain = splitArray(clean(cols[1]));
                const imaging_method = splitArray(clean(cols[2]));
                const abbelight_imaging_modality = splitArray(clean(cols[3]));
                const abbelight_product = splitArray(clean(cols[4]));
                const journal = clean(cols[5]);
                const first_author = clean(cols[6]);
                const last_author = clean(cols[7]);
                const abbelight_customer = clean(cols[8]);
                let publication_date: string | null = clean(cols[9]);

                // Handle empty date or invalid format strictly, convert DD/MM/YYYY
                if (!publication_date) {
                    publication_date = null;
                } else if (publication_date.includes('/')) {
                    const parts = publication_date.split('/');
                    if (parts.length === 3) {
                        publication_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                }

                const doi_link = clean(cols[10]);

                if (!title) {
                    errors.push(`Line ${i + 1}: Missing title`);
                    continue;
                }

                const res = await fetch('/api/articles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title, application_domain, imaging_method,
                        abbelight_imaging_modality, abbelight_product,
                        journal, first_author, last_author, abbelight_customer,
                        publication_date, doi_link
                    })
                });

                if (res.ok) {
                    success++;
                } else {
                    const d = await res.json();
                    errors.push(`Line ${i + 1}: API Error - ${typeof d.error === 'object' ? JSON.stringify(d.error) : d.error}`);
                }
            }

            if (success === 0 && errors.length > 0) {
                alert(`Import Failed. 0/${lines.length - 1} imported. \nSeparator detected: "${separator}"\nErrors:\n${errors.join('\n')}`);
            } else {
                alert(`Imported ${success} articles successfully. ${errors.length > 0 ? `\nWith some errors:\n${errors.slice(0, 5).join('\n')}` : ''}`);
            }

            // Refresh
            fetchArticles();

        } catch (err) {
            alert("Error importing: " + err);
        } finally {
            setImporting(false);
            e.target.value = '';
        }
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
                <h1 className="text-3xl font-bold text-white mb-2">Articles Management</h1>
                <p className="text-gray-400">Manage blog posts and technical articles.</p>
            </div>

            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                {!isEditingArticle ? (
                    <>
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Articles List</h2>
                            </div>
                            <div className="flex gap-2">
                                <label className={`bg-white/10 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-white/20 transition-colors flex items-center gap-2 border border-white/10 cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    {importing ? 'Importing...' : 'Import CSV'}
                                    <input type="file" accept=".csv" onChange={handleImportArticles} className="hidden" disabled={importing} />
                                </label>
                                <label className="bg-white/10 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-white/20 transition-colors flex items-center gap-2 border border-white/10 cursor-pointer">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                    Analyze CSV
                                    <input type="file" accept=".csv" onChange={handleAnalyzeCSV} className="hidden" />
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
                                                <span className="text-xs bg-white/5 px-2 py-0.5 rounded text-gray-400">{new Date(article.publication_date).toLocaleDateString()}</span>
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
                            {/* Title & Date */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Paper Title</label>
                                    <input
                                        type="text"
                                        value={editingArticle?.title || ""}
                                        onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                        placeholder="Title"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Publication Date</label>
                                    <input
                                        type="date"
                                        value={editingArticle?.publication_date ? new Date(editingArticle.publication_date).toISOString().split('T')[0] : ""}
                                        onChange={(e) => setEditingArticle({ ...editingArticle, publication_date: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Single Text Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Journal</label>
                                    <input
                                        type="text"
                                        value={editingArticle?.journal || ""}
                                        onChange={(e) => setEditingArticle({ ...editingArticle, journal: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                        placeholder="Nature"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">First Author</label>
                                    <input
                                        type="text"
                                        value={editingArticle?.first_author || ""}
                                        onChange={(e) => setEditingArticle({ ...editingArticle, first_author: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                        placeholder="Smith A."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Last Author</label>
                                    <input
                                        type="text"
                                        value={editingArticle?.last_author || ""}
                                        onChange={(e) => setEditingArticle({ ...editingArticle, last_author: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                        placeholder="Doe J."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Abbelight Customer</label>
                                    <input
                                        type="text"
                                        value={editingArticle?.abbelight_customer || ""}
                                        onChange={(e) => setEditingArticle({ ...editingArticle, abbelight_customer: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                        placeholder="Institute / Lab Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">DOI Link</label>
                                    <input
                                        type="text"
                                        value={editingArticle?.doi_link || ""}
                                        onChange={(e) => setEditingArticle({ ...editingArticle, doi_link: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                        placeholder="https://doi.org/..."
                                    />
                                </div>
                            </div>

                            {/* Array Fields */}
                            <div className="space-y-6">
                                {[
                                    { label: "Application Domain", field: "application_domain" },
                                    { label: "Imaging Method", field: "imaging_method" },
                                    { label: "Abbelight Modality", field: "abbelight_imaging_modality" },
                                    { label: "Abbelight Product", field: "abbelight_product" },
                                ].map((item) => (
                                    <MultiSelect
                                        key={item.field}
                                        label={item.label}
                                        value={Array.isArray(editingArticle?.[item.field]) ? editingArticle?.[item.field] : []}
                                        options={fieldOptions[item.field] || []}
                                        onChange={(val) => setEditingArticle({ ...editingArticle, [item.field]: val })}
                                    />
                                ))}
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
        </div>
    );
}
