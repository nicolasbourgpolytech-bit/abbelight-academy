
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

        // Reset Learning Paths
        // First delete existing states to avoid duplicates/conflicts
        await sql`DELETE FROM user_learning_paths WHERE user_id = ${userId}`;

        // Restore/Assign ALL learning paths to this user (for testing/admin purpose)
        // This effectively "Re-enrolls" them in everything
        await sql`
            INSERT INTO user_learning_paths (user_id, learning_path_id, status, start_date)
            SELECT ${userId}, id, 'in_progress', NOW()
            FROM learning_paths
        `;

        return NextResponse.json({ success: true, message: "XP Reset & All Paths Re-assigned" }, { status: 200 });
    } catch (error) {
        console.error("Reset XP Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
