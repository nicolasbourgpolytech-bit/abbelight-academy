import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    try {
        // 1. Get User
        const { rows: users } = await sql`SELECT * FROM users WHERE email ILIKE ${email}`;
        const user = users[0];

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 2. Get Module Progress
        const { rows: moduleProgress } = await sql`
            SELECT * FROM user_module_progress WHERE user_email ILIKE ${email}
        `;

        // 3. Get Chapter Progress
        const { rows: chapterProgress } = await sql`
            SELECT * FROM user_progress WHERE user_email ILIKE ${email}
        `;

        // 4. Get User Learning Paths
        const { rows: paths } = await sql`
            SELECT ulp.*, lp.title
            FROM user_learning_paths ulp
            JOIN learning_paths lp ON ulp.learning_path_id = lp.id
            WHERE ulp.user_id = ${user.id}
            ORDER BY lp.created_at
        `;

        // 5. Get All Path Definitions (Extra context if needed, but keeping JSON structure flat for now)
        const { rows: pathDefinitions } = await sql`
            SELECT lp.id as path_id, lp.title, lpm.module_id, m.title as module_title
            FROM learning_paths lp
            LEFT JOIN learning_path_modules lpm ON lp.id = lpm.learning_path_id
            LEFT JOIN modules m ON lpm.module_id = m.id
            ORDER BY lp.created_at
        `;

        return NextResponse.json({
            user,
            moduleProgress,
            chapterProgress,
            paths,
            // Keeping this just in case, but frontend might not use it
            pathDefinitions: pathDefinitions.reduce((acc, row) => {
                const path = acc.find((p: any) => p.path_id === row.path_id);
                if (path) {
                    path.modules.push({ id: row.module_id, title: row.module_title });
                } else {
                    acc.push({
                        path_id: row.path_id,
                        title: row.title,
                        modules: row.module_id ? [{ id: row.module_id, title: row.module_title }] : []
                    });
                }
                return acc;
            }, [] as any[]),
        }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
