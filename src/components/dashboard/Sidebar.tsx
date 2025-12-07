"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

const navItems = [
    {
        name: "Dashboard", href: "/dashboard", icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
        )
    },
    {
        name: "Academy LMS", href: "/dashboard/academy", icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
        )
    },
    {
        name: "Articles", href: "/dashboard/articles", icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
        )
    },
    {
        name: "Webinars", href: "/dashboard/webinars", icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
        )
    },
    {
        name: "Apps & Tools", href: "/dashboard/apps", icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4 4m4 4V4" />
            </svg>
        )
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useUser();
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    // Get initials or fallback
    const initials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
        : (user?.firstName && user?.lastName)
            ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
            : "U";

    const displayName = user?.name || (user?.firstName ? `${user.firstName} ${user.lastName}` : "User");
    const displayCompany = user?.company || "Abbelight";

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    return (
        <aside className="w-64 h-full bg-black/90 backdrop-blur-xl border-r border-white/10 flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center gap-3">
                <div className="relative w-24 h-8 transition-transform hover:scale-105">
                    <Image
                        src="/abbelight-logo.png"
                        alt="Abbelight"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest border-l border-white/10 pl-3">
                    Academy
                </span>
            </div>

            <nav className="flex-1 px-4 py-8 space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 
                ${isActive
                                    ? "bg-primary/20 text-primary border border-primary/20"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            {item.icon}
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/5 bg-black/40 relative">
                {/* Popover Menu */}
                {showProfileMenu && (
                    <>
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowProfileMenu(false)}
                        />
                        <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-20 animate-fade-in-up">
                            <Link
                                href="/dashboard/settings"
                                className="block w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                                onClick={() => setShowProfileMenu(false)}
                            >
                                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                Change Password
                            </Link>
                            <div className="h-px bg-white/5" />
                            <button
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                Log Out
                            </button>
                        </div>
                    </>
                )}

                <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className={`w-full flex items-center gap-3 hover:bg-white/5 p-2 rounded-lg transition-colors -m-2 text-left group ${showProfileMenu ? 'bg-white/5' : ''}`}
                >
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold border border-white/10 group-hover:border-primary/50 transition-colors">
                        {initials}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-bold text-white truncate" title={displayName}>{displayName}</span>
                        <span className="text-xs text-gray-500 truncate group-hover:text-gray-400 transition-colors" title={displayCompany}>{displayCompany}</span>
                    </div>
                    <div className="ml-auto text-gray-500 group-hover:text-white transition-colors">
                        <svg className={`w-4 h-4 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    </div>
                </button>
            </div>
        </aside>
    );
}
