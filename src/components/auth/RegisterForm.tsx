"use client";

import Link from "next/link";
import { useState } from "react";

export function RegisterForm() {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        company: "",
        email: "",
    });
    const [selectedRoles, setSelectedRoles] = useState<string[]>(["general"]);

    const roleOptions = [
        { id: "general", label: "General (Nanoscopy User)" },
        { id: "reagent", label: "Abbelight Reagent Customer" },
        { id: "safe", label: "Abbelight SAFe Customer" },
        { id: "abbelighter", label: "Abbelighter (Non-Admin)" },
        { id: "abbelighter_admin", label: "Abbelighter Admin" },
    ];

    const toggleRole = (roleId: string) => {
        setSelectedRoles(prev =>
            prev.includes(roleId)
                ? prev.filter(r => r !== roleId)
                : [...prev, roleId]
        );
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    roles: selectedRoles
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Registration failed");
            }

            alert("Registration request sent! Please wait for admin approval. You will receive an email with your temporary password.");
            // Reset form or redirect
            setFormData({ firstName: "", lastName: "", company: "", email: "" });
            setSelectedRoles(["general"]);
        } catch (error) {
            alert((error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md">
            <form onSubmit={handleSubmit} className="glass-card shadow-2xl relative overflow-hidden group">

                {/* Decorative top border */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent via-primary to-secondary" />

                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Request Access</h2>
                    <p className="text-sm text-gray-400">Join the Abbelight Academy community</p>
                </div>

                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="firstName" className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                                First Name
                            </label>
                            <input
                                id="firstName"
                                type="text"
                                required
                                value={formData.firstName}
                                onChange={handleChange}
                                placeholder="John"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all duration-300"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="lastName" className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                                Last Name
                            </label>
                            <input
                                id="lastName"
                                type="text"
                                required
                                value={formData.lastName}
                                onChange={handleChange}
                                placeholder="Doe"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all duration-300"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="company" className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                            Institute / Company
                        </label>
                        <input
                            id="company"
                            type="text"
                            required
                            value={formData.company}
                            onChange={handleChange}
                            placeholder="Institute of Optics..."
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all duration-300"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="name@abbelight.com"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all duration-300"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                            Access Type (Select all that apply)
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            {roleOptions.map((role) => (
                                <label key={role.id} className="flex items-center space-x-3 p-3 border border-white/10 rounded bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={selectedRoles.includes(role.id)}
                                        onChange={() => toggleRole(role.id)}
                                        className="w-5 h-5 accent-accent"
                                    />
                                    <span className="text-white text-sm">{role.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-white text-black font-bold text-lg uppercase tracking-wider hover:bg-accent hover:text-white transition-all duration-300 shadow-[0_4px_20px_-5px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {loading ? "Sending Request..." : "Request Access"}
                    </button>
                </div>

                <div className="mt-8 text-center text-sm text-gray-500">
                    Already have an account?{" "}
                    <Link href="/login" className="text-white hover:text-primary font-semibold transition-colors">
                        Sign In
                    </Link>
                </div>
            </form>
        </div>
    );
}
