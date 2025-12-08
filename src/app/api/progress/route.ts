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

            // 3. Check for Learning Path Completion (Recursive)
            let pathCompleted = false;
            let totalBonusXp = 0;

            // Find active paths for this user that contain this module
            const { rows: activePaths } = await sql`
                SELECT ulp.learning_path_id, ulp.id as assignment_id
                FROM user_learning_paths ulp
                JOIN learning_path_modules lpm ON lpm.learning_path_id = ulp.learning_path_id
                WHERE ulp.user_id = ${user.id} 
                AND ulp.status = 'in_progress'
                AND lpm.module_id = ${moduleId}
            `;
            console.log(`[Progress POST] Found ${activePaths.length} active paths containing module ${moduleId} for user ${user.id}`);
            console.log(`[Progress POST] Found ${activePaths.length} active paths containing module ${moduleId} for user ${user.id}`);

            for (const path of activePaths) {
                const result = await checkPathCompletion(user, email, path.assignment_id, path.learning_path_id);
                if (result.completed) {
                    pathCompleted = true;
                    totalBonusXp += result.bonusXp;
                }
            }

            return NextResponse.json({
                success: true,
                moduleXp,
                pathCompleted,
                bonusXp: totalBonusXp,
                newTotalXp: (user.xp || 0) + moduleXp + totalBonusXp,
            }, { status: 200 });
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    } catch (error) {
        console.error("Progress Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

// --- Recursive Path Completion Helper ---
async function checkPathCompletion(
    user: any,
    userEmail: string,
    assignmentId: number,
    learningPathId: number
): Promise<{ completed: boolean; bonusXp: number }> {
    console.log(`[Check Path] Checking path assignment ${assignmentId} for user ${user.id}`);

    // 1. Get all modules for this path
    const { rows: pathModules } = await sql`
        SELECT m.id, m.xp 
        FROM modules m
        JOIN learning_path_modules lpm ON lpm.module_id = m.id
        WHERE lpm.learning_path_id = ${learningPathId}
    `;

    // 2. Check if all modules are completed
    let allCompleted = true;
    let pathTotalXp = 0;

    for (const m of pathModules) {
        pathTotalXp += (m.xp || 0);
        // Check if user has completed this module
        // Use ILIKE to be case-insensitive on email
        const { rows: progress } = await sql`
            SELECT is_completed FROM user_module_progress 
            WHERE user_email ILIKE ${userEmail} AND module_id = ${m.id} AND is_completed = TRUE
        `;
        if (progress.length === 0) {
            console.log(`[Check Path] Module ${m.id} NOT completed for path ${assignmentId} (Email input: ${userEmail})`);
            allCompleted = false;
            break;
        }
    }

    if (!allCompleted) {
        return { completed: false, bonusXp: 0 };
    }

    // --- PATH IS COMPLETED ---

    // 3. Mark path as completed
    await sql`
        UPDATE user_learning_paths 
        SET status = 'completed', completed_at = NOW() 
        WHERE id = ${assignmentId}
    `;
    console.log(`[Path Complete] Marked path assignment ${assignmentId} as completed`);

    // 4. Award Bonus (50% of path total)
    const bonus = Math.floor(pathTotalXp * 0.5);
    if (bonus > 0) {
        await sql`UPDATE users SET xp = COALESCE(xp, 0) + ${bonus} WHERE id = ${user.id}`;
        console.log(`[XP Award] Awarded BONUS ${bonus} XP to user ${user.id} for path assignment ${assignmentId}`);
    }

    let totalBonus = bonus;

    // 5. UNLOCK NEXT PATH (And Recursively Check It)

    // a. Get all paths for this user sorted by creation date (to find sequence)
    // We join on learning_paths to order by the original path creation order (or a sequence number if we had one)
    const { rows: allUserPaths } = await sql`
        SELECT ulp.id, ulp.learning_path_id, ulp.status, lp.created_at
        FROM user_learning_paths ulp
        JOIN learning_paths lp ON ulp.learning_path_id = lp.id
        WHERE ulp.user_id = ${user.id}
        ORDER BY lp.created_at ASC
    `;

    const currentIndex = allUserPaths.findIndex(p => p.id === assignmentId);

    if (currentIndex !== -1 && currentIndex < allUserPaths.length - 1) {
        const nextPath = allUserPaths[currentIndex + 1];

        // Only unlock if it's currently locked
        if (nextPath.status === 'locked') {
            await sql`
                UPDATE user_learning_paths 
                SET status = 'in_progress', updated_at = NOW()
                WHERE id = ${nextPath.id}
            `;
            console.log(`[Path Unlock] Unlocked next path (ID: ${nextPath.id}) for user ${user.id}`);

            // **RECURSIVE CHECK**: Immediately check if this newly unlocked path is *already* completed
            // (e.g., if it consists of modules the user has already done in previous paths)
            const nextResult = await checkPathCompletion(user, userEmail, nextPath.id, nextPath.learning_path_id);
            if (nextResult.completed) {
                totalBonus += nextResult.bonusXp;
            }
        }
    }

    return { completed: true, bonusXp: totalBonus };
}
