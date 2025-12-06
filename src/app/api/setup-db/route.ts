import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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
    await sql`ALTER TABLE webinars ADD COLUMN IF NOT EXISTS date TIMESTAMP WITH TIME ZONE`;
    await sql`ALTER TABLE webinars ADD COLUMN IF NOT EXISTS date TIMESTAMP WITH TIME ZONE`;

    await sql`CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        content TEXT,
        cover_image TEXT,
        associated_products JSONB DEFAULT '[]'::jsonb,
        authors JSONB DEFAULT '[]'::jsonb,
        tags JSONB DEFAULT '[]'::jsonb,
        is_new BOOLEAN DEFAULT false,
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`;

    return NextResponse.json({ message: "Database updated successfully!" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
