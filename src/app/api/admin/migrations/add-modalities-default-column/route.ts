import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const result = await sql`
            ALTER TABLE imaging_modalities 
            ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE
        `;

        return NextResponse.json({
            success: true,
            message: `Added is_default column to imaging_modalities.`
        });
    } catch (error) {
        console.error('Migration failed:', error);
        return NextResponse.json({ error: 'Migration failed: ' + (error as Error).message }, { status: 500 });
    }
}
