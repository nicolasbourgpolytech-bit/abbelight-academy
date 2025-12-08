import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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
            userPaths
        }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        let { userId, action } = body;

        // Sanitize userId if it comes with extra quotes
        if (userId && typeof userId === 'string') {
            userId = userId.replace(/['"]/g, '').trim();
        }

        if (action === 'normalize_paths' && userId) {
            // 1. Get all paths for user sorted chronologically
            const { rows: userPaths } = await sql`
                SELECT ulp.id, ulp.status, lp.created_at
                FROM user_learning_paths ulp
                JOIN learning_paths lp ON ulp.learning_path_id = lp.id
                WHERE ulp.user_id = ${userId}
                ORDER BY lp.created_at ASC
            `;

            const updates = [];
            let previousCompleted = true; // First path is always accessible (or check current status)

            for (let i = 0; i < userPaths.length; i++) {
                const path = userPaths[i];
                let newStatus = path.status;

                if (i === 0) {
                    // First path: keep 'completed' or ensure 'in_progress' if not
                    if (path.status === 'locked') newStatus = 'in_progress';
                } else {
                    // Subsequent paths
                    if (previousCompleted) {
                        // If previous is done, this one should be accessible (in_progress or completed)
                        if (path.status === 'locked') newStatus = 'in_progress';
                    } else {
                        // If previous is NOT done, this one MUST be locked
                        if (path.status !== 'locked') newStatus = 'locked';
                    }
                }

                // Apply update if changed
                if (newStatus !== path.status) {
                    await sql`UPDATE user_learning_paths SET status = ${newStatus} WHERE id = ${path.id}`;
                    updates.push({ id: path.id, old: path.status, new: newStatus });
                }

                // Update tracker for next iteration
                previousCompleted = (newStatus === 'completed');
            }

            return NextResponse.json({ success: true, updates }, { status: 200 });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
