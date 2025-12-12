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
        // HSL mapping for "Pleasant/Professional" Aesthetics
        // Hue mapping: ~Violet(270) -> Blue(240) -> Cyan(180) -> Green(120) -> Yellow(60) -> Red(0)
        let hue;
        if (wavelength < 380) hue = 270;
        else if (wavelength < 440) {
            // 380-440: Violet to Blue (270 -> 240)
            hue = 270 - (30 * (wavelength - 380) / (440 - 380));
        } else if (wavelength < 490) {
            // 440-490: Blue to Cyan (240 -> 180)
            hue = 240 - (60 * (wavelength - 440) / (490 - 440));
        } else if (wavelength < 510) {
            // 490-510: Cyan to Green (180 -> 140)
            hue = 180 - (40 * (wavelength - 490) / (510 - 490));
        } else if (wavelength < 580) {
            // 510-580: Green to Yellow (140 -> 60)
            hue = 140 - (80 * (wavelength - 510) / (580 - 510));
        } else if (wavelength < 645) {
            // 580-645: Yellow to Red (60 -> 0)
            hue = 60 - (60 * (wavelength - 580) / (645 - 580));
        } else {
            // 645+: Red (0)
            hue = 0;
        }

        // Use HSL for consistent "pleasing" saturation/lightness
        // Saturation: 85% (Vibrant but not neon)
        // Lightness: 60% (Clear visibility against dark backgrounds)
        return `hsl(${hue.toFixed(1)}, 85%, 60%)`;
    };

    // Helper to convert HSL string to Hex for input[type=color] if needed, 
    // but input[type=color] expects Hex.
    // We need a proper HSL -> Hex converter.
    const hslToHex = (h: number, s: number, l: number) => {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = (n: number) => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    };

    const wavelengthToHex = (wavelength: number): string => {
        let hue;
        if (wavelength < 380) hue = 270;
        else if (wavelength < 440) hue = 270 - (30 * (wavelength - 380) / (440 - 380));
        else if (wavelength < 490) hue = 240 - (60 * (wavelength - 440) / (490 - 440));
        else if (wavelength < 510) hue = 180 - (40 * (wavelength - 490) / (510 - 490));
        else if (wavelength < 580) hue = 140 - (80 * (wavelength - 510) / (580 - 510));
        else if (wavelength < 645) hue = 60 - (60 * (wavelength - 580) / (645 - 580));
        else hue = 0;

        // Saturation 85%, Lightness 60%
        return hslToHex(hue, 85, 60);
    };

    const handleEmissionChange = (val: string) => {
        setEmPeak(val);
        const wl = parseInt(val);
        if (!isNaN(wl) && wl > 300 && wl < 900) {
            const newColor = wavelengthToHex(wl);
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
