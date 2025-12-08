"use client";

import { useState, useEffect } from 'react';
import { UserLMSProgress } from '@/types/lms';
import { useUser } from '@/context/UserContext';

export const useLmsProgress = () => {
    const { user } = useUser();
    const [progress, setProgress] = useState<UserLMSProgress>({
        completedModuleIds: [],
        completedChapterIds: [],
        currentModuleId: undefined
    });
    const [isLoading, setIsLoading] = useState(true);

    // Load from API on mount or user change
    useEffect(() => {
        if (!user?.email) {
            setIsLoading(false);
            return;
        }

        const fetchProgress = async () => {
            try {
                const res = await fetch(`/api/progress?email=${encodeURIComponent(user.email)}`);
                if (res.ok) {
                    const data = await res.json();
                    setProgress({
                        completedChapterIds: data.completedChapterIds || [],
                        completedModuleIds: data.completedModuleIds || [],
                        currentModuleId: undefined
                    });
                }
            } catch (err) {
                console.error("Failed to fetch progress", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProgress();
    }, [user?.email]);

    const markChapterComplete = async (moduleId: string, chapterId: string) => {
        if (!user?.email) return;

        // Optimistic update
        const chapterKey = `${moduleId}-${chapterId}`;
        if (!progress.completedChapterIds.includes(chapterKey)) {
            const newChapterIds = [...progress.completedChapterIds, chapterKey];
            setProgress(prev => ({
                ...prev,
                completedChapterIds: newChapterIds,
                currentModuleId: moduleId
            }));

            // API Call
            try {
                await fetch('/api/progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: user.email,
                        moduleId: moduleId,
                        chapterId: chapterId,
                        type: 'chapter'
                    })
                });
            } catch (err) {
                console.error("Failed to save chapter progress", err);
                // Could revert state here
            }
        }
    };

    const markModuleComplete = async (moduleId: string) => {
        if (!user?.email) return;

        if (!progress.completedModuleIds.includes(moduleId)) {
            const newModuleIds = [...progress.completedModuleIds, moduleId];
            setProgress(prev => ({
                ...prev,
                completedModuleIds: newModuleIds
            }));

            try {
                const res = await fetch('/api/progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: user.email,
                        moduleId: moduleId,
                        type: 'module'
                    })
                });
                if (res.ok) {
                    return await res.json();
                }
            } catch (err) {
                console.error("Failed to save module progress", err);
            }
        }
        return null;
    };

    const getModuleProgress = (moduleId: string, totalChapters: number) => {
        // Simple calculation: count completed chapters for this module
        const completedChaptersCount = progress.completedChapterIds.filter(id => id.startsWith(`${moduleId}-`)).length;

        // If module is marked explicitly complete, return 100
        if (progress.completedModuleIds.includes(moduleId.toString())) return 100;

        if (totalChapters === 0) return 0;
        return Math.round((completedChaptersCount / totalChapters) * 100);
    };

    return {
        progress,
        isLoading,
        markChapterComplete,
        markModuleComplete,
        getModuleProgress
    };
};

