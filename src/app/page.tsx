import { Hero } from "@/components/landing/Hero";
import { Stats } from "@/components/landing/Stats";
import { sql } from "@vercel/postgres";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const articlesCount = await sql`SELECT COUNT(*) FROM articles`;
  const webinarsCount = await sql`SELECT COUNT(*) FROM webinars`;
  const usersCount = await sql`SELECT COUNT(*) FROM users WHERE status = 'active'`;
  const modulesCount = await sql`SELECT COUNT(*) FROM modules`;

  return (
    <main className="min-h-screen flex flex-col bg-background selection:bg-primary/30">
      <Hero />
      <Stats
        articlesCount={Number(articlesCount.rows[0].count)}
        webinarsCount={Number(webinarsCount.rows[0].count)}
        usersCount={Number(usersCount.rows[0].count)}
        modulesCount={Number(modulesCount.rows[0].count)}
      />

      {/* Footer Placeholder */}
      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-white/5 bg-black/20">
        <p>
          &copy; {new Date().getFullYear()} Abbelight Academy. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
