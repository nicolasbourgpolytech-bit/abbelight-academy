import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId'); // Optional: filter by assigned user

    try {
        let result;
        if (userId) {
            // Get paths assigned to user
            // Just list all for now, logic for filtering accessible vs all is complex
            // We'll implementing "All Paths" for admins and specific logic for users later
            result = await sql`
        SELECT lp.*, ulp.status, ulp.completed_at 
        FROM learning_paths lp
        JOIN user_learning_paths ulp ON lp.id = ulp.learning_path_id
        WHERE ulp.user_id = ${userId}
        ORDER BY lp.created_at ASC
       `;
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
