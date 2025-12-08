import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    try {
        const { rows: chapters } = await sql`
            SELECT module_id, chapter_id FROM user_progress WHERE user_email ILIKE ${email}
        `;
        const { rows: modules } = await sql`
            SELECT module_id FROM user_module_progress WHERE user_email ILIKE ${email} AND is_completed = TRUE
        `;

        return NextResponse.json({
            completedChapterIds: chapters.map(c => `${c.module_id}-${c.chapter_id}`),
            completedModuleIds: modules.map(m => m.module_id.toString())
        }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

// Helper to get user by email (case insensitive)
async function getUserByEmail(email: string) {
    const { rows } = await sql`SELECT * FROM users WHERE email ILIKE ${email}`;
    return rows[0];
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, moduleId, chapterId, type } = body; // type: 'chapter' | 'module'

        if (!email || !moduleId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const user = await getUserByEmail(email);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        if (type === 'chapter') {
            if (!chapterId) return NextResponse.json({ error: 'Chapter ID required' }, { status: 400 });

            await sql`
                INSERT INTO user_progress (user_email, module_id, chapter_id)
                VALUES (${email}, ${moduleId}, ${chapterId})
                ON CONFLICT (user_email, module_id, chapter_id) DO NOTHING
            `;
            return NextResponse.json({ success: true }, { status: 200 });
        }

        if (type === 'module') {
            // 1. Mark Module as Completed
            await sql`
                INSERT INTO user_module_progress (user_email, module_id, is_completed, completed_at)
                VALUES (${email}, ${moduleId}, TRUE, NOW())
                ON CONFLICT (user_email, module_id) 
                DO UPDATE SET is_completed = TRUE, completed_at = NOW()
            `;

            // 2. Award Module XP
            const { rows: modules } = await sql`SELECT xp FROM modules WHERE id = ${moduleId}`;
            const moduleXp = modules[0]?.xp || 0;

            if (moduleXp > 0) {
                await sql`UPDATE users SET xp = COALESCE(xp, 0) + ${moduleXp} WHERE id = ${user.id}`;
                console.log(`[XP Award] Awarded ${moduleXp} XP to user ${user.id} for module ${moduleId}`);
            }

            // 3. Check for Learning Path Completion
            let pathCompleted = false;
            let bonusXp = 0;

            // Find active paths for this user that contain this module
            const { rows: activePaths } = await sql`
                SELECT ulp.learning_path_id, ulp.id as assignment_id
                FROM user_learning_paths ulp
                JOIN learning_path_modules lpm ON lpm.learning_path_id = ulp.learning_path_id
                WHERE ulp.user_id = ${user.id} 
                AND ulp.status = 'in_progress'
                AND lpm.module_id = ${moduleId}
            `;

            for (const path of activePaths) {
                // Check if all modules in this path are completed
                const { rows: pathModules } = await sql`
                    SELECT m.id, m.xp 
                    FROM modules m
                    JOIN learning_path_modules lpm ON lpm.module_id = m.id
                    WHERE lpm.learning_path_id = ${path.learning_path_id}
                `;

                // Check completion status for each module
                let allCompleted = true;
                let pathTotalXp = 0;

                for (const m of pathModules) {
                    pathTotalXp += (m.xp || 0);
                    // Check if user has completed this module
                    const { rows: progress } = await sql`
                        SELECT is_completed FROM user_module_progress 
                        WHERE user_email = ${email} AND module_id = ${m.id} AND is_completed = TRUE
                    `;
                    if (progress.length === 0) {
                        allCompleted = false;
                        break;
                    }
                }

                if (allCompleted) {
                    // Award Bonus (50% of path total)
                    const bonus = Math.floor(pathTotalXp * 0.5);
                    await sql`UPDATE users SET xp = COALESCE(xp, 0) + ${bonus} WHERE id = ${user.id}`;
                    console.log(`[XP Award] Awarded BONUS ${bonus} XP to user ${user.id} for path ${path.assignment_id}`);

                    // Mark path as completed
                    await sql`
                        UPDATE user_learning_paths 
                        SET status = 'completed', completed_at = NOW() 
                        WHERE id = ${path.assignment_id}
                    `;

                    pathCompleted = true;
                    bonusXp += bonus;
                }
            }

            return NextResponse.json({
                success: true,
                moduleXp,
                pathCompleted,
                bonusXp,
                newTotalXp: (user.xp || 0) + moduleXp + bonusXp,
                debug: {
                    userFound: !!user,
                    moduleId,
                    dbXp: moduleXp
                }
            }, { status: 200 });
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    } catch (error) {
        console.error("Progress Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
