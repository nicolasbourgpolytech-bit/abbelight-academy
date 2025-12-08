
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, amount } = body;

        if (!userId || !amount) {
            return NextResponse.json({ error: 'User ID and amount required' }, { status: 400 });
        }

        await sql`UPDATE users SET xp = xp + ${amount} WHERE id = ${userId}`;

        return NextResponse.json({ success: true, message: `Added ${amount} XP` }, { status: 200 });
    } catch (error) {
        console.error("Give XP Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
