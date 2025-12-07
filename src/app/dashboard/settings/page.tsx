"use client";

import { useState } from "react";
import { useUser } from "@/context/UserContext";

export default function SettingsPage() {
    const { user } = useUser();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState("");

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");

        if (newPassword !== confirmPassword) {
            setStatus('error');
            setMessage("New passwords do not match.");
            return;
        }

        if (newPassword.length < 6) {
            setStatus('error');
            setMessage("Password must be at least 6 characters.");
            return;
        }

        setStatus('loading');

        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user?.email,
                    currentPassword,
                    newPassword
                })
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('success');
                setMessage("Password changed successfully.");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                setStatus('error');
                setMessage(data.error || "Failed to change password.");
            }
        } catch (err) {
            setStatus('error');
            setMessage("An error occurred. Please try again.");
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
                <p className="text-gray-400">Manage your account preferences and security.</p>
            </div>

            {/* Profile Section (Read-only for now) */}
            <section className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Profile</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Full Name</label>
                        <div className="p-3 bg-white/5 rounded border border-white/10 text-gray-300">
                            {user?.name || `${user?.firstName} ${user?.lastName}`}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Email</label>
                        <div className="p-3 bg-white/5 rounded border border-white/10 text-gray-300">
                            {user?.email}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Company</label>
                        <div className="p-3 bg-white/5 rounded border border-white/10 text-gray-300">
                            {user?.company}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Role</label>
                        <div className="p-3 bg-white/5 rounded border border-white/10 text-gray-300 capitalize">
                            {Array.isArray(user?.roles) ? user.roles.join(', ') : user?.roles}
                        </div>
                    </div>
                </div>
            </section>

            {/* Security Section */}
            <section className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Security</h2>

                <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Current Password</label>
                        <input
                            type="password"
                            required
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded p-2 text-white placeholder-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Enter current password"
                        />
                    </div>

                    <div className="pt-2">
                        <label className="block text-sm text-gray-400 mb-1">New Password</label>
                        <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded p-2 text-white placeholder-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Min. 6 characters"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Confirm New Password</label>
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded p-2 text-white placeholder-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Re-enter new password"
                        />
                    </div>

                    {message && (
                        <div className={`p-3 rounded text-sm ${status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                            {message}
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="px-6 py-2 bg-primary text-black font-bold rounded hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === 'loading' ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
