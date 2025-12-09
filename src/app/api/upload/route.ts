import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
    const body = (await request.json()) as HandleUploadBody;

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                // You can check user authentication here
                // const user = await auth(request);
                // if (!user) throw new Error('Unauthorized');

                return {
                    allowedContentTypes: ['application/pdf', 'video/mp4', 'image/jpeg', 'image/png'],
                    tokenPayload: JSON.stringify({
                        // optional, sent to your server on upload completion
                        // userId: user.id,
                    }),
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                // Optional, run after upload
                console.log('blob uploaded', blob.url);
            },
        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 400 }, // The webhook will retry 5 times if you return 400
        );
    }
}
