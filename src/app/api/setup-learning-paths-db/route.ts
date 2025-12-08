import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Learning Paths Table
    await sql`
      CREATE TABLE IF NOT EXISTS learning_paths (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 2. Learning Path Modules (Linking modules to paths with ordering)
    await sql`
      CREATE TABLE IF NOT EXISTS learning_path_modules (
        id SERIAL PRIMARY KEY,
        learning_path_id INTEGER REFERENCES learning_paths(id) ON DELETE CASCADE,
        module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
        position INTEGER DEFAULT 0,
        UNIQUE(learning_path_id, module_id)
      );
    `;

    // 3. User Assignments to Learning Paths
    await sql`
      CREATE TABLE IF NOT EXISTS user_learning_paths (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        learning_path_id INTEGER REFERENCES learning_paths(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'completed'
        completed_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(user_id, learning_path_id)
      );
    `;

    // 4. Prerequisites (One path requires another)
    await sql`
      CREATE TABLE IF NOT EXISTS learning_path_prerequisites (
        id SERIAL PRIMARY KEY,
        learning_path_id INTEGER REFERENCES learning_paths(id) ON DELETE CASCADE,
        prerequisite_path_id INTEGER REFERENCES learning_paths(id) ON DELETE CASCADE,
        UNIQUE(learning_path_id, prerequisite_path_id)
      );
    `;

    // 5. Learning Path Sequences (Builder)
    await sql`
      CREATE TABLE IF NOT EXISTS learning_path_sequences (
        id SERIAL PRIMARY KEY,
        user_type VARCHAR(100) NOT NULL,
        learning_path_id INTEGER REFERENCES learning_paths(id) ON DELETE CASCADE,
        position INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    return NextResponse.json({ message: "Learning Paths tables created successfully!" }, { status: 200 });
  } catch (error) {
    console.error("DB Setup Error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
