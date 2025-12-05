import { Sidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-primary/30">
            <Sidebar />
            <div className="pl-64 h-screen flex flex-col relative overflow-y-auto">
                {/* Top ambient glow */}
                <div className="absolute top-0 left-0 w-full h-[500px] bg-primary/5 blur-[100px] pointer-events-none sticky" />

                <main className="flex-1 p-8 z-10 animate-fade-in">
                    {children}
                </main>
            </div>
        </div>
    );
}
