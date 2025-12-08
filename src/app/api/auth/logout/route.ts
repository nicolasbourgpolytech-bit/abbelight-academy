import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: "Missing email" }, { status: 400 });
        }

        // Set last_seen to a past date (e.g., 1 hour ago) to immediately mark as offline
        // or NULL depending on preference. Using past date is safer for queries using "> interval".
        await sql`
            UPDATE users 
            SET last_seen = NOW() - INTERVAL '1 hour'
            WHERE email = ${email}
        `;

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error("Logout Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
