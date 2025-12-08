import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId'); // Optional: filter by assigned user

    try {
        let result;
        if (userId) {
            // 1. Fetch User to get roles
            const userRes = await sql`SELECT roles FROM users WHERE id = ${userId}`;
            if (userRes.rows.length === 0) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }
            // Parse roles (handle string or array)
            let roles = userRes.rows[0].roles;
            if (typeof roles === 'string') {
                try { roles = JSON.parse(roles); } catch (e) { roles = []; }
            }
            if (!Array.isArray(roles)) roles = [];

            // 2. Determine User Type priority
            // Priority: abbelighter_admin > abbelighter > safe > reagent
            let targetType = 'reagent'; // Default
            if (roles.includes('abbelighter_admin')) targetType = 'abbelighter_admin';
            else if (roles.includes('abbelighter')) targetType = 'abbelighter';
            else if (roles.includes('safe')) targetType = 'safe';
            else if (roles.includes('reagent')) targetType = 'reagent';

            // 3. Check for Sequence
            // We want to return paths in the order defined by the sequence.
            // We LEFT JOIN user_learning_paths to get progress if it exists.
            result = await sql`
                SELECT lp.*, 
                       COALESCE(ulp.status, 'locked') as status, 
                       ulp.completed_at
                FROM learning_path_sequences lps
                JOIN learning_paths lp ON lps.learning_path_id = lp.id
                LEFT JOIN user_learning_paths ulp ON lp.id = ulp.learning_path_id AND ulp.user_id = ${userId}
                WHERE lps.user_type = ${targetType}
                ORDER BY lps.position ASC
            `;

            // 4. Fallback: If no sequence defined (count 0), use old logic (assigned paths)
            if (result.rows.length === 0) {
                result = await sql`
                    SELECT lp.*, ulp.status, ulp.completed_at 
                    FROM learning_paths lp
                    JOIN user_learning_paths ulp ON lp.id = ulp.learning_path_id
                    WHERE ulp.user_id = ${userId}
                    ORDER BY lp.created_at ASC
                `;
            } else {
                // Post-processing for Sequence: 
                // Ensure the first unlocked/incomplete path is 'in_progress' if logic dictates, 
                // but usually the frontend handles "Current Step" visualization.
                // However, we rely on 'status' from DB. 
                // If a user has never started the path, it returns 'locked' (COALESCE).
                // We might want to force the *first* path to be 'in_progress' (or at least unlocked) if it is 'locked'.
                // But let's leave as is; the frontend might need 'in_progress' to allow clicking?
                // Actually, frontend checks `!isLocked`.
                // If we return 'locked', frontend might disable it.
                // Let's ensure the FIRST path is always accessible if user hasn't started anything.
                if (result.rows.length > 0 && result.rows[0].status === 'locked') {
                    // We can't easily change the 'status' in the row object without iterating.
                    result.rows[0].status = 'in_progress'; // Virtual unlock for first item
                }
            }

        } else {
            // Admin: List all paths
            result = await sql`SELECT * FROM learning_paths ORDER BY created_at ASC`;
        }

        return NextResponse.json({ paths: result.rows }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, description } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const { rows } = await sql`
      INSERT INTO learning_paths (title, description)
      VALUES (${title}, ${description})
      RETURNING *;
    `;

        return NextResponse.json({ path: rows[0] }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
