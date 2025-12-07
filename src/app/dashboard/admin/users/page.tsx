"use client";

import { useEffect, useState } from "react";
import { UserProfile } from "@/types/user";

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const url = filterStatus === 'all'
                ? '/api/admin/users'
                : `/api/admin/users?status=${filterStatus}`;

            const res = await fetch(url);
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [filterStatus]);

    const handleApprove = async (userId: number) => {
        if (!confirm("Approve this user and send password?")) return;

        try {
            const res = await fetch('/api/admin/users/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            const data = await res.json();

            if (res.ok) {
                alert(`User Approved! Temp Password: ${data.tempPassword} (Email Mocked)`);
                fetchUsers(); // Refresh list
            } else {
                alert("Error: " + data.error);
            }
        } catch (error) {
            alert("Request failed");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-500/20 text-green-400 border-green-500/20';
            case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20';
            case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/20';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/20';
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">User Management</h1>
                    <p className="text-gray-400 mt-2">Manage accounts and permissions</p>
                </div>

                <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                    {['all', 'pending', 'active', 'rejected'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filterStatus === status
                                    ? 'bg-primary text-black shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : users.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-gray-400 text-lg">No users found</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {users.map((user: any) => (
                        <div key={user.id} className="bg-white/5 border border-white/10 p-6 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-white/[0.07] transition-colors group">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{user.first_name} {user.last_name}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase border ${getStatusColor(user.status)}`}>
                                        {user.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                    <span className="flex items-center gap-2">
                                        📧 {user.email}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        🏢 {user.company}
                                    </span>
                                </div>
                                <div className="pt-2">
                                    <span className="px-2 py-1 rounded bg-white/5 text-gray-300 text-xs border border-white/10">
                                        {Array.isArray(user.roles) ? user.roles.join(', ') : user.roles || "general"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {user.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => handleApprove(user.id)}
                                            className="px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 rounded-lg font-semibold transition-colors text-sm"
                                        >
                                            Approve
                                        </button>
                                        <button className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg font-semibold transition-colors text-sm">
                                            Reject
                                        </button>
                                    </>
                                )}
                                {user.status === 'active' && (
                                    <button className="px-4 py-2 bg-white/5 text-gray-400 border border-white/10 rounded-lg font-semibold text-sm cursor-not-allowed opacity-50">
                                        Active Account
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
