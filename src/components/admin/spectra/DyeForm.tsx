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
    const [type, setType] = useState<'Organic Dye' | 'Fluorescent Protein'>(initialData?.type || "Organic Dye");
    const [category, setCategory] = useState(initialData?.category || "Green");
    const [color, setColor] = useState(initialData?.color || "#00D296");
    const [exPeak, setExPeak] = useState<number | string>(initialData?.excitation_peak || "");
    const [emPeak, setEmPeak] = useState<number | string>(initialData?.emission_peak || "");
    const [isDefault, setIsDefault] = useState(initialData && 'is_default' in initialData ? (initialData as any).is_default : false);

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
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result;
            if (typeof text !== 'string') return;

            // Manual lines split
            const lines = text.split(/\r\n|\n/).map(l => l.trim()).filter(l => l);
            if (lines.length === 0) {
                setError("File is empty.");
                return;
            }

            // 1. Find Header & Delimiter
            let headerIdx = -1;
            let delimiter = ','; // Default
            let colMap = { nm: -1, ex: -1, em: -1 };

            for (let i = 0; i < Math.min(lines.length, 20); i++) {
                const lineLower = lines[i].toLowerCase();
                // Check if this line looks like a header
                if (lineLower.includes("wavelength") || lineLower.includes("nm")) {
                    headerIdx = i;

                    // Detect delimiter by counting
                    const commaCount = (lines[i].match(/,/g) || []).length;
                    const semiCount = (lines[i].match(/;/g) || []).length;
                    const tabCount = (lines[i].match(/\t/g) || []).length;

                    // Simple heuristic: majority wins, biased to comma
                    if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
                    else if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

                    // Map columns based on split
                    // We remove quotes from headers just in case "Wavelength"
                    const cells = lines[i].split(delimiter).map(c => c.toLowerCase().trim().replace(/['"]/g, ''));

                    colMap.nm = cells.findIndex(c => c === "wavelength" || c === "nm" || c.includes("wavelength"));
                    colMap.ex = cells.findIndex(c => c.includes("excitation") || c.includes("ex"));
                    colMap.em = cells.findIndex(c => c.includes("emission") || c.includes("em"));

                    console.log(`Detected Delimiter: '${delimiter === '\t' ? 'TAB' : delimiter}'`);
                    console.log(`Column Mapping:`, colMap);

                    break;
                }
            }

            if (headerIdx === -1 || colMap.nm === -1) {
                setError("Could not find 'Wavelength' column header. Please ensure columns are named Wavelength, Excitation, Emission.");
                return;
            }

            // 2. Parse Data
            const tempEx: { wavelength: number, value: number }[] = [];
            const tempEm: { wavelength: number, value: number }[] = [];

            for (let i = headerIdx + 1; i < lines.length; i++) {
                // Manual split
                const cells = lines[i].split(delimiter);
                if (cells.length <= colMap.nm) continue;

                // Clean value function
                const clean = (val: string) => {
                    if (!val) return 0;
                    // Remove quotes
                    let s = val.replace(/['"“”]/g, '').trim();
                    // Replace comma decimal if present (French format safety for values like "0,04")
                    s = s.replace(',', '.');
                    if (s === "") return 0;
                    const n = parseFloat(s);
                    return isNaN(n) ? 0 : n;
                };

                const nmStr = cells[colMap.nm];
                const nm = clean(nmStr); // Wavelength usually integer, but float ok

                if (!isNaN(nm) && nm > 0) {
                    const vEx = colMap.ex !== -1 ? clean(cells[colMap.ex]) : 0;
                    const vEm = colMap.em !== -1 ? clean(cells[colMap.em]) : 0;

                    tempEx.push({ wavelength: nm, value: vEx });
                    tempEm.push({ wavelength: nm, value: vEm });
                }
            }

            if (tempEx.length === 0) {
                setError("No valid data rows found.");
                return;
            }

            // 3. Scale & Normalize
            const maxExRaw = Math.max(...tempEx.map(p => p.value));
            const maxEmRaw = Math.max(...tempEm.map(p => p.value));

            // Heuristic: If max <= 2, multiply by 100 (Ratio -> Percentage)
            // But if max is 0, we can't do anything (it stays 0)
            const scaleFactor = (maxExRaw <= 2 && maxExRaw > 0) ? 100 : 1;

            const finalEx = tempEx.map(p => ({ ...p, value: p.value * scaleFactor }));
            const finalEm = tempEm.map(p => ({ ...p, value: p.value * scaleFactor }));

            const peakEx = Math.max(...finalEx.map(p => p.value));
            const peakEm = Math.max(...finalEm.map(p => p.value));

            const normEx = finalEx.map(p => ({ ...p, value: peakEx ? p.value / peakEx : 0 }));
            const normEm = finalEm.map(p => ({ ...p, value: peakEm ? p.value / peakEm : 0 }));

            console.log(`Parsed ${normEx.length} points. Max Ex raw: ${maxExRaw}. Scaled Max: ${peakEx}`);

            setExcitationData(normEx);
            setEmissionData(normEm);
            setError("");
        };
        reader.onerror = () => setError("Failed to read file.");
        reader.readAsText(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");

        try {
            const payload = {
                name,
                type,
                category,
                color,
                excitation_peak: exPeak ? Number(exPeak) : null,
                emission_peak: emPeak ? Number(emPeak) : null,
                excitation_data: excitationData,
                emission_data: emissionData,
                is_default: isDefault
            };

            const url = initialData ? `/api/spectra/${initialData.id}` : '/api/spectra';
            const method = initialData ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save");
            }

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
                    <label className="block text-sm font-medium text-gray-400 mb-2">Type</label>
                    <select
                        value={type}
                        onChange={e => setType(e.target.value as any)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary text-white"
                    >
                        <option value="Organic Dye">Organic Dye</option>
                        <option value="Fluorescent Protein">Fluorescent Protein</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value as any)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary text-white"
                    >
                        <option value="UV">UV</option>
                        <option value="Blue">Blue</option>
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

                <div className="flex items-center gap-3 pt-4">
                    <input
                        type="checkbox"
                        id="isDefault"
                        checked={isDefault}
                        onChange={e => setIsDefault(e.target.checked)}
                        className="w-5 h-5 rounded border-white/10 bg-black/40 text-primary focus:ring-primary"
                    />
                    <label htmlFor="isDefault" className="text-sm font-medium text-gray-300">
                        Show by default in Spectra Viewer
                    </label>
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
