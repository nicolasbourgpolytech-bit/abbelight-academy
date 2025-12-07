export type ContentType = 'webinar' | 'article';

export interface ContentItem {
    id: string;
    title: string;
    description: string;
    date: string; // ISO string YYYY-MM-DD
    type: ContentType;
    thumbnailUrl?: string; // Placeholder color or image path
    url: string; // Link to content
    duration?: string; // Only for webinars (e.g. "45 min")
    author?: string; // Only for articles (Display Author)
    tags?: string[];
    isNew?: boolean;
    // Advanced Filtering Metadata
    applicationDomain?: string[];
    imagingMethod?: string[];
    modality?: string[];
    product?: string[];
    journal?: string;
    firstAuthor?: string;
    lastAuthor?: string;
    customer?: string;
}
