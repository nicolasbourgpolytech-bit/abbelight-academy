
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        await sql`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS total_time_spent INTEGER DEFAULT 0;
        `;

        return NextResponse.json({ message: "Added total_time_spent column to users table" }, { status: 200 });
    } catch (error) {
        console.error("Migration Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
