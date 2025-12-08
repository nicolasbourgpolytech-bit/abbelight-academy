import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    try {
        // 1. User Info
        const { rows: users } = await sql`SELECT * FROM users WHERE email ILIKE ${email}`;

        // 2. Module Progress
        const { rows: progress } = await sql`SELECT * FROM user_module_progress WHERE user_email ILIKE ${email}`;

        // 3. User Progress (Chapters)
        const { rows: chapters } = await sql`SELECT * FROM user_progress WHERE user_email ILIKE ${email}`;

        // 4. Learning Paths
        let paths: any[] = [];
        if (users.length > 0) {
            const { rows: userPaths } = await sql`SELECT * FROM user_learning_paths WHERE user_id = ${users[0].id}`;
            paths = userPaths;
        }

        return NextResponse.json({
            user: users[0] || null,
            moduleProgress: progress,
            chapterProgress: chapters,
            paths: paths,
            debugTimestamp: new Date().toISOString()
        });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
