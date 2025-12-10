"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";

import { getRank } from "@/types/gamification";

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
    general: { label: 'General', color: 'text-gray-400 border-gray-500/30' },
    reagent: { label: 'Reagent', color: 'text-cyan-400 border-cyan-500/30' },
    safe: { label: 'SAFe', color: 'text-purple-400 border-purple-500/30' },
    abbelighter: { label: 'Abbelighter', color: 'text-orange-400 border-orange-500/30' },
    abbelighter_admin: { label: 'Admin', color: 'text-red-400 border-red-500/30' },
};

export default function UsersAdminPage() {
    const { user } = useUser();
    const [users, setUsers] = useState<any[]>([]);
    const [userFilterStatus, setUserFilterStatus] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('newest');
    const [isLoading, setIsLoading] = useState(true);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const url = userFilterStatus === 'all'
                ? '/api/users'
                : `/api/users?status=${userFilterStatus}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.users) setUsers(data.users);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user?.roles.includes('abbelighter_admin')) {
            fetchUsers();
        }
    }, [user, userFilterStatus]);

    const handleApproveUser = async (id: number) => {
        try {
            const res = await fetch('/api/admin/users/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: id })
            });

            const data = await res.json();

            if (res.ok) {
                if (data.tempPassword) {
                    alert(`User Approved!\n\nTemporary Password: ${data.tempPassword}\n\nPlease share this with the user.`);
                } else {
                    alert("User approved, but no password was returned.");
                }
                fetchUsers();
            } else {
                alert(data.error || "Failed to approve user");
            }
        } catch (e) {
            console.error(e);
            alert("Error approving user");
        }
    };

    const handleRejectUser = async (id: number) => {
        if (!confirm("Reject this user?")) return;
        try {
            const res = await fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: 'rejected' })
            });
            if (res.ok) fetchUsers();
            else alert("Failed to reject user");
        } catch (e) { alert("Error rejecting user"); }
    };

    const handleDeleteUser = async (id: number) => {
        if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
        try {
            const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchUsers();
            else alert("Failed to delete user");
        } catch (e) { alert("Error deleting user"); }
    };

    if (!user || !user.roles.includes('abbelighter_admin')) {
        return (
            <div className="text-center p-20 text-red-500">
                Unauthorized. Admin access only.
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto pb-20">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
                <p className="text-gray-400">Approve new sign-ups and manage existing users.</p>
            </div>

            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        {['all', 'pending', 'approved', 'rejected'].map(status => (
                            <button
                                key={status}
                                onClick={() => setUserFilterStatus(status)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${userFilterStatus === status
                                    ? 'bg-primary text-black'
                                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchUsers}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                        title="Refresh List"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                </div>

                {/* Sorting */}
                <div className="flex justify-end mb-4">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-gray-900 border border-white/10 rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary"
                    >
                        <option value="newest">Newest First</option>
                        <option value="role">User Type</option>
                        <option value="level">Level (High to Low)</option>
                        <option value="last_seen">Last Seen</option>
                        <option value="time_spent">Time Spent (High to Low)</option>
                    </select>
                </div>

                <div className="space-y-4">
                    {isLoading ? (
                        <p className="text-center text-gray-500 py-10">Loading users...</p>
                    ) : (
                        <>
                            {[...users].sort((a, b) => {
                                if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                                if (sortBy === 'role') {
                                    const roleA = a.roles?.[0] || '';
                                    const roleB = b.roles?.[0] || '';
                                    return roleA.localeCompare(roleB);
                                }
                                if (sortBy === 'level') return (b.level || 0) - (a.level || 0);
                                if (sortBy === 'last_seen') return new Date(b.last_seen || 0).getTime() - new Date(a.last_seen || 0).getTime();
                                if (sortBy === 'time_spent') return (b.total_time_spent || 0) - (a.total_time_spent || 0);
                                return 0;
                            }).map((u: any) => (
                                <div key={u.id} className="bg-gray-900/40 border border-white/10 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${u.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                                            u.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                                                'bg-red-500/20 text-red-500'
                                            }`}>
                                            {u.first_name?.[0]}{u.last_name?.[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-lg">{u.first_name} {u.last_name}</h3>
                                            <div className="text-sm text-gray-400 flex flex-col">
                                                <span>{u.email}</span>
                                                <span className="text-xs text-gray-500">{u.company}</span>
                                                <div className="flex gap-2 mt-2 text-xs">
                                                    <div className="flex items-center gap-3 mt-2">
                                                        {/* Role Badge */}
                                                        <div className={`px-2 py-0.5 rounded border text-xs font-bold uppercase tracking-wider ${ROLE_CONFIG[u.roles?.[0] || 'general']?.color || 'text-gray-400 border-gray-500/30'}`}>
                                                            {ROLE_CONFIG[u.roles?.[0] || 'general']?.label || 'General'}
                                                        </div>

                                                        {/* Role Selector */}
                                                        <select
                                                            value={u.roles?.[0] || 'general'}
                                                            onChange={async (e) => {
                                                                const newRole = e.target.value;
                                                                const roleLabel = ROLE_CONFIG[newRole]?.label || newRole;
                                                                if (!confirm(`Change role for ${u.first_name} to ${roleLabel}?`)) return;
                                                                try {
                                                                    const res = await fetch('/api/admin/users', {
                                                                        method: 'PUT',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ userId: u.id, roles: [newRole] })
                                                                    });
                                                                    if (res.ok) {
                                                                        await fetchUsers(); // Await refresh
                                                                    } else {
                                                                        alert("Failed to update role");
                                                                    }
                                                                } catch (err) {
                                                                    console.error(err);
                                                                    alert("Error updating role");
                                                                }
                                                            }}
                                                            className="bg-black/40 border border-white/10 rounded px-2 py-0.5 text-xs text-gray-300 focus:outline-none focus:border-primary cursor-pointer w-[200px]"
                                                        >
                                                            <option value="general">General (Nanoscopy User)</option>
                                                            <option value="reagent">Abbelight Reagent Customer</option>
                                                            <option value="safe">Abbelight SAFe Customer</option>
                                                            <option value="abbelighter">Abbelighter (Non-Admin)</option>
                                                            <option value="abbelighter_admin">Abbelighter Admin</option>
                                                        </select>

                                                        <span className={`px-2 py-0.5 rounded border border-white/10 text-xs ${getRank(u.xp).color.replace('text-', 'bg-')}/10 ${getRank(u.xp).color}`}>
                                                            Lvl {u.level} • {u.xp} XP • {getRank(u.xp).name}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-4 mt-1 text-xs text-gray-500">
                                                    <span>Last seen: {u.last_seen ? new Date(u.last_seen).toLocaleString() : 'Never'}</span>
                                                    <span>Time: {(() => {
                                                        const s = u.total_time_spent || 0;
                                                        const h = Math.floor(s / 3600);
                                                        const m = Math.floor((s % 3600) / 60);
                                                        return h > 0 ? `${h}h ${m}m` : `${m}m`;
                                                    })()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                                        <button
                                            onClick={async () => {
                                                if (!confirm(`Warning: This will reset XP to 0 AND delete all progress for ${u.first_name} ${u.last_name}.\n\nThe user will need to replay all modules to earn XP again.\n\nAre you sure?`)) return;
                                                try {
                                                    await fetch('/api/users/reset-xp', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ userId: u.id })
                                                    });
                                                    fetchUsers(); // Refresh
                                                    alert("Reset complete. The user must refresh their page if logged in.");
                                                } catch (e) { alert("Failed to reset XP"); }
                                            }}
                                            className="p-2 text-yellow-500 hover:text-yellow-400"
                                            title="Reset XP"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        </button>

                                        <button
                                            onClick={async () => {
                                                try {
                                                    await fetch('/api/users/give-xp', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ userId: u.id, amount: 100 })
                                                    });
                                                    fetchUsers();
                                                    // If admin is updating themselves, refresh the global context to show new XP immediately
                                                    if (user && user.id === u.id) {
                                                        // We utilize the exposed refreshUser from context (we need to make sure we destructure it first)
                                                        window.location.reload(); // Fallback if refreshUser isn't available or reliable yet, but actually let's try to do it cleaner.
                                                    }
                                                    alert("Added 100 XP!");
                                                } catch (e) { alert("Failed to add XP"); }
                                            }}
                                            className="p-2 text-blue-500 hover:text-blue-400"
                                            title="Give 100 XP (Test)"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                        </button>

                                        {u.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => handleApproveUser(u.id)}
                                                    className="px-4 py-2 bg-green-500/20 text-green-500 border border-green-500/50 rounded-lg text-sm font-bold hover:bg-green-500 hover:text-black transition-colors"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleRejectUser(u.id)}
                                                    className="px-4 py-2 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 rounded-lg text-sm font-bold hover:bg-yellow-500 hover:text-black transition-colors"
                                                >
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => handleDeleteUser(u.id)}
                                            className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                                            title="Delete User"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {users.length === 0 && (
                                <div className="text-center py-10 text-gray-500">
                                    No users found matching filter.
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
