import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');

    try {
        if (moduleId) {
            const { rows } = await sql`SELECT * FROM chapters WHERE module_id = ${moduleId} ORDER BY position ASC;`;
            return NextResponse.json({ chapters: rows }, { status: 200 });
        }
        return NextResponse.json({ error: 'Module ID is required' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { module_id, title, type, content_url, data, duration } = body;

        if (!module_id || !title || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get current max position to append to end
        const { rows: current } = await sql`SELECT MAX(position) as max_pos FROM chapters WHERE module_id = ${module_id}`;
        const nextPos = (current[0]?.max_pos || 0) + 1;

        // Ensure data is stringified for JSONB column if it's an object/array
        // The pg driver can sometimes confuse arrays for Postgres Arrays instead of JSON
        const dataJson = typeof data === 'object' ? JSON.stringify(data) : data;

        const { rows } = await sql`
      INSERT INTO chapters (module_id, title, type, content_url, data, duration, position)
      VALUES (${module_id}, ${title}, ${type}, ${content_url}, ${dataJson}, ${duration}, ${nextPos})
      RETURNING *;
    `;

        return NextResponse.json({ chapter: rows[0] }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, title, type, content_url, data, duration, position } = body;

        if (!id || !title) {
            return NextResponse.json({ error: 'ID and Title are required' }, { status: 400 });
        }

        const dataJson = typeof data === 'object' ? JSON.stringify(data) : data;

        const { rows } = await sql`
            UPDATE chapters 
            SET title = ${title}, type = ${type}, content_url = ${content_url}, 
                data = ${dataJson}, duration = ${duration}, position = ${position}
            WHERE id = ${id}
            RETURNING *;
        `;

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
        }

        return NextResponse.json({ chapter: rows[0] }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        if (!id) return NextResponse.json({ error: 'Chapter ID required' }, { status: 400 });

        await sql`DELETE FROM chapters WHERE id = ${id}`;
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
