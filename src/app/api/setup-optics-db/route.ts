import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // Create Optical Components Table
        await sql`
            CREATE TABLE IF NOT EXISTS optical_components (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(50) DEFAULT 'dichroic',
                data JSONB DEFAULT '[]'::jsonb,
                visible BOOLEAN DEFAULT true,
                color VARCHAR(50) DEFAULT '#ffffff',
                line_style VARCHAR(50) DEFAULT 'dashed',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        return NextResponse.json({ message: "Optical components table created successfully" }, { status: 200 });
    } catch (error) {
        console.error("DB Setup Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
