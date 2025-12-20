import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await sql`CREATE TABLE IF NOT EXISTS webinars (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        duration VARCHAR(50),
        description TEXT,
        video_url TEXT,
        associated_products JSONB DEFAULT '[]'::jsonb,
        authors JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`;

    // Execute schema updates sequentially to ensure reliability
    await sql`ALTER TABLE webinars ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb`;
    await sql`ALTER TABLE webinars ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE webinars ADD COLUMN IF NOT EXISTS date TIMESTAMP WITH TIME ZONE`;
    await sql`ALTER TABLE webinars ADD COLUMN IF NOT EXISTS date TIMESTAMP WITH TIME ZONE`;

    // Drops table if exists to enforce new schema (Dev only behavior ideally, but requested for this change)
    await sql`DROP TABLE IF EXISTS articles`;

    await sql`CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        application_domain JSONB DEFAULT '[]'::jsonb,
        imaging_method JSONB DEFAULT '[]'::jsonb,
        abbelight_imaging_modality JSONB DEFAULT '[]'::jsonb,
        abbelight_product JSONB DEFAULT '[]'::jsonb,
        journal VARCHAR(255),
        first_author VARCHAR(255),
        last_author VARCHAR(255),
        abbelight_customer VARCHAR(255),
        publication_date DATE,
        doi_link TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`;

    await sql`CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(255),
        link TEXT,
        image_url TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`;

    // Add category column if it doesn't exist (for existing tables)
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(255)`;

    // Add subcategory and optical parameters for Objective lenses
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory VARCHAR(255)`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS reference VARCHAR(255)`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS magnification INTEGER`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS na FLOAT`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS immersion VARCHAR(255)`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS tube_lens_focal_length FLOAT`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS correction_collar BOOLEAN`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(255)`;

    return NextResponse.json({ message: "Database updated successfully!" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
