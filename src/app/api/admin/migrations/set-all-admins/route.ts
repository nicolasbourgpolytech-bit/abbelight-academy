import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Update ALL users to have the single role "abbelighter_admin"
        const result = await sql`
            UPDATE users 
            SET roles = '["abbelighter_admin"]'::jsonb
        `;

        return NextResponse.json({
            success: true,
            message: `Migrated users to abbelighter_admin. RowCount: ${result.rowCount}`
        });
    } catch (error) {
        console.error('Migration failed:', error);
        return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
    }
}
