import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // Clear existing products to avoid duplicates/conflicts
        await sql`DELETE FROM products`;

        // Insert standard Abbelight products
        await sql`
            INSERT INTO products (name, image_url, description)
            VALUES 
            ('SAFe M45', '/product-images/safe-m45-v3.png', 'Single-camera add-on for 3D localization microscopy.'),
            ('SAFe M90', '/product-images/safe-m90-v3.png', 'Dual-camera add-on for multicolor 3D localization microscopy.'),
            ('SAFe MN180', '/product-images/safe-mn180-v3.png', 'Turnkey system for single-color 3D nanoscopy.'),
            ('SAFe MN360', '/product-images/safe-mn360-v3.png', 'Turnkey system for multicolor 3D nanoscopy.')
        `;

        const { rows } = await sql`SELECT * FROM products`;

        return NextResponse.json({
            message: "Products seeded successfully",
            count: rows.length,
            products: rows
        }, { status: 200 });
    } catch (error) {
        console.error("Product Seeding Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
