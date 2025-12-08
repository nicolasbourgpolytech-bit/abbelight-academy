
const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function checkXP() {
    try {
        console.log('--- Checking Connection and Tables ---');
        const { rows } = await sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `;
        console.log('Tables:', rows.map(r => r.table_name));

        console.log('--- Checking Modules ---');
        const mods = await sql`SELECT id, title, xp FROM modules LIMIT 5`;
        console.log('Modules Sample:', mods.rows);

    } catch (err) {
        console.error('DB Error:', err);
    }
}

checkXP();
