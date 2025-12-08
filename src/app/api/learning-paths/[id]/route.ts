import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;
    try {
        // Get path details
        const { rows: pathRows } = await sql`SELECT * FROM learning_paths WHERE id = ${id}`;
        if (pathRows.length === 0) {
            return NextResponse.json({ error: 'Path not found' }, { status: 404 });
        }

        // Get modules in this path
        const { rows: modulesRows } = await sql`
        SELECT m.*, lpm.position
        FROM modules m
        JOIN learning_path_modules lpm ON m.id = lpm.module_id
        WHERE lpm.learning_path_id = ${id}
        ORDER BY lpm.position ASC
     `;

        // Get prerequisites
        const { rows: prereqRows } = await sql`
        SELECT p.* 
        FROM learning_paths p
        JOIN learning_path_prerequisites lpp ON p.id = lpp.prerequisite_path_id
        WHERE lpp.learning_path_id = ${id}
     `;

        return NextResponse.json({
            path: pathRows[0],
            modules: modulesRows,
            prerequisites: prereqRows
        }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;
    try {
        const body = await request.json();
        const { title, description, moduleIds, prerequisitesIds } = body;
        // moduleIds: array of module IDs in order
        // prerequisitesIds: array of path IDs

        // 1. Update Path Info
        if (title) {
            await sql`
            UPDATE learning_paths 
            SET title = ${title}, description = ${description}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ${id}
        `;
        }

        // 2. Update Modules (Full replace for simplicity)
        if (moduleIds) {
            await sql`DELETE FROM learning_path_modules WHERE learning_path_id = ${id}`;

            for (let i = 0; i < moduleIds.length; i++) {
                await sql`
                INSERT INTO learning_path_modules (learning_path_id, module_id, position)
                VALUES (${id}, ${moduleIds[i]}, ${i})
            `;
            }
        }

        // 3. Update Prerequisites
        if (prerequisitesIds) {
            await sql`DELETE FROM learning_path_prerequisites WHERE learning_path_id = ${id}`;
            for (const prereqId of prerequisitesIds) {
                await sql`
                INSERT INTO learning_path_prerequisites (learning_path_id, prerequisite_path_id)
                VALUES (${id}, ${prereqId})
            `;
            }
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;
    try {
        await sql`DELETE FROM learning_paths WHERE id = ${id}`;
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
