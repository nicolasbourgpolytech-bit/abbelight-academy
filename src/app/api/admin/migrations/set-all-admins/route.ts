import { NextResponse } from 'next/server';
import { pool } from '@/lib/db'; // Assuming standard db connection

export async function GET() {
    try {
        const client = await pool.connect();
        try {
            // Update ALL users to have the single role "abbelighter_admin"
            const result = await client.query(`
                UPDATE users 
                SET roles = '["abbelighter_admin"]'::jsonb
            `);

            return NextResponse.json({
                success: true,
                message: `Migrated ${result.rowCount} users to abbelighter_admin.`
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Migration failed:', error);
        return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
    }
}
