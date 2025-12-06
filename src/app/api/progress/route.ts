import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    try {
        const { rows: chapters } = await sql`
            SELECT module_id, chapter_id FROM user_progress WHERE user_email = ${email}
        `;
        const { rows: modules } = await sql`
            SELECT module_id FROM user_module_progress WHERE user_email = ${email} AND is_completed = TRUE
        `;

        return NextResponse.json({
            completedChapterIds: chapters.map(c => `${c.module_id}-${c.chapter_id}`),
            completedModuleIds: modules.map(m => m.module_id.toString())
        }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, moduleId, chapterId, type } = body; // type: 'chapter' | 'module'

        if (!email || !moduleId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (type === 'chapter') {
            if (!chapterId) return NextResponse.json({ error: 'Chapter ID required' }, { status: 400 });

            await sql`
                INSERT INTO user_progress (user_email, module_id, chapter_id)
                VALUES (${email}, ${moduleId}, ${chapterId})
                ON CONFLICT (user_email, module_id, chapter_id) DO NOTHING
            `;
            return NextResponse.json({ success: true }, { status: 200 });
        }

        if (type === 'module') {
            await sql`
                INSERT INTO user_module_progress (user_email, module_id, is_completed, completed_at)
                VALUES (${email}, ${moduleId}, TRUE, NOW())
                ON CONFLICT (user_email, module_id) 
                DO UPDATE SET is_completed = TRUE, completed_at = NOW()
            `;
            return NextResponse.json({ success: true }, { status: 200 });
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}
