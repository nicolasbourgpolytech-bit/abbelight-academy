import { Module } from "@/types/lms";

export const MOCK_MODULES: Module[] = [
    {
        id: "m1",
        title: "Fundamentals of SMLM",
        description: "Master the core concepts of Single Molecule Localization Microscopy, from fluorophore physics to basic principles of dSTORM and PALM.",
        level: "Beginner",
        xp: 500,
        thumbnailUrl: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=800", // Lab generic
        category: "Theory",
        chapters: [
            { id: "c1", title: "What is Super-Resolution?", type: "video", duration: "10 min" },
            {
                id: "c2",
                title: "Fluorophore Physics",
                type: "slides",
                duration: "15 min",
                slidesData: [
                    { id: "s1", title: "Introduction to Fluorophores", content: "• Basic principles of fluorescence\n• Jablonski Diagram\n• Why typical fluorophores blink" },
                    { id: "s2", title: "The On-Off Switching", content: "• Critical for single molecule localization\n• Controlling the duty cycle\n• Reducing overlap" },
                    { id: "s3", title: "Appropriate Buffers", content: "• Oxygen scavengers (MEA, etc.)\n• Importance of pH balance\n• Thiol impact" },
                    { id: "s4", title: "Summary", content: "Success in SMLM starts with sample prep and dye selection." }
                ]
            },
            {
                id: "c3",
                title: "Knowledge Check",
                type: "quiz",
                duration: "5 min",
                quizData: [
                    {
                        id: "q1",
                        question: "What is the primary key to dSTORM?",
                        options: [
                            "High laser power only",
                            "Blinking fluorophores",
                            "Fast cameras",
                            "Oil immersion objectives"
                        ],
                        correctAnswer: 1,
                        explanation: "Blinking fluorophores allow for the temporal separation of individual molecules, which is the core principle of SMLM."
                    }
                ]
            }
        ]
    },
    {
        id: "m2",
        title: "SAFe 360 Operator Training",
        description: "Complete certification for operating the Abbelight SAFe 360 system. Covers safety, startup, acquisition, and shutdown procedures.",
        level: "Intermediate",
        xp: 1200,
        thumbnailUrl: "https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&q=80&w=800",
        roles: ['reagent', 'safe'], // Restricted
        category: "Hardware",
        chapters: [
            { id: "c1", title: "System Overview", type: "video", duration: "15 min" },
            { id: "c2", title: "Safety Procedures", type: "slides", duration: "10 min" },
            { id: "c3", title: "Startup & Calibration", type: "video", duration: "20 min" }
        ]
    },
    {
        id: "m3",
        title: "NEO Analysis Suite Expert",
        description: "Advanced data processing techniques using NEO. Learn spectrally resolved imaging demixing and 3D reconstruction algorithms.",
        level: "Advanced",
        xp: 1500,
        thumbnailUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800", // Data viz
        category: "Software",
        chapters: []
    },
    {
        id: "m4",
        title: "Sample Preparation for dSTORM",
        description: "Best practices for preparing samples for dSTORM imaging. Buffer recipes, mounting techniques, and troubleshooting.",
        level: "Intermediate",
        xp: 800,
        thumbnailUrl: "https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&q=80&w=800", // microscope slide
        category: "Lab Work",
        chapters: []
    }
];
