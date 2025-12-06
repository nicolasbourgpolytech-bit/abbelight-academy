import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const { rows } = await sql`SELECT * FROM webinars ORDER BY id DESC;`;
        return NextResponse.json({ webinars: rows }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, duration, description, video_url, associated_products, authors } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        // associated_products and authors should be passed as JSON arrays
        const associatedProductsJson = JSON.stringify(associated_products || []);
        const authorsJson = JSON.stringify(authors || []);

        const { rows } = await sql`
      INSERT INTO webinars (title, duration, description, video_url, associated_products, authors)
      VALUES (${title}, ${duration}, ${description}, ${video_url}, ${associatedProductsJson}, ${authorsJson})
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
        const { id, title, duration, description, video_url, associated_products, authors } = body;

        if (!id || !title) {
            return NextResponse.json({ error: 'ID and Title are required' }, { status: 400 });
        }

        const associatedProductsJson = JSON.stringify(associated_products || []);
        const authorsJson = JSON.stringify(authors || []);

        const { rows } = await sql`
      UPDATE webinars 
      SET title = ${title}, duration = ${duration}, description = ${description}, 
          video_url = ${video_url}, associated_products = ${associatedProductsJson}, authors = ${authorsJson}
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
