"use client";

import { useState, useEffect } from 'react';
import { UserLMSProgress } from '@/types/lms';

const STORAGE_KEY = 'abbelight_lms_progress';

export const useLmsProgress = () => {
    const [progress, setProgress] = useState<UserLMSProgress>({
        completedModuleIds: [],
        completedChapterIds: [],
        currentModuleId: undefined
    });

    // Load from local storage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                setProgress(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse LMS progress", e);
            }
        }
    }, []);

    const saveProgress = (newProgress: UserLMSProgress) => {
        setProgress(newProgress);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
    };

    const markChapterComplete = (moduleId: string, chapterId: string) => {
        const chapterKey = `${moduleId}-${chapterId}`;
        if (!progress.completedChapterIds.includes(chapterKey)) {
            const newChapterIds = [...progress.completedChapterIds, chapterKey];
            saveProgress({
                ...progress,
                completedChapterIds: newChapterIds,
                currentModuleId: moduleId
            });
        }
    };

    const markModuleComplete = (moduleId: string) => {
        if (!progress.completedModuleIds.includes(moduleId)) {
            const newModuleIds = [...progress.completedModuleIds, moduleId];
            saveProgress({
                ...progress,
                completedModuleIds: newModuleIds
            });
        }
    };

    const getModuleProgress = (moduleId: string, totalChapters: number) => {
        // Simple calculation: count completed chapters for this module
        const completedChaptersCount = progress.completedChapterIds.filter(id => id.startsWith(`${moduleId}-`)).length;

        // If module is marked explicitly complete, return 100
        if (progress.completedModuleIds.includes(moduleId)) return 100;

        if (totalChapters === 0) return 0;
        return Math.round((completedChaptersCount / totalChapters) * 100);
    };

    return {
        progress,
        markChapterComplete,
        markModuleComplete,
        getModuleProgress
    };
};
