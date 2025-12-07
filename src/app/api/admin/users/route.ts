import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        let query;
        if (status) {
            query = await sql`SELECT * FROM users WHERE status = ${status} ORDER BY created_at DESC`;
        } else {
            query = await sql`SELECT * FROM users ORDER BY created_at DESC`;
        }

        return NextResponse.json(query.rows, { status: 200 });
    } catch (error) {
        console.error("Fetch Users Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}


export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
        }

        await sql`DELETE FROM users WHERE id = ${id}`;

        return NextResponse.json({ message: "User deleted" }, { status: 200 });
    } catch (error) {
        console.error("Delete User Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
