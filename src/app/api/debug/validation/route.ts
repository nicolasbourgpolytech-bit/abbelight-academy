import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const moduleIdParam = searchParams.get('moduleId');

    if (!email) {
        return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    const logs: string[] = [];
    function log(msg: string) {
        logs.push(msg);
        console.log(`[Validation Debug] ${msg}`);
    }

    try {
        log(`Starting validation simulation for email: ${email}`);

        // 1. Get User
        const { rows: users } = await sql`SELECT * FROM users WHERE email ILIKE ${email}`;
        const user = users[0];

        if (!user) {
            log('User not found');
            return NextResponse.json({ logs, error: 'User not found' }, { status: 404 });
        }
        log(`User found: ID ${user.id}`);

        // 2. Mock Module ID if not provided (just to list paths)
        // If provided, we filter by it like the real POST
        const activePathsQuery = moduleIdParam
            ? sql`
                SELECT ulp.learning_path_id, ulp.id as assignment_id, ulp.status, lpm.module_id
                FROM user_learning_paths ulp
                JOIN learning_path_modules lpm ON lpm.learning_path_id = ulp.learning_path_id
                WHERE ulp.user_id = ${user.id} 
                AND ulp.status = 'in_progress'
                AND lpm.module_id = ${moduleIdParam}
            `
            : sql`
                SELECT ulp.learning_path_id, ulp.id as assignment_id, ulp.status, lpm.module_id
                FROM user_learning_paths ulp
                JOIN learning_path_modules lpm ON lpm.learning_path_id = ulp.learning_path_id
                WHERE ulp.user_id = ${user.id} 
                AND ulp.status = 'in_progress'
            `;

        const { rows: activePaths } = await activePathsQuery;
        log(`Found ${activePaths.length} active path-module combinations matching criteria.`);

        // Group by assignment_id to avoid checking same path multiple times
        const uniquePaths = Array.from(new Set(activePaths.map(p => p.assignment_id)))
            .map(id => activePaths.find(p => p.assignment_id === id))
            .filter((p): p is NonNullable<typeof p> => p !== undefined);

        log(`Unique Active Paths to Check: ${uniquePaths.length}`);

        const results = [];

        for (const path of uniquePaths) {
            log(`--- Checking Path Assignment ID: ${path.assignment_id} (LP ID: ${path.learning_path_id}) ---`);

            // 1. Get modules
            const { rows: pathModules } = await sql`
                SELECT m.id, m.xp, m.title
                FROM modules m
                JOIN learning_path_modules lpm ON lpm.module_id = m.id
                WHERE lpm.learning_path_id = ${path.learning_path_id}
            `;
            log(`Path contains ${pathModules.length} modules: ${pathModules.map(m => `[${m.id}] ${m.title}`).join(', ')}`);

            let allCompleted = true;
            const moduleStatus = [];

            for (const m of pathModules) {
                // ILIKE CHECK
                const { rows: progress } = await sql`
                    SELECT is_completed, completed_at FROM user_module_progress 
                    WHERE user_email ILIKE ${email} AND module_id = ${m.id} AND is_completed = TRUE
                `;

                const isCompleted = progress.length > 0;
                log(`   Module ${m.id} (${m.title}) Check: ${isCompleted ? 'COMPLETED' : 'FAIL'} (Found ${progress.length} records)`);

                moduleStatus.push({
                    moduleId: m.id,
                    title: m.title,
                    isCompleted,
                    debugRecords: progress
                });

                if (!isCompleted) {
                    allCompleted = false;
                }
            }

            log(`   >>> PATH RESULT: ${allCompleted ? 'SHOULD BE COMPLETED' : 'INCOMPLETE'}`);
            results.push({
                pathId: path.assignment_id,
                lpId: path.learning_path_id,
                modules: moduleStatus,
                shouldComplete: allCompleted
            });
        }

        return NextResponse.json({
            user: { id: user.id, email: user.email },
            logs,
            results
        }, { status: 200 });

    } catch (error) {
        log(`ERROR: ${(error as Error).message}`);
        return NextResponse.json({ logs, error: (error as Error).message }, { status: 500 });
    }
}
