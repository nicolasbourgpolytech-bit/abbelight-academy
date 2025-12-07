import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get('key');
        const email = searchParams.get('email');
        const password = searchParams.get('pwd');

        if (secret !== 'abbelight-admin-secret-777') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!email || !password) {
            return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
        }

        // Update User
        await sql`
            UPDATE users 
            SET password_hash = ${password}, status = 'active'
            WHERE email = ${email}
        `;

        return NextResponse.json({ message: `Password updated for ${email}` }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: (error as any).toString() }, { status: 500 });
    }
}
