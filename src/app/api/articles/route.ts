import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        if (id) {
            const { rows } = await sql`SELECT * FROM articles WHERE id = ${id}`;
            if (rows.length === 0) {
                return NextResponse.json({ error: 'Article not found' }, { status: 404 });
            }
            return NextResponse.json({ article: rows[0] }, { status: 200 });
        }

        const { rows } = await sql`SELECT * FROM articles ORDER BY date DESC;`;
        return NextResponse.json({ articles: rows }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            title, application_domain, imaging_method, abbelight_imaging_modality,
            abbelight_product, journal, last_author, abbelight_customer,
            publication_date, doi_link
        } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const appDomainJson = JSON.stringify(application_domain || []);
        const imgMethodJson = JSON.stringify(imaging_method || []);
        const abbImgModJson = JSON.stringify(abbelight_imaging_modality || []);
        const abbProdJson = JSON.stringify(abbelight_product || []);

        const { rows } = await sql`
            INSERT INTO articles (
                title, application_domain, imaging_method, abbelight_imaging_modality, 
                abbelight_product, journal, last_author, abbelight_customer, 
                publication_date, doi_link
            )
            VALUES (
                ${title}, ${appDomainJson}, ${imgMethodJson}, ${abbImgModJson}, 
                ${abbProdJson}, ${journal}, ${last_author}, ${abbelight_customer}, 
                ${publication_date}, ${doi_link}
            )
            RETURNING *;
        `;

        return NextResponse.json({ article: rows[0] }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const {
            id, title, application_domain, imaging_method, abbelight_imaging_modality,
            abbelight_product, journal, last_author, abbelight_customer,
            publication_date, doi_link
        } = body;

        if (!id || !title) {
            return NextResponse.json({ error: 'ID and Title are required' }, { status: 400 });
        }

        const appDomainJson = JSON.stringify(application_domain || []);
        const imgMethodJson = JSON.stringify(imaging_method || []);
        const abbImgModJson = JSON.stringify(abbelight_imaging_modality || []);
        const abbProdJson = JSON.stringify(abbelight_product || []);

        const { rows } = await sql`
            UPDATE articles 
            SET title = ${title}, application_domain = ${appDomainJson}, 
                imaging_method = ${imgMethodJson}, abbelight_imaging_modality = ${abbImgModJson},
                abbelight_product = ${abbProdJson}, journal = ${journal}, 
                last_author = ${last_author}, abbelight_customer = ${abbelight_customer},
                publication_date = ${publication_date}, doi_link = ${doi_link}
            WHERE id = ${id}
            RETURNING *;
        `;

        return NextResponse.json({ article: rows[0] }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        if (!id) return NextResponse.json({ error: 'Article ID required' }, { status: 400 });

        await sql`DELETE FROM articles WHERE id = ${id}`;
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}
