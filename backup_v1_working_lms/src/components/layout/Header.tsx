"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export function Header() {
    const pathname = usePathname();
    if (pathname.startsWith("/dashboard")) return null;

    return (
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 transition-all duration-300 bg-black/80 backdrop-blur-md border-b border-white/5">
            <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative w-32 h-10 transition-transform group-hover:scale-105">
                        <Image
                            src="/abbelight-logo.png"
                            alt="Abbelight"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <span className="text-xl font-light text-gray-300 border-l border-white/20 pl-3 tracking-widest uppercase">
                        Academy
                    </span>
                </Link>
            </div>

            {/* Navigation removed as per user request */}
            <div className="flex-1"></div>

            <div className="flex items-center gap-6">
                <Link
                    href="/login"
                    className="text-sm font-bold text-white hover:text-primary transition-colors uppercase tracking-wide"
                >
                    Sign In
                </Link>
                <button className="px-6 py-2.5 bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-primary hover:text-black hover:border-primary transition-all duration-300 uppercase tracking-wider">
                    Get Started
                </button>
            </div>
        </header>
    );
}
