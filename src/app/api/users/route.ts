import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const email = searchParams.get('email');

        let result;
        if (email) {
            result = await sql`SELECT * FROM users WHERE email = ${email}`;
        } else if (status && status !== 'all') {
            result = await sql`
        SELECT id, first_name, last_name, email, company, status, roles, created_at, xp 
        FROM users 
        WHERE status = ${status} 
        ORDER BY created_at DESC
      `;
        } else {
            result = await sql`
        SELECT id, first_name, last_name, email, company, status, roles, created_at, xp 
        FROM users 
        ORDER BY created_at DESC
      `;
        }

        return NextResponse.json({ users: result.rows }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
        }

        await sql`
      UPDATE users 
      SET status = ${status}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        }

        await sql`DELETE FROM users WHERE id = ${id}`;

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
