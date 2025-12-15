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
        const { name, product, dichroic_id, splitter_id, cam1_filter_id, cam2_filter_id, associated_dyes } = body;

        if (!name || !product) {
            return NextResponse.json({ error: 'Name and Product are required' }, { status: 400 });
        }

        const result = await sql`
            INSERT INTO imaging_modalities (name, product, dichroic_id, splitter_id, cam1_filter_id, cam2_filter_id, associated_dyes)
            VALUES (${name}, ${product}, ${dichroic_id || null}, ${splitter_id || null}, ${cam1_filter_id || null}, ${cam2_filter_id || null}, ${JSON.stringify(associated_dyes || [])}::jsonb)
            RETURNING *;
        `;

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, name, product, dichroic_id, splitter_id, cam1_filter_id, cam2_filter_id, associated_dyes } = body;

        if (!id || !name || !product) {
            return NextResponse.json({ error: 'ID, Name and Product are required' }, { status: 400 });
        }

        const result = await sql`
            UPDATE imaging_modalities 
            SET name = ${name}, 
                product = ${product}, 
                dichroic_id = ${dichroic_id || null}, 
                splitter_id = ${splitter_id || null}, 
                cam1_filter_id = ${cam1_filter_id || null}, 
                cam2_filter_id = ${cam2_filter_id || null},
                associated_dyes = ${JSON.stringify(associated_dyes || [])}::jsonb
            WHERE id = ${id}
            RETURNING *;
        `;

        if (result.rowCount === 0) {
            return NextResponse.json({ error: "Modality not found" }, { status: 404 });
        }

        return NextResponse.json(result.rows[0], { status: 200 });
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
