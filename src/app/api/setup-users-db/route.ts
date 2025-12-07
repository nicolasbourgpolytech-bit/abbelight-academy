import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // Create Users Table
        await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT,
        company VARCHAR(255),
        roles JSONB DEFAULT '["general"]'::jsonb,
        status VARCHAR(50) DEFAULT 'pending', 
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        badges JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

        return NextResponse.json({ message: "Users table created successfully" }, { status: 200 });
    } catch (error) {
        console.error("DB Setup Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
