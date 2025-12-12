import { Dye } from "@/app/dashboard/admin/spectra/page";

interface DyeListProps {
    dyes: Dye[];
    onEdit: (dye: Dye) => void;
    onDelete: (id: string) => void;
}

export function DyeList({ dyes, onEdit, onDelete }: DyeListProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dyes.map(dye => (
                <div key={dye.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between group hover:border-white/20 transition-all">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-8 h-8 rounded-full shadow-lg"
                            style={{ backgroundColor: dye.color, boxShadow: `0 0 10px ${dye.color}40` }}
                        />
                        <div>
                            <h4 className="font-medium text-white">{dye.name}</h4>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{dye.category}</p>
                            {(dye.excitation_peak || dye.emission_peak) && (
                                <div className="flex gap-2 text-[10px] text-gray-400">
                                    {dye.excitation_peak && <span>Ex: {dye.excitation_peak}nm</span>}
                                    {dye.emission_peak && <span>Em: {dye.emission_peak}nm</span>}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => onEdit(dye)}
                            className="p-2 hover:bg-white/10 rounded-lg text-blue-400 hover:text-blue-300 transition-colors"
                            title="Edit"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => onDelete(dye.id)}
                            className="p-2 hover:bg-white/10 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                            title="Delete"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
