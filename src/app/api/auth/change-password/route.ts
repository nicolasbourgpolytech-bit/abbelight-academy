import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, currentPassword, newPassword } = body;

        if (!email || !currentPassword || !newPassword) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        // 1. Verify current password
        // Note: Currently using plain text as per legacy system. 
        // TODO: Upgrade to bcrypt when migrating all users.
        const userQuery = await sql`
            SELECT * FROM users WHERE email = ${email} AND password_hash = ${currentPassword}
        `;

        if (userQuery.rows.length === 0) {
            return NextResponse.json({ error: "Incorrect current password" }, { status: 401 });
        }

        // 2. Update to new password
        await sql`
            UPDATE users 
            SET password_hash = ${newPassword} 
            WHERE email = ${email}
        `;

        return NextResponse.json({ message: "Password updated successfully" }, { status: 200 });

    } catch (error: any) {
        console.error("Change Password Error:", error);
        return NextResponse.json({ error: error.toString() }, { status: 500 });
    }
}
