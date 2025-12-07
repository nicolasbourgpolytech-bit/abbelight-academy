import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        // 1. Generate Temp Password (simple 8 char string)
        const tempPassword = Math.random().toString(36).slice(-8);

        // 2. Mock Email Sending
        // TODO: Integrate Resend or similar here
        console.log(`[EMAIL ACTION] ---------------------------------------------------`);
        console.log(`[EMAIL ACTION] To User ID: ${userId}`);
        console.log(`[EMAIL ACTION] Subject: Welcome to Abbelight Academy`);
        console.log(`[EMAIL ACTION] Body: Your account has been approved. Temporary Password: ${tempPassword}`);
        console.log(`[EMAIL ACTION] ---------------------------------------------------`);

        // 3. Update DB
        // Note: In a real app we would hash the password. 
        // For this 'simulation-to-real-MVP' we will store it as is or a simple placeholder 
        // until we add a real auth library (NextAuth.js) or hashing util.
        // Let's pretend we hashed it.
        await sql`
        UPDATE users 
        SET status = 'active', password_hash = ${tempPassword}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ${userId}
    `;

        return NextResponse.json({ message: "User approved", tempPassword }, { status: 200 });
    } catch (error) {
        console.error("Approve User Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
