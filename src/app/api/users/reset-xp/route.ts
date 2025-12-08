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
        await sql`DELETE FROM user_module_progress WHERE user_email = ${email}`;

        // Reset Chapter Progress
        await sql`DELETE FROM user_progress WHERE user_email = ${email}`;

        // Reset Learning Paths Status
        await sql`DELETE FROM user_learning_paths WHERE user_id = ${userId}`;

        // Re-assign default paths? Or just leave empty?
        // Usually paths are assigned. If we delete, they disappear from "My Paths".
        // Better: Set status back to 'in_progress' and completed_at = NULL?
        // But what if they weren't started?
        // Let's UPDATE instead of DELETE for paths, so assignments stay.
        await sql`
            UPDATE user_learning_paths 
            SET status = 'in_progress', completed_at = NULL 
            WHERE user_id = ${userId}
        `;

        return NextResponse.json({ success: true, message: "XP and Progress reset (Full Wipe)" }, { status: 200 });
    } catch (error) {
        console.error("Reset XP Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
