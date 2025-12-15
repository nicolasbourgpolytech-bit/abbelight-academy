import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // Create Fluorophores Table
        await sql`
            CREATE TABLE IF NOT EXISTS fluorophores (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(50) NOT NULL, -- 'UV', 'Green', 'Red', 'Far-red'
                color VARCHAR(50) NOT NULL,
                excitation_peak INTEGER,
                emission_peak INTEGER,
                visible BOOLEAN DEFAULT true,
                excitation_data JSONB DEFAULT '[]'::jsonb,
                emission_data JSONB DEFAULT '[]'::jsonb,
                is_default BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        // Migration for existing tables (safe to run even if columns exist, will just fail silently or we use IF NOT EXISTS logic if capable, but straight SQL block is easiest try/catch per column)
        try {
            await sql`ALTER TABLE fluorophores ADD COLUMN IF NOT EXISTS excitation_peak INTEGER`;
            await sql`ALTER TABLE fluorophores ADD COLUMN IF NOT EXISTS emission_peak INTEGER`;
            await sql`ALTER TABLE fluorophores ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'Organic Dye'`;
        } catch (e) {
            console.log("Migration columns might already exist", e);
        }

        // Seed Data Logic (simplified inline generation to avoid import issues)
        // Standalone ERF
        const erf = (x: number) => {
            const sign = x >= 0 ? 1 : -1;
            x = Math.abs(x);
            const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
            const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
            const t = 1.0 / (1.0 + p * x);
            return sign * (1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
        };

        const gauss = (x: number, peak: number, width: number, skew: number) => {
            const t = (x - peak) / width;
            return Math.exp(-0.5 * t * t) * (1 + erf(skew * t / Math.sqrt(2)));
        };

        const genSpectrum = (peak: number, width: number, skew: number) => {
            const range = Array.from({ length: 501 }, (_, i) => 300 + i);
            let max = 0;
            const points = range.map(nm => {
                const v = gauss(nm, peak, width, skew);
                if (v > max) max = v;
                return { wavelength: nm, value: v };
            });
            return points.map(p => ({ ...p, value: p.value / max }));
        };

        // Multi-peak for AF647
        const genMulti = (comps: any[]) => {
            const range = Array.from({ length: 501 }, (_, i) => 300 + i);
            let max = 0;
            const points = range.map(nm => {
                let v = 0;
                comps.forEach((c: any) => v += c.w * gauss(nm, c.p, c.wi, c.s));
                if (v > max) max = v;
                return { wavelength: nm, value: v };
            });
            return points.map(p => ({ ...p, value: p.value / (max || 1) }));
        };

        const SEED_DATA = [
            {
                name: 'DAPI', category: 'UV', color: '#00CAF8',
                exPeak: 358, emPeak: 461,
                ex: genSpectrum(358, 20, 0.5), em: genSpectrum(461, 35, 2)
            },
            {
                name: 'Alexa Fluor 488', category: 'Green', color: '#00D296',
                exPeak: 499, emPeak: 520,
                ex: genSpectrum(499, 15, -1), em: genSpectrum(520, 20, 3)
            },
            {
                name: 'CF568', category: 'Red', color: '#FF9B35',
                exPeak: 562, emPeak: 583,
                ex: genSpectrum(562, 18, -0.5), em: genSpectrum(583, 22, 2.5)
            },
            {
                name: 'Alexa Fluor 647', category: 'Far-red', color: '#FF73FF',
                exPeak: 650, emPeak: 665,
                ex: genMulti([{ p: 650, wi: 14, s: 0, w: 1 }, { p: 605, wi: 20, s: 0, w: 0.25 }, { p: 560, wi: 35, s: 0, w: 0.05 }]),
                em: genMulti([{ p: 665, wi: 15, s: 0, w: 1 }, { p: 705, wi: 28, s: 0, w: 0.25 }, { p: 750, wi: 45, s: 0, w: 0.12 }])
            }
        ];

        // Check if table empty
        const count = await sql`SELECT COUNT(*) FROM fluorophores`;
        if (count.rows[0].count === '0') {
            for (const dye of SEED_DATA) {
                await sql`
                    INSERT INTO fluorophores (name, category, color, excitation_peak, emission_peak, excitation_data, emission_data, visible)
                    VALUES (${dye.name}, ${dye.category}, ${dye.color}, ${dye.exPeak}, ${dye.emPeak}, ${JSON.stringify(dye.ex)}::jsonb, ${JSON.stringify(dye.em)}::jsonb, true)
                `;
            }
            return NextResponse.json({ message: "DB Created and Seeded" }, { status: 200 });
        }

        return NextResponse.json({ message: "Fluorophores table created successfully (or already exists)" }, { status: 200 });
    } catch (error) {
        console.error("DB Setup Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

