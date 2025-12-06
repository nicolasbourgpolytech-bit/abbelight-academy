import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await sql`CREATE TABLE IF NOT EXISTS webinars (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        duration VARCHAR(50),
        description TEXT,
        video_url TEXT,
        associated_products JSONB DEFAULT '[]'::jsonb,
        authors JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`;

    // Execute schema updates sequentially to ensure reliability
    await sql`ALTER TABLE webinars ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb`;
    await sql`ALTER TABLE webinars ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false`;
    return NextResponse.json({ message: "Table 'webinars' created successfully!" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
