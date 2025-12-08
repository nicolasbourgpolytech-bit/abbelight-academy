
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Fetch user email to clear progress tables which use email
        const { rows: users } = await sql`SELECT email FROM users WHERE id = ${userId}`;
        if (users.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        const email = users[0].email;

        // Reset XP
        await sql`UPDATE users SET xp = 0 WHERE id = ${userId}`;

        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
