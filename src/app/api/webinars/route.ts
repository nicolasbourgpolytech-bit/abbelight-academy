import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        if (id) {
            const { rows } = await sql`SELECT * FROM webinars WHERE id = ${id}`;
            if (rows.length === 0) {
                return NextResponse.json({ error: 'Webinar not found' }, { status: 404 });
            }
            return NextResponse.json({ webinar: rows[0] }, { status: 200 });
        }

        const { rows } = await sql`SELECT * FROM webinars ORDER BY id DESC;`;
        return NextResponse.json({ webinars: rows }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, duration, description, video_url, associated_products, authors, tags, is_new } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        // JSON fields
        const associatedProductsJson = JSON.stringify(associated_products || []);
        const authorsJson = JSON.stringify(authors || []);
        const tagsJson = JSON.stringify(tags || []);
        const isNewBool = !!is_new;

        const { rows } = await sql`
      INSERT INTO webinars (title, duration, description, video_url, associated_products, authors, tags, is_new)
      VALUES (${title}, ${duration}, ${description}, ${video_url}, ${associatedProductsJson}, ${authorsJson}, ${tagsJson}, ${isNewBool})
      RETURNING *;
    `;

        return NextResponse.json({ webinar: rows[0] }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, title, duration, description, video_url, associated_products, authors, tags, is_new } = body;

        if (!id || !title) {
            return NextResponse.json({ error: 'ID and Title are required' }, { status: 400 });
        }

        const associatedProductsJson = JSON.stringify(associated_products || []);
        const authorsJson = JSON.stringify(authors || []);
        const tagsJson = JSON.stringify(tags || []);
        const isNewBool = !!is_new;

        const { rows } = await sql`
      UPDATE webinars 
      SET title = ${title}, duration = ${duration}, description = ${description}, 
          video_url = ${video_url}, associated_products = ${associatedProductsJson}, authors = ${authorsJson},
          tags = ${tagsJson}, is_new = ${isNewBool}
      WHERE id = ${id}
      RETURNING *;
    `;

        return NextResponse.json({ webinar: rows[0] }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        if (!id) return NextResponse.json({ error: 'Webinar ID required' }, { status: 400 });

        await sql`DELETE FROM webinars WHERE id = ${id}`;
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}
