import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS user_progress (
                id SERIAL PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                module_id VARCHAR(50) NOT NULL,
                chapter_id VARCHAR(50) NOT NULL,
                completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_email, module_id, chapter_id)
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS user_module_progress (
                id SERIAL PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                module_id VARCHAR(50) NOT NULL,
                is_completed BOOLEAN DEFAULT FALSE,
                completed_at TIMESTAMP WITH TIME ZONE,
                UNIQUE(user_email, module_id)
            );
        `;

        return NextResponse.json({ message: 'Progress tables created successfully' }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}
