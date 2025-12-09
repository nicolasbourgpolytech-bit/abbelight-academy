import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename') || 'file';

        // Check if we are checking database/token or environment
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN is not defined in environment variables.' }, { status: 500 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Upload to Vercel Blob
        const blob = await put(file.name, file, {
            access: 'public',
        });

        return NextResponse.json({ url: blob.url });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: `Upload failed: ${(error as any).message}` }, { status: 500 });
    }
}
