import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        if (id) {
            const { rows } = await sql`SELECT * FROM articles WHERE id = ${id}`;
            if (rows.length === 0) {
                return NextResponse.json({ error: 'Article not found' }, { status: 404 });
            }
            return NextResponse.json({ article: rows[0] }, { status: 200 });
        }

        const { rows } = await sql`SELECT * FROM articles ORDER BY date DESC;`;
        return NextResponse.json({ articles: rows }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, description, content, cover_image, associated_products, authors, tags, is_new, date } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        // JSON fields
        const associatedProductsJson = JSON.stringify(associated_products || []);
        const authorsJson = JSON.stringify(authors || []);
        const tagsJson = JSON.stringify(tags || []);
        const isNewBool = !!is_new;
        const dateValue = date || new Date().toISOString();

        const { rows } = await sql`
      INSERT INTO articles (title, description, content, cover_image, associated_products, authors, tags, is_new, date)
      VALUES (${title}, ${description}, ${content}, ${cover_image}, ${associatedProductsJson}, ${authorsJson}, ${tagsJson}, ${isNewBool}, ${dateValue})
      RETURNING *;
    `;

        return NextResponse.json({ article: rows[0] }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, title, description, content, cover_image, associated_products, authors, tags, is_new, date } = body;

        if (!id || !title) {
            return NextResponse.json({ error: 'ID and Title are required' }, { status: 400 });
        }

        const associatedProductsJson = JSON.stringify(associated_products || []);
        const authorsJson = JSON.stringify(authors || []);
        const tagsJson = JSON.stringify(tags || []);
        const isNewBool = !!is_new;
        const dateValue = date || new Date().toISOString();

        const { rows } = await sql`
      UPDATE articles 
      SET title = ${title}, description = ${description}, content = ${content}, 
          cover_image = ${cover_image}, associated_products = ${associatedProductsJson}, authors = ${authorsJson},
          tags = ${tagsJson}, is_new = ${isNewBool}, date = ${dateValue}
      WHERE id = ${id}
      RETURNING *;
    `;

        return NextResponse.json({ article: rows[0] }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        if (!id) return NextResponse.json({ error: 'Article ID required' }, { status: 400 });

        await sql`DELETE FROM articles WHERE id = ${id}`;
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}
