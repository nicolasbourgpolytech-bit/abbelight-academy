import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const result = await sql`
            SELECT * FROM fluorophores 
            ORDER BY created_at ASC
        `;
        return NextResponse.json(result.rows, { status: 200 });
    } catch (error) {
        console.error("Fetch Spectra Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, type, category, color, excitation_peak, emission_peak, excitation_data, emission_data, is_default } = body;

        // Validation
        if (!name || !category || !color) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const result = await sql`
            INSERT INTO fluorophores (name, type, category, color, excitation_peak, emission_peak, excitation_data, emission_data, visible, is_default)
            VALUES (${name}, ${type || 'Organic Dye'}, ${category}, ${color}, ${excitation_peak || null}, ${emission_peak || null}, ${JSON.stringify(excitation_data || [])}::jsonb, ${JSON.stringify(emission_data || [])}::jsonb, true, ${is_default || false})
            RETURNING *
        `;

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error("Create Spectra Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
