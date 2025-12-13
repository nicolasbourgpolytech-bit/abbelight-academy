import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const result = await sql`
            SELECT * FROM optical_components 
            ORDER BY created_at ASC
        `;
        return NextResponse.json(result.rows, { status: 200 });
    } catch (error) {
        console.error("Fetch Optics Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, data, type = 'dichroic', color = '#ffffff', line_style = 'dashed' } = body;

        // Validation
        if (!name || !data) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const result = await sql`
            INSERT INTO optical_components (name, type, data, color, line_style, visible)
            VALUES (${name}, ${type}, ${JSON.stringify(data)}::jsonb, ${color}, ${line_style}, true)
            RETURNING *
        `;

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error("Create Optics Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    try {
        await sql`DELETE FROM optical_components WHERE id = ${id}`;
        return NextResponse.json({ message: "Deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("Delete Optics Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
