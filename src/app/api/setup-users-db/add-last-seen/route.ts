import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        await sql`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;
        `;

        return NextResponse.json({ message: "Added last_seen column to users table" }, { status: 200 });
    } catch (error) {
        console.error("Migration Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
