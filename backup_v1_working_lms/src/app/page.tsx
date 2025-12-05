import { Hero } from "@/components/landing/Hero";
import { Stats } from "@/components/landing/Stats";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-background selection:bg-primary/30">
      <Hero />
      <Stats />

      {/* Footer Placeholder */}
      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-white/5 bg-black/20">
        <p>
          &copy; {new Date().getFullYear()} Abbelight Academy. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
