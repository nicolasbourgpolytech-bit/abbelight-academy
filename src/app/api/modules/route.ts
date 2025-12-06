import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        if (id) {
            const { rows } = await sql`SELECT * FROM modules WHERE id = ${id};`;
            if (rows.length === 0) {
                return NextResponse.json({ error: 'Module not found' }, { status: 404 });
            }
            return NextResponse.json({ module: rows[0] }, { status: 200 });
        }

        const { rows } = await sql`SELECT * FROM modules ORDER BY id DESC;`;
        return NextResponse.json({ modules: rows }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, description, level, xp } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const { rows } = await sql`
      INSERT INTO modules (title, description, level, xp)
      VALUES (${title}, ${description}, ${level}, ${xp})
      RETURNING *;
    `;

        return NextResponse.json({ module: rows[0] }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, title, description, level, xp } = body;

        if (!id || !title) {
            return NextResponse.json({ error: 'ID and Title are required' }, { status: 400 });
        }

        const { rows } = await sql`
      UPDATE modules 
      SET title = ${title}, description = ${description}, level = ${level}, xp = ${xp}
      WHERE id = ${id}
      RETURNING *;
    `;

        return NextResponse.json({ module: rows[0] }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        if (!id) return NextResponse.json({ error: 'Module ID required' }, { status: 400 });

        await sql`DELETE FROM modules WHERE id = ${id}`;
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}
