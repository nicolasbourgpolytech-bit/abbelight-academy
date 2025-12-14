import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await sql`DELETE FROM imaging_modalities WHERE id = ${id}`;
        return NextResponse.json({ message: 'Modality deleted successfully' });
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
