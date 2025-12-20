import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { rows } = await sql`SELECT * FROM products ORDER BY created_at DESC`;
        return NextResponse.json(rows);
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, link, image_url, description, subcategory, reference, magnification, na, immersion, tube_lens_focal_length, correction_collar, brand } = body;
        // Default category if undefined
        const category = body.category || null;

        const { rows } = await sql`
      INSERT INTO products (name, category, subcategory, reference, magnification, na, immersion, tube_lens_focal_length, correction_collar, link, image_url, description, brand)
      VALUES (${name}, ${category}, ${subcategory}, ${reference}, ${magnification}, ${na}, ${immersion}, ${tube_lens_focal_length}, ${correction_collar}, ${link}, ${image_url}, ${description}, ${brand})
      RETURNING *
    `;
        return NextResponse.json(rows[0]);
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, name, link, image_url, description, subcategory, reference, magnification, na, immersion, tube_lens_focal_length, correction_collar, brand } = body;
        // Default category to null if undefined (though it should be preserved if not sent, technically, but for now we update all)
        // Better: ensure standard update behavior
        const category = body.category || null;

        const { rows } = await sql`
      UPDATE products
      SET name = ${name}, category = ${category}, subcategory = ${subcategory}, reference = ${reference}, magnification = ${magnification}, na = ${na}, immersion = ${immersion}, tube_lens_focal_length = ${tube_lens_focal_length}, correction_collar = ${correction_collar}, link = ${link}, image_url = ${image_url}, description = ${description}, brand = ${brand}
      WHERE id = ${id}
      RETURNING *
    `;
        return NextResponse.json(rows[0]);
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
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
