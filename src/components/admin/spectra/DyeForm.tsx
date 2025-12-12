import { useState } from "react";
import { Dye } from "@/app/dashboard/admin/spectra/page";
// @ts-ignore
import Papa from "papaparse";

interface DyeFormProps {
    initialData?: Dye | null;
    onSubmit: () => void;
    onCancel: () => void;
}

export function DyeForm({ initialData, onSubmit, onCancel }: DyeFormProps) {
    const [name, setName] = useState(initialData?.name || "");
    const [category, setCategory] = useState(initialData?.category || "Green");
    const [color, setColor] = useState(initialData?.color || "#00D296");
    const [exPeak, setExPeak] = useState<number | string>(initialData?.excitation_peak || "");
    const [emPeak, setEmPeak] = useState<number | string>(initialData?.emission_peak || "");

    const [mode, setMode] = useState<'csv' | 'manual'>('csv');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    // Parsed data
    const [excitationData, setExcitationData] = useState<any[]>(initialData?.excitation_data || []);
    const [emissionData, setEmissionData] = useState<any[]>(initialData?.emission_data || []);

    const wavelengthToColor = (wavelength: number): string => {
        let r, g, b, alpha;
        if (wavelength >= 380 && wavelength < 440) {
            r = -(wavelength - 440) / (440 - 380); g = 0.0; b = 1.0;
        } else if (wavelength >= 440 && wavelength < 490) {
            r = 0.0; g = (wavelength - 440) / (490 - 440); b = 1.0;
        } else if (wavelength >= 490 && wavelength < 510) {
            r = 0.0; g = 1.0; b = -(wavelength - 510) / (510 - 490);
        } else if (wavelength >= 510 && wavelength < 580) {
            r = (wavelength - 510) / (580 - 510); g = 1.0; b = 0.0;
        } else if (wavelength >= 580 && wavelength < 645) {
            r = 1.0; g = -(wavelength - 645) / (645 - 580); b = 0.0;
        } else if (wavelength >= 645 && wavelength <= 780) {
            r = 1.0; g = 0.0; b = 0.0;
        } else {
            return "#888888"; // Fallback/Invisible
        }

        // Intensity correction (simple)
        let factor;
        if (wavelength >= 380 && wavelength < 420) factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
        else if (wavelength >= 420 && wavelength < 645) factor = 1.0;
        else if (wavelength >= 645 && wavelength <= 780) factor = 0.3 + 0.7 * (780 - wavelength) / (780 - 645);
        else factor = 0.0;

        const toHex = (c: number) => {
            const hex = Math.round(c * factor * 255).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    const handleEmissionChange = (val: string) => {
        setEmPeak(val);
        const wl = parseInt(val);
        if (!isNaN(wl) && wl > 300 && wl < 900) {
            const newColor = wavelengthToColor(wl);
            setColor(newColor);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setCsvFile(e.target.files[0]);
            parseCSV(e.target.files[0]);
        }
    };

    const parseCSV = (file: File) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
                // Expected columns: Wavelength, Excitation, Emission
                const data = results.data;
                const ex: any[] = [];
                const em: any[] = [];
                let maxEx = 0;
                let maxEm = 0;

                data.forEach((row: any) => {
                    const nm = parseFloat(row.Wavelength || row.wavelength);
                    const exVal = parseFloat(row.Excitation || row.excitation || 0);
                    const emVal = parseFloat(row.Emission || row.emission || 0);

                    if (!isNaN(nm)) {
                        ex.push({ wavelength: nm, value: exVal });
                        em.push({ wavelength: nm, value: emVal });
                        if (exVal > maxEx) maxEx = exVal;
                        if (emVal > maxEm) maxEm = emVal;
                    }
                });

                // Normalize to 0-1
                const normalizedEx = ex.map(p => ({ ...p, value: maxEx ? p.value / maxEx : 0 }));
                const normalizedEm = em.map(p => ({ ...p, value: maxEm ? p.value / maxEm : 0 }));

                setExcitationData(normalizedEx);
                setEmissionData(normalizedEm);
            },
            error: (err: any) => {
                setError("Failed to parse CSV: " + err.message);
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");

        try {
            const payload = {
                name,
                category,
                color,
                excitation_peak: exPeak ? Number(exPeak) : null,
                emission_peak: emPeak ? Number(emPeak) : null,
                excitation_data: excitationData,
                emission_data: emissionData
            };

            const url = initialData ? `/api/spectra/${initialData.id}` : '/api/spectra';
            const method = initialData ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to save");

            onSubmit();
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg text-sm">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary text-white"
                        placeholder="e.g. Alexa Fluor 488"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value as any)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary text-white"
                    >
                        <option value="UV">UV</option>
                        <option value="Green">Green</option>
                        <option value="Red">Red</option>
                        <option value="Far-red">Far-red</option>
                    </select>
                </div>

                {/* Wavelength Peaks */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Ex Peak (nm)</label>
                        <input
                            type="number"
                            value={exPeak}
                            onChange={e => setExPeak(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary text-white"
                            placeholder="e.g. 490"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Em Peak (nm)</label>
                        <input
                            type="number"
                            value={emPeak}
                            onChange={e => handleEmissionChange(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary text-white"
                            placeholder="e.g. 525"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Color (Auto-calculated)</label>
                    <div className="flex gap-2">
                        <input
                            type="color"
                            value={color}
                            onChange={e => setColor(e.target.value)}
                            className="h-10 w-20 rounded bg-transparent border border-white/10"
                        />
                        <input
                            type="text"
                            value={color}
                            onChange={e => setColor(e.target.value)}
                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                            placeholder="#000000"
                        />
                    </div>
                </div>
            </div>

            <div className="border border-white/10 rounded-xl p-4">
                <div className="flex gap-4 border-b border-white/10 pb-4 mb-4">
                    <button
                        type="button"
                        onClick={() => setMode('csv')}
                        className={`text-sm font-medium pb-1 ${mode === 'csv' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
                    >
                        CSV Upload
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('manual')}
                        className={`text-sm font-medium pb-1 ${mode === 'manual' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
                    >
                        Manual Entry (TBD)
                    </button>
                </div>

                {mode === 'csv' ? (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-400">Upload a CSV file with columns: <code>Wavelength</code>, <code>Excitation</code>, <code>Emission</code>.</p>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30"
                        />
                        {excitationData.length > 0 && (
                            <div className="text-green-400 text-sm">
                                Successfully loaded {excitationData.length} data points.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-4 text-center text-gray-500 italic">
                        Manual data entry not implemented yet. Please use CSV.
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 rounded-lg text-gray-400 hover:text-white"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-primary hover:bg-primary/80 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                    {isSubmitting ? 'Saving...' : 'Save Dye'}
                </button>
            </div>
        </form>
    );
}
