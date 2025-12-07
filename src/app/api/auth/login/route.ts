import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
        }

        // Fetch user by email
        const { rows } = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;

        if (rows.length === 0) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        const user = rows[0];

        // 1. Check Status
        if (user.status !== 'active') {
            return NextResponse.json({ error: "Account is not active. Please wait for admin approval." }, { status: 403 });
        }

        // 2. Check Password (MVP: Plain text comparison. TODO: Use bcrypt)
        if (user.password_hash !== password) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        // 3. Return User Profile (excluding password)
        const userProfile = {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            company: user.company,
            role: user.roles, // Ideally map this correctly if needed
            status: user.status,
            xp: user.xp,
            level: user.level,
            badges: user.badges
        };

        return NextResponse.json({ user: userProfile }, { status: 200 });

    } catch (error) {
        console.error("Login Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
