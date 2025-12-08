import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    try {
        if (id) {
            const { rows } = await sql`SELECT * FROM modules WHERE id = ${id};`;
            if (rows.length === 0) {
                return NextResponse.json({ error: 'Module not found' }, { status: 404 });
            }
            return NextResponse.json({ module: rows[0] }, { status: 200 });
        }

        let modulesQuery = sql`SELECT * FROM modules ORDER BY id DESC;`;
        const { rows: allModules } = await modulesQuery;

        // If userId is provided, filter based on Learning Path access
        if (userId) {
            // 1. Get modules that are part of any learning path
            const { rows: pathModules } = await sql`SELECT module_id, learning_path_id FROM learning_path_modules`;

            // 2. Get completed paths for user
            const { rows: completedPaths } = await sql`
                SELECT learning_path_id 
                FROM user_learning_paths 
                WHERE user_id = ${userId} AND status = 'completed'
            `;
            const completedPathIds = new Set(completedPaths.map(r => r.learning_path_id));

            // 3. Filter
            const modulesInPaths = new Map<number, Set<number>>();
            pathModules.forEach(row => {
                if (!modulesInPaths.has(row.module_id)) {
                    modulesInPaths.set(row.module_id, new Set());
                }
                modulesInPaths.get(row.module_id)?.add(row.learning_path_id);
            });

            const filteredModules = allModules.filter(module => {
                const associatedPathIds = modulesInPaths.get(module.id);

                // If module is not in any path, it's accessible
                if (!associatedPathIds) return true;

                // If module is in paths, check if user has completed AT LEAST ONE of those paths
                for (const pathId of Array.from(associatedPathIds)) {
                    if (completedPathIds.has(pathId)) return true;
                }

                // Otherwise hidden
                return false;
            });

            return NextResponse.json({ modules: filteredModules }, { status: 200 });
        }

        return NextResponse.json({ modules: allModules }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, description, level, xp } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const { rows } = await sql`
      INSERT INTO modules (title, description, level, xp)
      VALUES (${title}, ${description}, ${level}, ${xp})
      RETURNING *;
    `;

        return NextResponse.json({ module: rows[0] }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, title, description, level, xp } = body;

        if (!id || !title) {
            return NextResponse.json({ error: 'ID and Title are required' }, { status: 400 });
        }

        const { rows } = await sql`
      UPDATE modules 
      SET title = ${title}, description = ${description}, level = ${level}, xp = ${xp}
      WHERE id = ${id}
      RETURNING *;
    `;

        return NextResponse.json({ module: rows[0] }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        if (!id) return NextResponse.json({ error: 'Module ID required' }, { status: 400 });

        await sql`DELETE FROM modules WHERE id = ${id}`;
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}
