import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // Create Imaging Modalities Table
        await sql`
            CREATE TABLE IF NOT EXISTS imaging_modalities (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                product VARCHAR(50) NOT NULL, -- 'MN360', 'MN180', 'M90', 'M45'
                dichroic_id UUID,
                splitter_id UUID,
                cam1_filter_id UUID,
                cam1_filter_id UUID,
                cam2_filter_id UUID,
                associated_dyes JSONB DEFAULT '[]'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        // Migration: Add column if it doesn't exist (simplest way is try/catch or explicit ALTER)
        try {
            await sql`ALTER TABLE imaging_modalities ADD COLUMN IF NOT EXISTS associated_dyes JSONB DEFAULT '[]'::jsonb`;
        } catch (e) {
            console.log("Migration column might already exist", e);
        }

        return NextResponse.json({ message: "Imaging Modalities table created successfully" }, { status: 200 });
    } catch (error) {
        console.error("DB Setup Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
