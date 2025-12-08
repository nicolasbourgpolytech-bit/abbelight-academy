
const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function dumpDB() {
    try {
        console.log('--- TABLES ---');
        const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
        console.log(tables.rows.map(r => r.table_name));

        console.log('--- LEARNING PATHS ---');
        const paths = await sql`SELECT * FROM learning_paths`;
        console.log(JSON.stringify(paths.rows, null, 2));

        console.log('--- MODULES ---');
        const modules = await sql`SELECT * FROM modules`;
        console.log(JSON.stringify(modules.rows, null, 2));

        console.log('--- PATH MODULES ---');
        const pm = await sql`SELECT * FROM learning_path_modules`;
        console.log(JSON.stringify(pm.rows, null, 2));

    } catch (err) {
        console.error(err);
    }
}

dumpDB();
