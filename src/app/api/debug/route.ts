import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    try {
        // 1. Get Learning Path Definitions with Modules
        const { rows: pathDefinitions } = await sql`
            SELECT lp.id as path_id, lp.title, lpm.module_id, m.title as module_title
            FROM learning_paths lp
            LEFT JOIN learning_path_modules lpm ON lp.id = lpm.learning_path_id
            LEFT JOIN modules m ON lpm.module_id = m.id
            ORDER BY lp.created_at
        `;

        // 2. Get User Learning Paths (Any user for now, or filter by param)
        const { rows: userPaths } = await sql`
            SELECT ulp.*, lp.title
            FROM user_learning_paths ulp
            JOIN learning_paths lp ON ulp.learning_path_id = lp.id
            ORDER BY ulp.user_id, lp.created_at
        `;

        // 3. Inspect raw user_learning_paths for duplicates or status issues
        let rawUserPaths: any[] = [];
        if (userId) {
            // Validate integer/number to verify it's a valid DB ID, preventing crashes on UUIDs
            if (!isNaN(parseInt(userId))) {
                const result = await sql`SELECT * FROM user_learning_paths WHERE user_id = ${userId}`;
                rawUserPaths = result.rows;
            }
        }

        // 4. Dump users
        const { rows: allUsers } = await sql`SELECT * FROM users LIMIT 10`;

        return NextResponse.json({
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
            userPaths,
            rawUserPaths,
            allUsers
        }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
