import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Fetch user email to clear progress tables which use email
        const { rows: users } = await sql`SELECT email FROM users WHERE id = ${userId}`;
        if (users.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        const email = users[0].email;

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
