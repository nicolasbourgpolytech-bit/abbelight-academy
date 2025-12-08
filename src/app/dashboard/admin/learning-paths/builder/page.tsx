"use client";

import { useState, useEffect } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";

// Types
interface LearningPath {
    id: number;
    title: string;
    description?: string;
}

interface SortablePathItemProps {
    path: LearningPath;
    id: string; // Helper ID for dnd-kit
}

// Draggable Sidebar Item
function DraggableSidebarItem({ path }: { path: LearningPath }) {
    const { attributes, listeners, setNodeRef, transform } = useSortable({
        id: `sidebar-${path.id}`,
        data: {
            type: 'sidebar-item',
            path,
        }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="bg-white/5 border border-white/10 p-3 rounded-lg mb-2 cursor-grab hover:border-primary/50 transition-colors"
        >
            <h4 className="font-medium text-white text-sm">{path.title}</h4>
        </div>
    );
}

// Sortable Sequence Item
function SortableSequenceItem({ path, id }: SortablePathItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="bg-primary/20 border border-primary/30 p-4 rounded-xl mb-3 flex items-center justify-between group cursor-grab active:cursor-grabbing"
        >
            <div>
                <h3 className="font-bold text-white">{path.title}</h3>
                <p className="text-xs text-gray-400 line-clamp-1">{path.description || "No description"}</p>
            </div>
            <div className="text-primary/50 group-hover:text-primary">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
            </div>
        </div>
    );
}

export default function PathBuilderPage() {
    // State
    const [availablePaths, setAvailablePaths] = useState<LearningPath[]>([]);
    const [sequence, setSequence] = useState<LearningPath[]>([]);
    const [userType, setUserType] = useState("Sales"); // Default for now
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeItem, setActiveItem] = useState<LearningPath | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Initial Data Fetch
    useEffect(() => {
        fetchPaths();
    }, []);

    // Fetch sequence when User Type changes
    useEffect(() => {
        if (userType) fetchSequence(userType);
    }, [userType]);

    const fetchPaths = async () => {
        const res = await fetch('/api/learning-paths'); // Helper to get all paths
        const data = await res.json();
        if (data.paths) setAvailablePaths(data.paths);
    };

    const fetchSequence = async (type: string) => {
        const res = await fetch(`/api/learning-paths/sequences?userType=${type}`);
        const data = await res.json();
        if (data.sequences) {
            // Map sequence rows back to paths. 
            // The API returns joined data so we can just use it, but let's standardize.
            const seq = data.sequences.map((s: any) => ({
                id: s.learning_path_id, // Important: use the learning_path_id
                title: s.title,
                description: s.description
            }));
            setSequence(seq);
        } else {
            setSequence([]);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/learning-paths/sequences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userType,
                    learningPathIds: sequence.map(p => p.id)
                })
            });
            if (!res.ok) throw new Error('Failed to save');
            alert('Sequence saved!');
        } catch (e) {
            alert('Error saving sequence');
        } finally {
            setIsSaving(false);
        }
    };

    // Dnd Handlers
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as string);

        // Find the item payload
        if (active.data.current?.type === 'sidebar-item') {
            setActiveItem(active.data.current.path);
        } else {
            // It's in the sequence
            const id = active.id;
            // If ID is just the number (from existing list), or unique string
            // Logic below handles finding it
            const found = sequence.find(p => p.id.toString() === id.toString());
            if (found) setActiveItem(found);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveItem(null);

        if (!over) return; // Dropped outside

        // Case 1: Reordering within main sequence
        // We know it is reordering if active is NOT a sidebar item
        const isActiveSidebar = active.data.current?.type === 'sidebar-item';

        if (!isActiveSidebar) {
            if (active.id !== over.id) {
                setSequence((items) => {
                    const oldIndex = items.findIndex(i => i.id.toString() === active.id.toString());
                    const newIndex = items.findIndex(i => i.id.toString() === over.id.toString());
                    return arrayMove(items, oldIndex, newIndex);
                });
            }
            return;
        }

        // Case 2: Dragging from Sidebar to Main Sequence
        if (isActiveSidebar) {
            // Add to end if dropped on container, or insert at position if dropped on item?
            // Simplified: Add to end if dropped in the zone area
            const path = active.data.current?.path as LearningPath;
            if (!path) return;

            // Allow duplicates? probably not for a sequence... 
            // If we want to allow, we need unique IDs for the Sortable items.
            // For now, let's assume unique paths in sequence for simplicity.
            if (sequence.find(p => p.id === path.id)) {
                // Already in sequence
                return;
            }

            setSequence([...sequence, path]);
        }
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col">
            <header className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Path Builder</h1>
                    <p className="text-gray-400 text-sm">Design learning journeys by User Type</p>
                </div>
                <div className="flex gap-4 items-center">
                    <select
                        value={userType}
                        onChange={(e) => setUserType(e.target.value)}
                        className="bg-white/10 border-none rounded-lg text-white p-2"
                    >
                        <option value="Sales">Sales</option>
                        <option value="Tech">Tech</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Admin">Admin</option>
                    </select>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-bold transition-all"
                    >
                        {isSaving ? "Saving..." : "Save Sequence"}
                    </button>
                </div>
            </header>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-8 flex-1 overflow-hidden">
                    {/* DROP ZONE (Main Area) */}
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6 overflow-y-auto">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Sequence for: <span className="text-primary">{userType}</span>
                        </h2>

                        {sequence.length === 0 && (
                            <div className="border border-dashed border-white/20 rounded-xl py-12 text-center text-gray-500">
                                Drag paths here to build the journey
                            </div>
                        )}

                        <SortableContext
                            items={sequence.map(p => p.id.toString())}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-3 pb-20">
                                {sequence.map((path) => (
                                    <SortableSequenceItem key={path.id} id={path.id.toString()} path={path} />
                                ))}
                            </div>
                        </SortableContext>
                    </div>

                    {/* SIDEBAR (Available Paths) */}
                    <div className="w-80 bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col">
                        <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Available Paths</h3>
                        <div className="flex-1 overflow-y-auto pr-2">
                            {availablePaths.map(path => (
                                <DraggableSidebarItem key={path.id} path={path} />
                            ))}
                        </div>
                    </div>
                </div>

                <DragOverlay>
                    {activeItem ? (
                        <div className="bg-primary text-white p-4 rounded-xl shadow-2xl scale-105 rotate-2 cursor-grabbing border border-white/20 opacity-90">
                            <h3 className="font-bold">{activeItem.title}</h3>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
