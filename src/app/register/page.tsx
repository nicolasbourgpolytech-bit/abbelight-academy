import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden pattern-grid py-20">

            {/* Background Ambience */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] pointer-events-none opacity-40" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none opacity-40" />

            {/* Geometric Ring */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-white/5 rounded-full pointer-events-none border-dashed" />

            <div className="z-10 w-full flex justify-center px-4 animate-fade-in">
                <RegisterForm />
            </div>
        </main>
    );
}
