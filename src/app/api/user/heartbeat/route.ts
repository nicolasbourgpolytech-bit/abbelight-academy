import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: "Missing email" }, { status: 400 });
        }

        // Update last_seen
        await sql`
            UPDATE users 
            SET last_seen = NOW() 
            WHERE email = ${email}
        `;

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error("Heartbeat Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
