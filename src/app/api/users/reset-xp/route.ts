import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        await sql`UPDATE users SET xp = 0 WHERE id = ${userId}`;

        // Also reset progress? User said "remettre les compteurs d'XP à 0". 
        // Usually implies resetting the "score", not necessarily the progress (modules completed).
        // If he wants to re-test, he might want progress reset too.
        // But the request strictly said "XP counters". I will stick to XP only to be safe, 
        // or provide an options flag if I had more UI control.
        // Let's assume XP only for now as requested.

        return NextResponse.json({ success: true, message: "XP reset to 0" }, { status: 200 });
    } catch (error) {
        console.error("Reset XP Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
