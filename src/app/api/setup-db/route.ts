import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        await sql`
      CREATE TABLE IF NOT EXISTS webinars (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        duration TEXT,
        description TEXT,
        video_url TEXT,
        associated_products JSONB DEFAULT '[]'::jsonb,
        authors JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
        return NextResponse.json({ message: "Table 'webinars' created successfully!" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}
