
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userType = searchParams.get('userType');

    try {
        if (!userType) {
            return NextResponse.json({ error: 'User Type is required' }, { status: 400 });
        }

        const result = await sql`
      SELECT lps.*, lp.title, lp.description
      FROM learning_path_sequences lps
      JOIN learning_paths lp ON lps.learning_path_id = lp.id
      WHERE lps.user_type = ${userType}
      ORDER BY lps.position ASC
    `;

        return NextResponse.json({ sequences: result.rows }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userType, learningPathIds } = body;

        if (!userType || !Array.isArray(learningPathIds)) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        // Transaction-like approach: Clear existing sequence for this userType and insert new
        // Note: @vercel/postgres doesn't support sophisticated transactions in simple mode easily, 
        // but we can execute sequentially.

        await sql`DELETE FROM learning_path_sequences WHERE user_type = ${userType}`;

        for (let i = 0; i < learningPathIds.length; i++) {
            await sql`
        INSERT INTO learning_path_sequences (user_type, learning_path_id, position)
        VALUES (${userType}, ${learningPathIds[i]}, ${i})
      `;
        }

        return NextResponse.json({ message: 'Sequence saved successfully' }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
