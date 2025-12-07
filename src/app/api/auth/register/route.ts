import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { UserRole } from '@/types/user';

export async function POST(request: Request) {
    try {
        const { firstName, lastName, email, company, roles } = await request.json();

        // Validation
        if (!firstName || !lastName || !email || !company) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if user exists
        const existingUser = await sql`SELECT * FROM users WHERE email = ${email}`;
        if (existingUser.rows.length > 0) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 });
        }

        // Default status is 'pending'
        const status = 'pending';

        // Ensure roles is valid JSON array string for DB
        const rolesJson = JSON.stringify(roles || ['general']);

        // Insert user
        await sql`
      INSERT INTO users (first_name, last_name, email, company, roles, status)
      VALUES (${firstName}, ${lastName}, ${email}, ${company}, ${rolesJson}, ${status})
    `;

        // Mock Email Notification to Admin
        console.log(`[EMAIL MOCK] Sending email to Admin: New user registration request from ${firstName} ${lastName} (${email}). Role requested: ${rolesJson}`);

        return NextResponse.json({ message: "Registration successful" }, { status: 201 });
    } catch (error) {
        console.error("Registration Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
