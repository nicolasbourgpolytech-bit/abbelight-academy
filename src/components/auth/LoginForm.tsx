"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

export function LoginForm() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { login } = useUser();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await login(email, password);
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md">
            <form onSubmit={handleSubmit} className="glass-card shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent" />

                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Welcome Back</h2>
                    <p className="text-sm text-gray-400">Sign in to access Abbelight Academy</p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-red-500/20 border border-red-500/30 rounded text-red-200 text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            required
                            placeholder="name@company.com"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            required
                            placeholder="Your password (or temporary code)"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-primary text-black font-bold text-lg uppercase tracking-wider hover:bg-white transition-all duration-300 shadow-[0_4px_20px_-5px_rgba(0,202,248,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Signing In..." : "Sign In"}
                    </button>
                </div>

                <div className="mt-8 text-center text-sm text-gray-500">
                    Not a member yet?{" "}
                    <Link href="/register" className="text-white hover:text-secondary font-semibold transition-colors">
                        Request Access
                    </Link>
                </div>
            </form>
        </div>
    );
}
