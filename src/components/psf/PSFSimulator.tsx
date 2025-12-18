"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { usePyodide } from './usePyodide';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// --- Types ---
interface SimulationParams {
    NA: number;
    lambda_vac: number; // meters
    n_imm: number;
    n_sample: number;
    M_obj: number;
    f_tube: number;
    z_defocus: number; // meters
    astigmatism: "None" | "Weak" | "Strong";
    cam_pixel_um: number;
    oversampling: number;
    display_fov_um: number;
    depth: number; // meters
}

// Helper for rainbow gradient
const SPECTRUM_GRADIENT = "linear-gradient(to right, #440099, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF7F00, #FF0000)";

// --- Constants ---
const DEFAULT_PARAMS: SimulationParams = {
    NA: 1.49,
    lambda_vac: 600e-9,
    n_imm: 1.518,
    n_sample: 1.33,
    M_obj: 100,
    f_tube: 0.180,
    z_defocus: 0,
    astigmatism: "None",
    cam_pixel_um: 6.5,
    oversampling: 3,
    display_fov_um: 300,
    depth: 0,
};

// --- Helpers ---
function wavelengthToColor(wavelengthM: number): string {
    const nm = wavelengthM * 1e9;
    if (nm < 450) return "#8B5CF6"; // Violet
    if (nm < 495) return "#06b6d4"; // Blue/Cyan
    if (nm < 570) return "#22c55e"; // Green
    if (nm < 590) return "#eab308"; // Yellow
    if (nm < 620) return "#f97316"; // Orange
    return "#ef4444"; // Red
}

function drawMatrix(
    canvas: HTMLCanvasElement,
    data: Float64Array,
    width: number,
    height: number,
    colorHex: string,
    isPhase: boolean = false
) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ensure canvas size matches data
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }

    // Create ImageData
    const imgData = ctx.createImageData(width, height);
    const buf = imgData.data;

    // Normalize data
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < data.length; i++) {
        if (data[i] < min) min = data[i];
        if (data[i] > max) max = data[i];
    }
    const range = max - min || 1;

    // Parse color
    const r_feat = parseInt(colorHex.slice(1, 3), 16);
    const g_feat = parseInt(colorHex.slice(3, 5), 16);
    const b_feat = parseInt(colorHex.slice(5, 7), 16);

    for (let i = 0; i < data.length; i++) {
        const val = data[i];
        const norm = (val - min) / range;
        let r, g, b;

        if (isPhase) {
            // Phase Map: -PI to PI -> 0-1 (approx)
            // In Python: bfp_phase_vis = np.angle(complex_z) -> -PI to PI floats.
            // We did NOT cast bfp_phase_vis to uint16.
            // So for phase, val is still float -PI..PI.
            const v = (val + Math.PI) / (2 * Math.PI); // 0 to 1
            r = Math.floor(v * 255);
            g = Math.floor(v * 255);
            b = Math.floor(255 - v * 255);
        } else {
            // Intensity map: Black -> Color
            // Normalize 16-bit (0-65535) to 0-1 if data is 16-bit, otherwise use min/max normalization
            // Assuming intensity data is 16-bit (0-65535) from Python,
            // but `data` is Float64Array, so it's already scaled.
            // The `norm` variable below already handles min/max scaling for the current view.
            // If the Python output is already scaled to 0-1, then `range` would be 1 and `min` would be 0.
            // If Python output is 0-65535, then `range` would be 65535 and `min` would be 0.
            // The existing `norm` calculation `(val - min) / range` is robust.
            // However, if we want to explicitly treat `val` as a 16-bit value that needs to be scaled to 0-1
            // before applying the color, we can do that.
            // Let's assume the Python output for intensity is 0-65535 and we want to map that directly
            // to the color intensity, rather than scaling based on the current min/max of the displayed data.
            // This would make the color mapping consistent regardless of the data range in the current view.

            // If the data is expected to be 0-65535, normalize it to 0-1
            const normalizedVal = val / 65535; // Explicit 16-bit normalization

            r = Math.floor(normalizedVal * r_feat);
            g = Math.floor(normalizedVal * g_feat);
            b = Math.floor(normalizedVal * b_feat);
        }

        const idx = i * 4;
        buf[idx] = r;
        buf[idx + 1] = g;
        buf[idx + 2] = b;
        buf[idx + 3] = 255; // Alpha
    }

    ctx.putImageData(imgData, 0, 0);
}

// Peak-based Gaussian Stats (Better for PSF/Airy disks than moments)
// Returns center (index), sigma (pixels), and FWHM (pixels)
function calculateGaussStats(data: number[]) {
    if (!data || data.length === 0) return null;

    let min = Infinity, max = -Infinity;
    let maxIdx = -1;

    // 1. Basic Stats & Peak Finding
    for (let i = 0; i < data.length; i++) {
        const v = data[i];
        if (v < min) min = v;
        if (v > max) { max = v; maxIdx = i; }
    }

    // Background and Amplitude
    const bg = min;
    const amplitude = max - bg;
    const halfMax = bg + amplitude / 2;

    if (amplitude <= 0) return { min, max, bg, center: maxIdx, sigma: 0, fwhm: 0, amplitude: 0 };

    // 2. FWHM Calculation (Linear Interpolation)
    // Find left crossing
    let leftX = maxIdx;
    for (let i = maxIdx; i >= 0; i--) {
        if (data[i] < halfMax) {
            // Interpolate between i and i+1
            const y0 = data[i];
            const y1 = data[i + 1];
            // y = y0 + (y1 - y0) * (x - x0) -> halfMax = y0 + (y1 - y0) * (leftX - i)
            // leftX - i = (halfMax - y0) / (y1 - y0)
            leftX = i + (halfMax - y0) / (y1 - y0);
            break;
        }
    }

    // Find right crossing
    let rightX = maxIdx;
    for (let i = maxIdx; i < data.length; i++) {
        if (data[i] < halfMax) {
            const y1 = data[i];     // < HM
            const y0 = data[i - 1]; // >= HM
            rightX = (i - 1) + (halfMax - y0) / (y1 - y0);
            break;
        }
    }

    // Fallbacks if peak is at edge
    if (leftX === maxIdx) leftX = 0;
    if (rightX === maxIdx) rightX = data.length - 1;

    const fwhm = rightX - leftX;

    // For Gaussian: FWHM = 2.355 * sigma
    const sigma = fwhm / 2.355;

    // Refine Center (Midpoint of FWHM is often more stable than maxIdx for sub-pixel)
    const center = (leftX + rightX) / 2;

    return { min, max, bg, center, sigma, fwhm, amplitude };
}

function generateGaussCurve(length: number, stats: any) {
    if (!stats) return [];
    const { bg, center, sigma, amplitude } = stats;
    const curve = [];
    for (let i = 0; i < length; i++) {
        const val = bg + amplitude * Math.exp(-0.5 * ((i - center) / sigma) ** 2);
        curve.push({ x: i, fit: val });
    }
    return curve;
}

// --- Components ---

export default function PSFSimulator() {
    const { state, runSimulation, error: pyodideError } = usePyodide();
    const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);

    // Tab State
    const [activeTab, setActiveTab] = useState<"psf" | "bfp">("psf");

    // Local string state for inputs
    const [inputValues, setInputValues] = useState({
        NA: DEFAULT_PARAMS.NA.toString(),
        M_obj: DEFAULT_PARAMS.M_obj.toString(),
        n_imm: DEFAULT_PARAMS.n_imm.toString(),
        n_sample: DEFAULT_PARAMS.n_sample.toString(),
        cam_pixel_um: DEFAULT_PARAMS.cam_pixel_um.toString(),
        depth: (DEFAULT_PARAMS.depth * 1e6).toString(),
    });

    const [simResult, setSimResult] = useState<any>(null);
    const [calculating, setCalculating] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);

    // --- Reset Crosshair on Dimension Change ---
    useEffect(() => {
        if (!simResult) return;
        setCrosshair(null); // Reset to center
    }, [simResult?.img[0]?.length, simResult?.img?.length, params.cam_pixel_um, params.display_fov_um]);

    // --- Interaction Handlers ---Crosshair State (Indices in simulation array)
    const [crosshair, setCrosshair] = useState<{ x: number, y: number } | null>(null);

    // Single Main Canvas Ref
    const psfCanvasRef = useRef<HTMLCanvasElement>(null);

    // Handle clicks on Canvas
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!simResult) return;

        // Select Data based on Tab
        let dataGrid: number[][] | undefined;
        if (activeTab === "psf") dataGrid = simResult.img;
        else dataGrid = simResult.bfp;

        if (!dataGrid) return;

        const canvas = psfCanvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const imgW = dataGrid[0].length;
        const imgH = dataGrid.length;

        const scaleX = imgW / rect.width;
        const scaleY = imgH / rect.height;

        const imgX = Math.floor(x * scaleX);
        const imgY = Math.floor(y * scaleY);

        if (imgX >= 0 && imgX < imgW && imgY >= 0 && imgY < imgH) {
            setCrosshair({ x: imgX, y: imgY });
        }
    };

    // Sync inputValues to params when valid number is typed
    const handleInputChange = (key: keyof typeof inputValues, val: string) => {
        setInputValues(prev => ({ ...prev, [key]: val }));
    };

    const commitInput = (key: keyof typeof inputValues) => {
        const val = inputValues[key];
        const num = parseFloat(val);
        if (!isNaN(num) && val.trim() !== "") {
            setParams(prev => {
                if (prev[key as keyof SimulationParams] === num) return prev;
                return { ...prev, [key]: num };
            });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, key: keyof typeof inputValues) => {
        if (e.key === 'Enter') {
            commitInput(key);
            (e.target as HTMLInputElement).blur();
        }
    };

    // Run simulation
    useEffect(() => {
        if (state === "READY" && !calculating) {
            const run = async () => {
                setCalculating(true);
                setLastError(null);
                try {
                    // Calculate Auto-Focus Shift
                    // Z_shift = - Depth * (n_imm / n_sample)^2
                    // This shifts the focal plane deeper to match the molecule position roughly
                    const z_shift = -params.depth * Math.pow(params.n_imm / params.n_sample, 2);

                    // Total Z passed to engine = slider_value (relative) + shift (offset)
                    const z_total = params.z_defocus + z_shift;

                    // Pass modified params to simulation
                    const simArgs = {
                        ...params,
                        z_defocus: z_total
                    };

                    const res = await runSimulation(simArgs, {});
                    setSimResult(res);
                } catch (e: any) {
                    console.error("Simulation failed:", e);
                    setLastError(e.message || String(e));
                } finally {
                    setCalculating(false);
                }
            };
            const timer = setTimeout(run, 50);
            return () => clearTimeout(timer);
        }
    }, [state, params]);

    // Reset crosshair on tab switch
    useEffect(() => {
        setCrosshair(null);
    }, [activeTab]);

    // Effect to Draw Main Canvas
    useEffect(() => {
        if (!simResult) return;
        if (!psfCanvasRef.current) return;

        const color = wavelengthToColor(params.lambda_vac);
        const canvas = psfCanvasRef.current;

        // Select Data
        let dataGrid: number[][] | undefined;
        let isBfp = false;

        if (activeTab === "psf") {
            dataGrid = simResult.img;
            isBfp = false;
        } else {
            dataGrid = simResult.bfp;
            isBfp = true;
        }

        if (!dataGrid || dataGrid.length === 0) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        const height = dataGrid.length;
        const width = dataGrid[0].length;

        // Flatten
        const flatData = new Float64Array(width * height);
        for (let y = 0; y < height; y++) {
            const row = dataGrid[y];
            for (let x = 0; x < width; x++) {
                flatData[y * width + x] = row[x];
            }
        }

        drawMatrix(canvas, flatData, width, height, color);

        // BFP Circle Overlay (Text moved to JSX)
        if (isBfp && params.NA > params.n_sample) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const ratio = params.n_sample / params.NA;
                const r_pix_max = width / 2;
                const r_crit_pix = r_pix_max * ratio;

                ctx.beginPath();
                ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.arc(width / 2, height / 2, r_crit_pix, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

    }, [simResult, activeTab, params]);

    // Compute Profiles & Stats
    const profileAnalysis = useMemo(() => {
        if (!simResult) return null;

        // Select Data
        let dataGrid: number[][] | undefined;
        if (activeTab === "psf") dataGrid = simResult.img;
        else dataGrid = simResult.bfp;

        if (!dataGrid || dataGrid.length === 0) return null;

        const height = dataGrid.length;
        const width = dataGrid[0].length;

        const cx = crosshair ? Math.min(Math.max(crosshair.x, 0), width - 1) : Math.floor(width / 2);
        const cy = crosshair ? Math.min(Math.max(crosshair.y, 0), height - 1) : Math.floor(height / 2);

        // 1. Horizontal Profile
        const row = dataGrid[cy] ? Array.from(dataGrid[cy]) : new Array(width).fill(0);

        // 2. Vertical Profile
        const col = new Array(height);
        for (let y = 0; y < height; y++) {
            col[y] = dataGrid[y] ? dataGrid[y][cx] : 0;
        }

        // Stats & Fit
        let hStats = null;
        let vStats = null;
        let hFitData: any[] = [];
        let vFitData: any[] = [];

        if (activeTab === "psf") {
            hStats = calculateGaussStats(row as number[]);
            vStats = calculateGaussStats(col);
            hFitData = generateGaussCurve(width, hStats);

            // For vertical, we generate standard array then map it
            const vFitRaw = generateGaussCurve(height, vStats);
            vFitData = vFitRaw;
        }

        const hData = row.map((val: number, i: number) => ({
            x: i,
            intensity: val,
            fit: hFitData[i]?.fit || null
        }));

        const vData = col.map((val: number, i: number) => ({
            y: i,
            intensity: val,
            fit: vFitData[i]?.fit || null
        }));

        return { hData, vData, hStats, vStats, cx, cy, width, height };
    }, [simResult, crosshair, activeTab]);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] font-sans">
            {/* Sidebar Controls */}
            <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar pt-[58px]">


                {state === "ERROR" && (
                    <div className="p-4 bg-red-900/20 border border-red-500 text-red-500 text-xs font-mono">
                        <strong>ERROR:</strong> {pyodideError || "Simulator failed."}
                    </div>
                )}
                {lastError && (
                    <div className="p-4 bg-yellow-900/20 border border-yellow-500 text-yellow-500 text-xs font-mono break-words">
                        {lastError}
                    </div>
                )}

                {/* 1. Objective Lens Parameters */}
                <div className="glass-card !p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2">
                        Objective lens parameters
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500 uppercase tracking-wider">NA</label>
                            <input
                                type="text"
                                value={inputValues.NA}
                                onChange={e => handleInputChange('NA', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, 'NA')}
                                className="w-full bg-transparent border-b border-white/20 px-0 py-1 text-sm text-brand-cyan font-mono focus:border-brand-cyan focus:outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500 uppercase tracking-wider">Mag (X)</label>
                            <input
                                type="text"
                                value={inputValues.M_obj}
                                onChange={e => handleInputChange('M_obj', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, 'M_obj')}
                                className="w-full bg-transparent border-b border-white/20 px-0 py-1 text-sm text-brand-cyan font-mono focus:border-brand-cyan focus:outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-1 col-span-2">
                            <label className="text-xs text-gray-500 uppercase tracking-wider">Immersion medium refractive index (N_imm)</label>
                            <input
                                type="text"
                                value={inputValues.n_imm}
                                onChange={e => handleInputChange('n_imm', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, 'n_imm')}
                                className="w-full bg-transparent border-b border-white/20 px-0 py-1 text-sm text-brand-cyan font-mono focus:border-brand-cyan focus:outline-none transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Sample parameters */}
                <div className="glass-card !p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2">
                        Sample parameters
                    </h3>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500 uppercase tracking-wider">n Sample</label>
                            <input
                                type="text"
                                value={inputValues.n_sample}
                                onChange={e => handleInputChange('n_sample', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, 'n_sample')}
                                className="w-full bg-transparent border-b border-white/20 px-0 py-1 text-sm text-brand-cyan font-mono focus:border-brand-cyan focus:outline-none transition-colors"
                            />
                        </div>

                        {/* Molecule Depth (Moved here, renamed, nm units) */}
                        <div className="space-y-2 pt-2 border-t border-white/10">
                            <label className="text-xs text-gray-500 uppercase tracking-wider">Molecule depth (nm)</label>
                            <input
                                type="text"
                                value={inputValues.depth}
                                onChange={e => handleInputChange('depth', e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        const val = parseFloat(inputValues.depth);
                                        if (!isNaN(val)) {
                                            // NM conversion: 1e-9
                                            setParams(p => ({ ...p, depth: val * 1e-9 }));
                                            (e.target as HTMLInputElement).blur();
                                        }
                                    }
                                }}
                                className="w-full bg-transparent border-b border-white/20 px-0 py-1 text-sm text-brand-cyan font-mono focus:border-brand-cyan focus:outline-none transition-colors"
                            />
                            {/* Presets (nm) */}
                            <div className="grid grid-cols-3 gap-2 pt-2">
                                {[0, 500, 1000, 3000, 5000].map((d_nm) => (
                                    <button
                                        key={d_nm}
                                        onClick={() => {
                                            // NM conversion
                                            setParams(p => ({ ...p, depth: d_nm * 1e-9, z_defocus: 0 }));
                                            setInputValues(prev => ({ ...prev, depth: d_nm.toString() }));
                                        }}
                                        className={`text-[10px] py-1 border border-white/10 transition-all uppercase tracking-wide
                                            ${Math.abs(params.depth * 1e9 - d_nm) < 1
                                                ? "bg-brand-cyan text-black font-bold"
                                                : "hover:bg-white/5 text-gray-400"}`}
                                    >
                                        {d_nm === 0 ? "Surface" : `${d_nm} nm`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-white/10">
                            <label className="text-xs text-gray-500 uppercase tracking-wider">Wavelength: {(params.lambda_vac * 1e9).toFixed(0)} nm</label>
                            <input
                                type="range"
                                min="400" max="700" step="10"
                                value={params.lambda_vac * 1e9}
                                onChange={e => setParams(p => ({ ...p, lambda_vac: parseFloat(e.target.value) * 1e-9 }))}
                                className="w-full accent-brand-cyan h-1 bg-white/10 appearance-none cursor-pointer"
                            />
                            <div className="h-1 w-full opacity-80" style={{ background: SPECTRUM_GRADIENT }}></div>
                        </div>
                    </div>
                </div>



                {/* 3. Camera parameters */}
                <div className="glass-card !p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2 flex justify-between items-center">
                        Camera parameters
                        {calculating && <span className="text-[10px] text-brand-cyan animate-pulse">Running...</span>}
                    </h3>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500 uppercase tracking-wider">Pixel pitch (µm)</label>
                            <input
                                type="text"
                                value={inputValues.cam_pixel_um}
                                onChange={e => handleInputChange('cam_pixel_um', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, 'cam_pixel_um')}
                                className="w-full bg-transparent border-b border-white/20 px-0 py-1 text-sm text-brand-cyan font-mono focus:border-brand-cyan focus:outline-none transition-colors"
                            />
                        </div>
                    </div>
                </div>

                <div className="glass-card !p-6 space-y-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2">Aberrations</h3>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-xs text-gray-500 uppercase tracking-wider">Defocus</label>
                                <span className="text-xs font-mono text-brand-cyan">{(params.z_defocus * 1e6).toFixed(2)} µm</span>
                            </div>
                            {(() => {
                                const limitNm = (4 * params.n_imm * params.lambda_vac / (params.NA ** 2)) * 1e9;
                                return (
                                    <input
                                        type="range"
                                        min={-limitNm} max={limitNm} step={limitNm / 50} // Adaptive step size
                                        value={params.z_defocus * 1e9}
                                        onChange={e => setParams(p => ({ ...p, z_defocus: parseFloat(e.target.value) * 1e-9 }))}
                                        className="w-full accent-brand-cyan h-1 bg-white/10 appearance-none cursor-pointer"
                                    />
                                );
                            })()}
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-500 uppercase tracking-wider">Astigmatism</label>
                            <div className="flex border border-white/20">
                                {["None", "Weak", "Strong"].map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => setParams(p => ({ ...p, astigmatism: opt as any }))}
                                        className={`flex-1 text-[10px] py-2 uppercase tracking-wide transition-all ${params.astigmatism === opt
                                            ? "bg-brand-cyan text-black font-bold"
                                            : "bg-transparent text-gray-500 hover:text-white"
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('psf')}
                        className={`px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'psf' ? 'border-brand-cyan text-white' : 'border-transparent text-gray-600 hover:text-gray-400'
                            }`}
                    >
                        PSF Image Plane
                    </button>
                    <button
                        onClick={() => setActiveTab('bfp')}
                        className={`px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'bfp' ? 'border-brand-magenta text-white' : 'border-transparent text-gray-600 hover:text-gray-400'
                            }`}
                    >
                        BFP Image Plane
                    </button>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-[1fr_240px] grid-rows-[1fr_240px] gap-4 w-full h-full min-h-0">

                    {/* 1. Main Canvas (Top-Left) */}
                    <div className="glass-card !p-0 flex flex-col items-center justify-center relative overflow-hidden group border border-white/10">
                        <span className="absolute top-4 left-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest pointer-events-none z-10">
                            {activeTab === 'psf' ? 'Primary View' : 'Fourier Plane'}
                        </span>

                        {/* Loading / Calculating Overlay */}
                        {(state === "LOADING" || calculating) && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                                <div className="text-brand-cyan font-bold text-sm uppercase tracking-widest animate-pulse border border-brand-cyan/30 px-6 py-3 bg-black/80 rounded shadow-lg shadow-brand-cyan/20">
                                    {state === "LOADING" ? "Loading Engine..." : "Calculating..."}
                                </div>
                            </div>
                        )}

                        <div className="relative h-full aspect-square p-4 mx-auto">
                            <canvas
                                ref={psfCanvasRef}
                                onClick={handleCanvasClick}
                                className="w-full h-full image-pixelated cursor-crosshair block shadow-2xl shadow-black/50"
                                style={{ imageRendering: 'pixelated' }}
                            />

                            {/* Crosshair Overlay */}
                            {profileAnalysis && (
                                <>
                                    {/* Horizontal Line */}
                                    <div
                                        className="absolute w-full border-t border-brand-cyan/30 border-dashed pointer-events-none transition-all duration-75"
                                        style={{
                                            top: `${((profileAnalysis.cy + 0.5) / profileAnalysis.height) * 100}%`,
                                            left: 0
                                        }}
                                    />
                                    {/* Vertical Line */}
                                    <div
                                        className="absolute h-full border-l border-brand-magenta/30 border-dashed pointer-events-none transition-all duration-75"
                                        style={{
                                            left: `${((profileAnalysis.cx + 0.5) / profileAnalysis.width) * 100}%`,
                                            top: 0
                                        }}
                                    />
                                </>
                            )}

                            {/* BFP Labels - Pure HTML/CSS for crisp text */}
                            {activeTab === 'bfp' && params.NA > params.n_sample && (
                                <>
                                    {/* UAF (Sub-critical) - Center */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-cyan font-bold text-sm pointer-events-none drop-shadow-md select-none">
                                        UAF
                                    </div>

                                    {/* SAF (Super-critical) - Top Edge */}
                                    <div className="absolute top-[10%] left-1/2 -translate-x-1/2 text-[10px] md:text-xs font-bold text-brand-magenta pointer-events-none drop-shadow-md select-none uppercase tracking-widest">
                                        SAF
                                    </div>
                                </>
                            )}

                        </div>

                        <div className="absolute bottom-4 left-4 flex flex-col items-start gap-1 p-3 bg-black/80 border border-brand-cyan/20 pointer-events-none z-20 rounded-sm backdrop-blur-sm">
                            {activeTab === 'psf' ? (
                                <>
                                    <div className="text-xs font-bold font-mono text-brand-cyan uppercase tracking-widest border-b border-brand-cyan/20 pb-1 mb-1 w-full">
                                        Parameters
                                    </div>
                                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs font-bold font-mono whitespace-nowrap">
                                        <span className="text-gray-500">NA:</span>
                                        <span className="text-white text-right">{params.NA.toFixed(2)}</span>

                                        <span className="text-gray-500">Mag:</span>
                                        <span className="text-white text-right">{params.M_obj}x</span>

                                        <span className="text-gray-500">λ:</span>
                                        <span className="text-right" style={{ color: wavelengthToColor(params.lambda_vac) }}>
                                            {(params.lambda_vac * 1e9).toFixed(0)} nm
                                        </span>

                                        <span className="text-gray-500">Depth:</span>
                                        <span className="text-white text-right">{(params.depth * 1e6).toFixed(1)} µm</span>

                                        <span className="text-gray-500">Defocus:</span>
                                        <span className="text-white text-right">{(params.z_defocus * 1e6).toFixed(2)} µm</span>

                                        <span className="text-brand-cyan/80 mt-1 pt-1 border-t border-brand-cyan/10">FOV:</span>
                                        <span className="text-brand-cyan mt-1 pt-1 border-t border-brand-cyan/10 text-right">
                                            {(params.display_fov_um || 300).toFixed(0)} µm
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="text-xs font-bold font-mono text-brand-magenta">
                                    NA Limit: {params.NA.toFixed(2)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. Vertical Profile (Top-Right) */}
                    <div className="glass-card !p-4 relative flex flex-col min-h-0 border-l border-brand-magenta/20">
                        <span className="absolute top-2 left-4 text-[10px] font-mono text-brand-magenta uppercase tracking-widest">
                            Y-Axis Intensity
                        </span>
                        <div className="flex-1 w-full min-h-0 pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart layout="vertical" data={profileAnalysis?.vData || []} barCategoryGap={0} barGap={0}>
                                    <defs>
                                        <linearGradient id="gradVertical" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#000000" stopOpacity={0} />
                                            <stop offset="100%" stopColor={wavelengthToColor(params.lambda_vac)} stopOpacity={0.8} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="2 2" stroke="#1a1a1a" horizontal={false} />
                                    <XAxis type="number" hide domain={[0, 'auto']} />
                                    <YAxis dataKey="y" type="number" hide reversed domain={[0, 'dataMax']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px' }}
                                        itemStyle={{ color: '#fff' }}
                                        cursor={{ stroke: '#333' }}
                                    />
                                    {/* Intensity Bar (Bottom Layer) */}
                                    <Bar
                                        dataKey="intensity"
                                        fill="url(#gradVertical)"
                                        fillOpacity={1}
                                        isAnimationActive={false}
                                    />
                                    {/* Gaussian Fit Line (Top Layer, drawn last) */}
                                    {activeTab === 'psf' && (
                                        <Line
                                            dataKey="fit"
                                            type="monotone"
                                            stroke="#fff"
                                            strokeWidth={1.5}
                                            strokeDasharray="4 4"
                                            dot={false}
                                            isAnimationActive={false}
                                        />
                                    )}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 3. Horizontal Profile (Bottom-Left) */}
                    <div className="glass-card !p-4 relative flex flex-col min-h-0 border-t border-brand-cyan/20">
                        <span className="absolute top-2 left-4 text-[10px] font-mono text-brand-cyan uppercase tracking-widest">
                            X-Axis Intensity
                        </span>
                        <div className="flex-1 w-full min-h-0 pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={profileAnalysis?.hData || []} barCategoryGap={0} barGap={0}>
                                    <defs>
                                        <linearGradient id="gradHorizontal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={wavelengthToColor(params.lambda_vac)} stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#000000" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="2 2" stroke="#1a1a1a" vertical={false} />
                                    <XAxis dataKey="x" hide />
                                    <YAxis hide domain={[0, 'auto']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px' }}
                                        itemStyle={{ color: '#fff' }}
                                        cursor={{ stroke: '#333' }}
                                    />
                                    {/* Intensity Bar (Bottom Layer) */}
                                    <Bar
                                        dataKey="intensity"
                                        fill="url(#gradHorizontal)"
                                        fillOpacity={1}
                                        isAnimationActive={false}
                                    />
                                    {/* Gaussian Fit Line (Top Layer, drawn last) */}
                                    {activeTab === 'psf' && (
                                        <Line
                                            dataKey="fit"
                                            type="monotone"
                                            stroke="#fff"
                                            strokeWidth={1.5}
                                            strokeDasharray="4 4"
                                            dot={false}
                                            isAnimationActive={false}
                                        />
                                    )}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 4. Stats Panel (Bottom-Right) */}
                    <div className="glass-card !p-4 flex flex-col justify-center gap-2">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/10 pb-1">
                            {activeTab === 'psf' ? "Gaussian Fit" : "Cursor Info"}
                        </h4>

                        {activeTab === 'psf' ? (
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                                <div className="text-gray-600 text-[10px] uppercase">Parameter</div>
                                <div className="text-right text-gray-600 text-[10px] uppercase">nm</div>

                                <div className="text-brand-cyan font-mono">σ (X)</div>
                                <div className="text-right font-mono text-white">
                                    {(profileAnalysis?.hStats?.sigma
                                        ? (profileAnalysis.hStats.sigma * (params.cam_pixel_um / params.M_obj) * 1.5 * 1000)
                                        : 0).toFixed(1)}
                                </div>

                                <div className="text-brand-magenta font-mono">σ (Y)</div>
                                <div className="text-right font-mono text-white">
                                    {(profileAnalysis?.vStats?.sigma
                                        ? (profileAnalysis.vStats.sigma * (params.cam_pixel_um / params.M_obj) * 1.5 * 1000)
                                        : 0).toFixed(1)}
                                </div>

                                <div className="col-span-2 h-px bg-white/5 my-1" />

                                <div className="text-gray-500 font-mono">FWHM X</div>
                                <div className="text-right font-mono text-white">
                                    {(profileAnalysis?.hStats?.fwhm
                                        ? (profileAnalysis.hStats.fwhm * (params.cam_pixel_um / params.M_obj) * 1.5 * 1000)
                                        : 0).toFixed(1)}
                                </div>
                                <div className="text-gray-500 font-mono">FWHM Y</div>
                                <div className="text-right font-mono text-white">
                                    {(profileAnalysis?.vStats?.fwhm
                                        ? (profileAnalysis.vStats.fwhm * (params.cam_pixel_um / params.M_obj) * 1.5 * 1000)
                                        : 0).toFixed(1)}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                                <div className="text-xl text-gray-700">✛</div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                                    Click BFP to view <br /> profiles
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* DEBUG SECTION */}
            <div className="fixed bottom-0 right-0 p-1 bg-black/90 text-[10px] text-gray-600 pointer-events-none z-50 font-mono">
                PSF Sim v2.2 | Status: {state}
            </div>
        </div >
    );
}
