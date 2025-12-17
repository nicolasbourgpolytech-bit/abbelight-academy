"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

const navItems = [
    {
        name: "Dashboard (TBD)", href: "/dashboard", icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
        )
    },
    {
        name: "Academy", href: "/dashboard/academy", icon: (
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
        name: "Spectra Viewer", href: "/dashboard/spectra", icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        )
    },
    {
        name: "PSF Simulator (Beta)", href: "/dashboard/psf-simulation", icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
        )
    },
    {
        name: "Apps & Tools (TBD)", href: "/dashboard/apps", icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
        )
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useUser();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [isOnlineUsersOpen, setIsOnlineUsersOpen] = useState(true);
    const [isAdminOpen, setIsAdminOpen] = useState(true);

    // Online Users State
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [hoveredUser, setHoveredUser] = useState<{ id: number, rect: DOMRect, data: any } | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch online users periodically if admin
    useEffect(() => {
        if (!user || !user.roles.includes('abbelighter_admin')) return;

        const fetchOnlineUsers = async () => {
            try {
                const res = await fetch('/api/users/online');
                if (res.ok) {
                    const data = await res.json();
                    setOnlineUsers(data.users);
                }
            } catch (e) {
                console.error("Failed to fetch online users", e);
            }
        };

        fetchOnlineUsers();
        const interval = setInterval(fetchOnlineUsers, 30000); // 30s update

        return () => clearInterval(interval);
    }, [user]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleMouseEnterUser = (u: any, e: React.MouseEvent) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const rect = e.currentTarget.getBoundingClientRect();
        setHoveredUser({ id: u.id, rect, data: u });
    };

    const handleMouseLeaveUser = () => {
        timeoutRef.current = setTimeout(() => {
            setHoveredUser(null);
        }, 300); // 300ms delay to allow moving to tooltip
    };

    const handleMouseEnterTooltip = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    const handleMouseLeaveTooltip = () => {
        timeoutRef.current = setTimeout(() => {
            setHoveredUser(null);
        }, 300);
    };

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

            <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => {
                    const isActive = item.href === "/dashboard"
                        ? pathname === item.href
                        : pathname.startsWith(item.href);
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

                {/* Online Users Section */}
                {user?.roles.includes('abbelighter_admin') && (
                    <div className="mt-8 pt-6 border-t border-white/10">
                        <button
                            onClick={() => setIsOnlineUsersOpen(!isOnlineUsersOpen)}
                            className="w-full px-4 mb-3 flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-gray-300 transition-colors group"
                        >
                            <div className="flex items-center gap-2">
                                <span>Online Users</span>
                                <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                    {onlineUsers.length}
                                </span>
                            </div>
                            <svg
                                className={`w-4 h-4 transition-transform duration-200 ${isOnlineUsersOpen ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        <div className={`space-y-1 overflow-hidden transition-all duration-300 ${isOnlineUsersOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            {onlineUsers.length === 0 ? (
                                <p className="px-4 text-xs text-gray-600 italic">No one else online</p>
                            ) : (
                                onlineUsers.map((u) => {
                                    const fullName = (u.first_name && u.last_name)
                                        ? `${u.first_name} ${u.last_name}`
                                        : u.first_name || u.email.split('@')[0];

                                    return (
                                        <div
                                            key={u.id}
                                            className="group/user relative px-4 py-2 flex items-center gap-3 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all rounded-lg mx-2 cursor-pointer"
                                            onMouseEnter={(e) => handleMouseEnterUser(u, e)}
                                            onMouseLeave={handleMouseLeaveUser}
                                        >
                                            <div className="relative shrink-0">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className="truncate font-medium">{fullName}</span>
                                                    {u.level && (
                                                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 rounded ml-2 border border-primary/20 whitespace-nowrap">
                                                            Lvl {u.level}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
                {/* Admin Tools Section */}
                {user?.roles.includes('abbelighter_admin') && (
                    <div className="mt-8 pt-6 border-t border-white/10">
                        <button
                            onClick={() => setIsAdminOpen(!isAdminOpen)}
                            className="w-full px-4 mb-3 flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-gray-300 transition-colors group"
                        >
                            <span>Admin</span>
                            <svg
                                className={`w-4 h-4 transition-transform duration-200 ${isAdminOpen ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        <div className={`space-y-1 overflow-hidden transition-all duration-300 ${isAdminOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <Link
                                href="/dashboard/admin/learning-paths"
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 
                                ${pathname.startsWith("/dashboard/admin/learning-paths")
                                        ? "bg-primary/20 text-primary border border-primary/20"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 01-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                                Learning Paths
                            </Link>

                            <Link
                                href="/dashboard/admin/modules"
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 
                                ${pathname.startsWith("/dashboard/admin/modules")
                                        ? "bg-primary/20 text-primary border border-primary/20"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                Modules
                            </Link>

                            <Link
                                href="/dashboard/admin/webinars"
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 
                                ${pathname.startsWith("/dashboard/admin/webinars")
                                        ? "bg-primary/20 text-primary border border-primary/20"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                Webinars
                            </Link>

                            <Link
                                href="/dashboard/admin/articles"
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 
                                ${pathname.startsWith("/dashboard/admin/articles")
                                        ? "bg-primary/20 text-primary border border-primary/20"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                                Articles
                            </Link>

                            <Link
                                href="/dashboard/admin/users"
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 
                                ${pathname.startsWith("/dashboard/admin/users")
                                        ? "bg-primary/20 text-primary border border-primary/20"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                Users
                            </Link>

                            <Link
                                href="/dashboard/admin/products"
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 
                                ${pathname.startsWith("/dashboard/admin/products")
                                        ? "bg-primary/20 text-primary border border-primary/20"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                                Products
                            </Link>

                            <Link
                                href="/dashboard/admin/spectra"
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 
                                ${pathname.startsWith("/dashboard/admin/spectra")
                                        ? "bg-primary/20 text-primary border border-primary/20"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                                Spectra Manager
                            </Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* Fixed Tooltip Portal-like */}
            {hoveredUser && (
                <div
                    className="fixed z-50 bg-[#1A1A1A] border border-white/10 p-3 rounded-xl shadow-2xl animate-fade-in pointer-events-auto min-w-[220px]"
                    style={{
                        top: hoveredUser.rect.top - 20,
                        left: hoveredUser.rect.right + 10
                    }}
                    onMouseEnter={handleMouseEnterTooltip}
                    onMouseLeave={handleMouseLeaveTooltip}
                >
                    <div className="font-bold text-white text-sm mb-1">
                        {(hoveredUser.data.first_name && hoveredUser.data.last_name)
                            ? `${hoveredUser.data.first_name} ${hoveredUser.data.last_name}`
                            : hoveredUser.data.first_name || hoveredUser.data.email.split('@')[0]}
                    </div>
                    <div className="text-xs text-gray-400 mb-2">{hoveredUser.data.company || "No Company"}</div>

                    <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/5 group/email hover:border-primary/30 transition-colors">
                        <code className="text-xs text-primary flex-1 truncate font-mono select-all">
                            {hoveredUser.data.email}
                        </code>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(hoveredUser.data.email);
                            }}
                            className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
                            title="Copy Email"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

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
