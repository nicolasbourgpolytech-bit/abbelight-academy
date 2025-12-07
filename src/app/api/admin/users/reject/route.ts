import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        // Mock Email Sending for Rejection
        console.log(`[EMAIL ACTION] ---------------------------------------------------`);
        console.log(`[EMAIL ACTION] To User ID: ${userId}`);
        console.log(`[EMAIL ACTION] Subject: Abbelight Academy Account Update`);
        console.log(`[EMAIL ACTION] Body: Your account request has been declined.`);
        console.log(`[EMAIL ACTION] ---------------------------------------------------`);

        // Update DB
        await sql`
            UPDATE users 
            SET status = 'rejected', updated_at = CURRENT_TIMESTAMP 
            WHERE id = ${userId}
        `;

        return NextResponse.json({ message: "User rejected" }, { status: 200 });
    } catch (error) {
        console.error("Reject User Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
