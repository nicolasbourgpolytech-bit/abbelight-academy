import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        try {
            const body = await request.json();
            let { userId, email } = body;

            // Sanitize userId if it comes with extra quotes
            if (userId && typeof userId === 'string') {
                userId = userId.replace(/['"]/g, '').trim();
            }

            if (!userId && !email) {
                return NextResponse.json({ error: 'User ID or Email is required' }, { status: 400 });
            }

            let dbUser;
            // Fetch user by ID or Email to get correct DB ID and Email
            if (userId) {
                const { rows } = await sql`SELECT id, email FROM users WHERE id = ${userId}`;
                if (rows.length > 0) dbUser = rows[0];
            }

            // Fallback to email lookup if ID failed or wasn't provided
            if (!dbUser && email) {
                const { rows } = await sql`SELECT id, email FROM users WHERE email ILIKE ${email}`;
                if (rows.length > 0) dbUser = rows[0];
            }

            if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

            const dbUserId = dbUser.id;
            const dbUserEmail = dbUser.email;

            // Reset XP
            await sql`UPDATE users SET xp = 0 WHERE id = ${userId}`;

            // Reset Module Progress
            await sql`DELETE FROM user_module_progress WHERE user_email ILIKE ${email}`;

            // Reset Chapter Progress
            await sql`DELETE FROM user_progress WHERE user_email ILIKE ${email}`;

            // Reset Learning Paths - SAFE UPDATE (Preserve assignments)
            // 1. Get user's EXISTING assigned paths ordered by creation date
            const { rows: userAssignments } = await sql`
            SELECT ulp.id 
            FROM user_learning_paths ulp
            JOIN learning_paths lp ON ulp.learning_path_id = lp.id
            WHERE ulp.user_id = ${userId}
            ORDER BY lp.created_at ASC
        `;

            // 2. Update statuses sequentially
            for (let i = 0; i < userAssignments.length; i++) {
                const status = i === 0 ? 'in_progress' : 'locked';
                // We clear completed_at and updated_at to fully reset
                await sql`
                UPDATE user_learning_paths 
                SET status = ${status}, completed_at = NULL, updated_at = NOW(), start_date = NOW()
                WHERE id = ${userAssignments[i].id}
            `;
            }

            return NextResponse.json({ success: true, message: "XP Reset & Paths Reset (Assignments Preserved)" }, { status: 200 });
        } catch (error) {
            console.error("Reset XP Error:", error);
            return NextResponse.json({ error: (error as Error).message }, { status: 500 });
        }
    }
