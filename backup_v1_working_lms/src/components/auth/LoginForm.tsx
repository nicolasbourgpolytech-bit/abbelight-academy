"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { UserRole } from "@/types/user";

export function LoginForm() {
    const [loading, setLoading] = useState(false);
    const [selectedPersona, setSelectedPersona] = useState<string>("general");
    const router = useRouter();
    const { login } = useUser();

    const personas = [
        { id: "general", label: "General User", roles: ["general"] },
        { id: "reagent", label: "Reagent Customer", roles: ["general", "reagent"] },
        { id: "safe", label: "SAFe Instrument User", roles: ["general", "safe"] },
        { id: "full", label: "Full Access (Reagent + SAFe)", roles: ["general", "reagent", "safe"] },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const persona = personas.find(p => p.id === selectedPersona);
        const roles = (persona?.roles || ["general"]) as UserRole[];

        setTimeout(() => {
            login("John Doe", roles);
            setLoading(false);
            router.push("/dashboard");
        }, 1000);
    };

    return (
        <div className="w-full max-w-md">
            <form onSubmit={handleSubmit} className="glass-card shadow-2xl relative overflow-hidden group">

                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent" />

                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Welcome Back</h2>
                    <p className="text-sm text-gray-400">Select a persona to simulate login role</p>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                            Simulate Role
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            {personas.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setSelectedPersona(p.id)}
                                    className={`w-full text-left px-4 py-3 rounded border transition-all ${selectedPersona === p.id
                                            ? "bg-primary/20 border-primary text-white"
                                            : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                        }`}
                                >
                                    <span className="font-bold block text-sm">{p.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            placeholder="demo@abbelight.com"
                            disabled
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
                            value="demo@abbelight.com"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-primary text-black font-bold text-lg uppercase tracking-wider hover:bg-white transition-all duration-300 shadow-[0_4px_20px_-5px_rgba(0,202,248,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Simulating Login..." : "Sign In & Explore"}
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
