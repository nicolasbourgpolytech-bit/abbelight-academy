import { UserRole } from "./user";

export type ChapterType = 'video' | 'slides' | 'quiz';

export interface QuizQuestion {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number; // Index of the correct option
    explanation?: string; // Text explaining the answer
}

export interface Slide {
    id: string;
    title: string;
    imageUrl?: string; // Optional if we just want text slides
    content?: string; // Bullet points or text
}

export interface Attachment {
    id: string;
    name: string;
    url: string; // url to download
    type: 'pdf' | 'zip' | 'other';
    size?: string;
}

export interface Chapter {
    id: string;
    title: string;
    type: ChapterType;
    duration: string; // e.g., "10 min"
    contentUrl?: string; // Video URL or Slides JSON/Images URL
    quizData?: QuizQuestion[];
    slidesData?: Slide[]; // Array of slides for 'slides' type
    attachments?: Attachment[]; // Resources downloadable for this separate chapter
}

export interface Module {
    id: string;
    title: string;
    description: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    xp: number;
    thumbnailUrl: string;
    roles?: UserRole[]; // If module is restricted to specific roles
    chapters: Chapter[];
    category: string; // e.g., "Fundamentals", "Software", "Hardware"
}

export interface UserLMSProgress {
    completedModuleIds: string[];
    completedChapterIds: string[]; // composed as "moduleId-chapterId"
    currentModuleId?: string; // The module the user is currently focused on
}
