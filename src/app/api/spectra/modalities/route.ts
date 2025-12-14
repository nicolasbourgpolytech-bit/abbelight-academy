import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const product = searchParams.get('product');

        let result;
        if (product) {
            result = await sql`SELECT * FROM imaging_modalities WHERE product = ${product} ORDER BY name ASC`;
        } else {
            result = await sql`SELECT * FROM imaging_modalities ORDER BY product ASC, name ASC`;
        }

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, product, dichroic_id, splitter_id, cam1_filter_id, cam2_filter_id } = body;

        if (!name || !product) {
            return NextResponse.json({ error: 'Name and Product are required' }, { status: 400 });
        }

        const result = await sql`
            INSERT INTO imaging_modalities (name, product, dichroic_id, splitter_id, cam1_filter_id, cam2_filter_id)
            VALUES (${name}, ${product}, ${dichroic_id || null}, ${splitter_id || null}, ${cam1_filter_id || null}, ${cam2_filter_id || null})
            RETURNING *;
        `;

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
