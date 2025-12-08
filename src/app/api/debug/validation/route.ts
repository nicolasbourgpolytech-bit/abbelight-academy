import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get('email')?.trim();
    const userIdParam = searchParams.get('userId'); // Add support for ID lookup
    const moduleIdParam = searchParams.get('moduleId');
    const fixParam = searchParams.get('fix') === 'true';

    const logs: string[] = [];
    function log(msg: string) {
        logs.push(msg);
        console.log(`[Validation Debug] ${msg}`);
    }

    try {
        log(`Starting validation simulation. Email: '${emailParam}', UserId: '${userIdParam}', Fix: '${fixParam}'`);

        let user = null;

        // 1. Try finding by ID first if provided (most reliable)
        if (userIdParam && !isNaN(parseInt(userIdParam))) {
            const { rows: usersById } = await sql`SELECT * FROM users WHERE id = ${userIdParam}`;
            if (usersById.length > 0) {
                user = usersById[0];
                log(`Found user by ID ${userIdParam}: ${user.email}`);
            }
        }

        // 2. Fallback to Email
        if (!user && emailParam) {
            const { rows: usersByEmail } = await sql`SELECT * FROM users WHERE email ILIKE ${emailParam}`;
            if (usersByEmail.length > 0) {
                user = usersByEmail[0];
                log(`Found user by Email ${emailParam}: ID ${user.id}`);
            }
        }

        if (!user) {
            log('User not found by ID or Email.');
            // Dump all users to debug
            const { rows: allUsers } = await sql`SELECT id, email FROM users LIMIT 50`;
            log(`Available Users in DB: ${JSON.stringify(allUsers)}`);
            return NextResponse.json({ logs, error: 'User not found. See logs for available users.' }, { status: 404 });
        }

        // 2. Mock Module ID if not provided (just to list paths)
        // Check ALL paths for user first to debug status
        const { rows: allUserPaths } = await sql`
            SELECT ulp.*, lp.title, lp.created_at
            FROM user_learning_paths ulp
            JOIN learning_paths lp ON ulp.learning_path_id = lp.id
            WHERE ulp.user_id = ${user.id}
            ORDER BY lp.created_at ASC
        `;
        log(`DEBUG: User has ${allUserPaths.length} assigned paths (Ordered by CreatedAt):`);

        // Simulate Sequence Check
        for (let i = 0; i < allUserPaths.length; i++) {
            const p = allUserPaths[i];
            const next = allUserPaths[i + 1];
            log(` - [${i}] LP:${p.learning_path_id} "${p.title}" (AssignID:${p.id}) Status: ${p.status} Created: ${p.created_at}`);

            if (next) {
                if (p.status === 'completed' && next.status === 'locked') {
                    if (fixParam) {
                        log(`   >>> APPLYING FIX: Unlocking ${next.title} (ID: ${next.id})...`);
                        await sql`
                            UPDATE user_learning_paths 
                            SET status = 'in_progress'
                            WHERE id = ${next.id}
                        `;
                        log(`   >>> FIX APPLIED. Path unlocked.`);
                    } else {
                        log(`   >>> SEQUENCE BREAK DETECTED! Path ${p.title} is completed, but ${next.title} is locked. Logic SHOULD unlock ${next.title}. (Run with &fix=true to repair)`);
                    }
                } else if (p.status === 'completed' && next.status !== 'locked') {
                    log(`   (Sequence OK: Next path ${next.title} is ${next.status})`);
                } else if (p.status !== 'completed' && next.status === 'locked') {
                    log(`   (Sequence OK: Path ${p.title} is ${p.status}, so next path remains locked)`);
                }
            }
        }

        // Now try to find the specific match
        const activePathsQuery = moduleIdParam
            ? sql`
                SELECT ulp.learning_path_id, ulp.id as assignment_id, ulp.status, lpm.module_id, lp.title
                FROM user_learning_paths ulp
                JOIN learning_path_modules lpm ON lpm.learning_path_id = ulp.learning_path_id
                JOIN learning_paths lp ON ulp.learning_path_id = lp.id
                WHERE ulp.user_id = ${user.id} 
                AND lpm.module_id = ${moduleIdParam}
            `
            : sql`
                SELECT ulp.learning_path_id, ulp.id as assignment_id, ulp.status, lpm.module_id, lp.title
                FROM user_learning_paths ulp
                JOIN learning_path_modules lpm ON lpm.learning_path_id = ulp.learning_path_id
                JOIN learning_paths lp ON ulp.learning_path_id = lp.id
                WHERE ulp.user_id = ${user.id} 
            `;

        const { rows: potentialPaths } = await activePathsQuery;
        log(`DEBUG: Found ${potentialPaths.length} paths containing Module ${moduleIdParam}:`);
        potentialPaths.forEach(p => log(` - [${p.assignment_id}] "${p.title}" Status: ${p.status}`));

        // Filter for 'in_progress' as per original logic
        const activePaths = potentialPaths.filter(p => p.status === 'in_progress');
        log(`DEBUG: After filtering for 'in_progress', we have ${activePaths.length} paths.`);

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
                    WHERE user_email ILIKE ${user.email} AND module_id = ${m.id} AND is_completed = TRUE
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
