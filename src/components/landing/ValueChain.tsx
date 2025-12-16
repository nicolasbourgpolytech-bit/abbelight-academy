import Link from "next/link";
import { FlaskConical, Microscope, MonitorPlay, ArrowRight } from "lucide-react";

export function ValueChain() {
    const steps = [
        {
            id: "sample-preparation",
            icon: FlaskConical,
            title: "Sample Preparation",
            subtitle: "SMART Products",
            items: [
                "Ready-to-use kits",
                "Reagents",
                "Automation devices"
            ],
            color: "text-primary",
            borderColor: "border-primary",
            bgGradient: "from-primary/10 to-transparent"
        },
        {
            id: "imaging",
            icon: Microscope,
            title: "Imaging",
            subtitle: "SAFe Platforms",
            items: [
                "Upgradable",
                "Customizable",
                "Multimodal platforms"
            ],
            color: "text-secondary",
            borderColor: "border-secondary",
            bgGradient: "from-secondary/10 to-transparent"
        },
        {
            id: "analysis",
            icon: MonitorPlay,
            title: "Analysis",
            subtitle: "NEO Software Suite",
            items: [
                "For quantitative analysis",
                "For visualization at the nanoscale"
            ],
            color: "text-accent",
            borderColor: "border-accent",
            bgGradient: "from-accent/10 to-transparent"
        }
    ];

    return (
        <section className="relative z-10 py-24 bg-zinc-950 border-t border-white/10">
            <div className="max-w-7xl mx-auto px-6">
                {/* Section Header */}
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
                        <span className="text-primary">A COMPLETE</span> & <span className="text-primary">INNOVATIVE</span> PORTFOLIO
                    </h2>
                    <p className="text-xl text-gray-400">
                        The ultimate multimodal bioimaging platforms
                    </p>
                </div>

                {/* Steps Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                    {/* Connecting Line (Desktop only) */}
                    <div className="hidden md:block absolute top-[60px] left-[16%] right-[16%] h-[2px] bg-gradient-to-r from-primary via-secondary to-accent opacity-30" />

                    {steps.map((step, index) => (
                        <div key={step.id} className="relative group">
                            {/* Card Content */}
                            <div className="relative z-10 bg-black/40 backdrop-blur-sm border border-white/10 p-8 h-full rounded-xl hover:border-white/30 transition-all duration-300 overflow-hidden">
                                {/* Background Glow */}
                                <div className={`absolute inset-0 bg-gradient-to-b ${step.bgGradient} opacity-5 group-hover:opacity-10 transition-opacity`} />

                                {/* Icon */}
                                <div className="relative flex justify-center mb-8">
                                    <div className={`p-4 rounded-full border border-white/10 bg-zinc-900 group-hover:scale-110 transition-transform duration-300 ${step.borderColor}`}>
                                        <step.icon className={`w-10 h-10 ${step.color}`} />
                                    </div>
                                </div>

                                {/* Boxed Title */}
                                <div className="flex justify-center mb-8">
                                    <div className={`px-6 py-3 border ${step.borderColor} bg-black/50 text-white font-bold tracking-wide uppercase text-sm`}>
                                        {step.title}
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="space-y-4 text-center">
                                    <h3 className="text-lg font-bold text-white">
                                        {step.subtitle}
                                    </h3>
                                    <ul className="space-y-2">
                                        {step.items.map((item, i) => (
                                            <li key={i} className="text-gray-400 text-sm flex items-center justify-center gap-2">
                                                <span className={`w-1.5 h-1.5 rounded-full ${step.color.replace('text-', 'bg-')}`} />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Call to Action */}
                <div className="flex justify-center mt-16">
                    <Link href="/register">
                        <button className="group relative inline-flex items-center gap-3 px-8 py-4 bg-transparent text-white border border-secondary/50 hover:border-secondary hover:bg-secondary/10 transition-all duration-300 rounded-none overflow-hidden">
                            <span className="font-bold tracking-wide uppercase">Join the Academy</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />

                            {/* Button glow effect */}
                            <div className="absolute inset-0 bg-secondary/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
                        </button>
                    </Link>
                </div>
            </div>
        </section>
    );
}
