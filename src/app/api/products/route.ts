import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const { rows } = await sql`SELECT * FROM products ORDER BY created_at DESC`;
        return NextResponse.json(rows);
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { name, link, image_url, description } = await request.json();
        const { rows } = await sql`
      INSERT INTO products (name, link, image_url, description)
      VALUES (${name}, ${link}, ${image_url}, ${description})
      RETURNING *
    `;
        return NextResponse.json(rows[0]);
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { id, name, link, image_url, description } = await request.json();
        const { rows } = await sql`
      UPDATE products
      SET name = ${name}, link = ${link}, image_url = ${image_url}, description = ${description}
      WHERE id = ${id}
      RETURNING *
    `;
        return NextResponse.json(rows[0]);
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        await sql`DELETE FROM products WHERE id = ${id}`;
        return NextResponse.json({ message: 'Deleted' });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}
