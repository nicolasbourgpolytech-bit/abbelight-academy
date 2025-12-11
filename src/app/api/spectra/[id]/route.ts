import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const body = await request.json();
        const { name, category, color, excitation_data, emission_data, visible } = body;

        const result = await sql`
            UPDATE fluorophores
            SET 
                name = COALESCE(${name}, name),
                category = COALESCE(${category}, category),
                color = COALESCE(${color}, color),
                excitation_data = COALESCE(${JSON.stringify(excitation_data)}::jsonb, excitation_data),
                emission_data = COALESCE(${JSON.stringify(emission_data)}::jsonb, emission_data),
                visible = COALESCE(${visible}, visible),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${id}
            RETURNING *
        `;

        if (result.rowCount === 0) {
            return NextResponse.json({ error: "Fluorophore not found" }, { status: 404 });
        }

        return NextResponse.json(result.rows[0], { status: 200 });
    } catch (error) {
        console.error("Update Spectra Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const result = await sql`DELETE FROM fluorophores WHERE id = ${id} RETURNING *`;

        if (result.rowCount === 0) {
            return NextResponse.json({ error: "Fluorophore not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("Delete Spectra Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
