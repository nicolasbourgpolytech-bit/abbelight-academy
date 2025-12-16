import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        // Fetch all products to enrich the response with latest data (links, images)
        const productsResult = await sql`SELECT * FROM products`;
        const allProducts = productsResult.rows;

        const enrichWebinar = (web: any) => {
            let associated = [];
            // Handle parsing if it comes as string (should be object from pg driver usually, but safe guard)
            try {
                associated = typeof web.associated_products === 'string'
                    ? JSON.parse(web.associated_products)
                    : web.associated_products || [];
            } catch (e) { associated = []; }

            // Merge with fresh product data matched by NAME
            const enrichedProducts = associated.map((p: any) => {
                const freshProduct = allProducts.find((fp: any) => fp.name === p.name);
                return freshProduct ? { ...p, ...freshProduct } : p;
            });

            return {
                ...web,
                associated_products: enrichedProducts
            };
        };

        if (id) {
            const { rows } = await sql`SELECT * FROM webinars WHERE id = ${id}`;
            if (rows.length === 0) {
                return NextResponse.json({ error: 'Webinar not found' }, { status: 404 });
            }
            return NextResponse.json({ webinar: enrichWebinar(rows[0]) }, { status: 200 });
        }

        const { rows } = await sql`SELECT * FROM webinars ORDER BY id DESC;`;
        const enrichedRows = rows.map(enrichWebinar);
        return NextResponse.json({ webinars: enrichedRows }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, duration, description, video_url, associated_products, authors, tags, is_new, date } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        // JSON fields
        const associatedProductsJson = JSON.stringify(associated_products || []);
        const authorsJson = JSON.stringify(authors || []);
        const tagsJson = JSON.stringify(tags || []);
        const isNewBool = !!is_new;
        // Use provided date or current timestamp if empty (though created_at handles true creation time)
        const dateValue = date || new Date().toISOString();

        const { rows } = await sql`
      INSERT INTO webinars (title, duration, description, video_url, associated_products, authors, tags, is_new, date)
      VALUES (${title}, ${duration}, ${description}, ${video_url}, ${associatedProductsJson}, ${authorsJson}, ${tagsJson}, ${isNewBool}, ${dateValue})
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
        const { id, title, duration, description, video_url, associated_products, authors, tags, is_new, date } = body;

        if (!id || !title) {
            return NextResponse.json({ error: 'ID and Title are required' }, { status: 400 });
        }

        const associatedProductsJson = JSON.stringify(associated_products || []);
        const authorsJson = JSON.stringify(authors || []);
        const tagsJson = JSON.stringify(tags || []);
        const isNewBool = !!is_new;
        const dateValue = date || new Date().toISOString();

        const { rows } = await sql`
      UPDATE webinars 
      SET title = ${title}, duration = ${duration}, description = ${description}, 
          video_url = ${video_url}, associated_products = ${associatedProductsJson}, authors = ${authorsJson},
          tags = ${tagsJson}, is_new = ${isNewBool}, date = ${dateValue}
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
