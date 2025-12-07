"use client";

import { useEffect, useState } from "react";
import { UserProfile } from "@/types/user";

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users?status=pending');
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
    }, []);

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

    if (loading) return <div className="p-8 text-white">Loading users...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">User Management</h1>
                    <p className="text-gray-400 mt-2">Validate new account requests</p>
                </div>
            </div>

            {users.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-gray-400 text-lg">No pending requests</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {users.map((user: any) => (
                        <div key={user.id} className="bg-white/5 border border-white/10 p-6 rounded-xl flex items-center justify-between hover:bg-white/[0.07] transition-colors">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold text-white">{user.first_name} {user.last_name}</h3>
                                    <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-bold uppercase border border-accent/20">
                                        {user.roles}
                                    </span>
                                </div>
                                <p className="text-gray-400">{user.email}</p>
                                <p className="text-sm text-gray-500">{user.company}</p>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleApprove(user.id)}
                                    className="px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 rounded-lg font-semibold transition-colors"
                                >
                                    Approve & Send Email
                                </button>
                                <button className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg font-semibold transition-colors">
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
