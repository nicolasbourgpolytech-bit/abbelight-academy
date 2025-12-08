import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // Fetch users active in the last 5 minutes
        // We select basic info to display
        const { rows } = await sql`
            SELECT id, first_name, last_name, email, company, last_seen, level, xp
            FROM users 
            WHERE last_seen > NOW() - INTERVAL '1 minute'
            ORDER BY last_seen DESC
        `;

        return NextResponse.json({
            count: rows.length,
            users: rows
        }, { status: 200 });

    } catch (error) {
        console.error("Online Users Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
