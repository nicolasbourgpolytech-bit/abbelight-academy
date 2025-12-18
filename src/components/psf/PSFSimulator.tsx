"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { usePyodide } from './usePyodide';
import { ComposedChart, Bar, BarChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

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
    correction_sa: number; // Rad * rho^4
}

// Helper for rainbow gradient
const SPECTRUM_GRADIENT = "linear-gradient(to right, #440099, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF7F00, #FF0000)";

// Twilight Colormap Helper (Cyclic: White -> Blue -> Black -> Red -> White)
function getTwilightColor(val: number): [number, number, number] {
    // val is -PI to PI. Map to 0..1
    const t = (val + Math.PI) / (2 * Math.PI);

    // Interpolate keypoints
    // 0.0 (White): 255, 255, 255
    // 0.25 (Blue): 65, 105, 225
    // 0.5 (Black): 0, 0, 0
    // 0.75 (Red): 220, 20, 60
    // 1.0 (White): 255, 255, 255

    let r = 0, g = 0, b = 0;

    if (t < 0.25) { // White -> Blue
        const p = t / 0.25;
        r = 255 * (1 - p) + 65 * p;
        g = 255 * (1 - p) + 105 * p;
        b = 255 * (1 - p) + 225 * p;
    } else if (t < 0.5) { // Blue -> Black
        const p = (t - 0.25) / 0.25;
        r = 65 * (1 - p);
        g = 105 * (1 - p);
        b = 225 * (1 - p);
    } else if (t < 0.75) { // Black -> Red
        const p = (t - 0.5) / 0.25;
        r = 220 * p;
        g = 20 * p;
        b = 60 * p;
    } else { // Red -> White
        const p = (t - 0.75) / 0.25;
        r = 220 * (1 - p) + 255 * p;
        g = 60 * (1 - p) + 255 * p;
        b = 60 * (1 - p) + 255 * p;
    }

    return [Math.floor(r), Math.floor(g), Math.floor(b)];
}

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
    correction_sa: 0,
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
            // Twilight Colormap
            [r, g, b] = getTwilightColor(val);
        } else {
            // Intensity map: Black -> Color
            r = Math.floor(norm * r_feat);
            g = Math.floor(norm * g_feat);
            b = Math.floor(norm * b_feat);
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

    // Canvases
    const psfCanvasRef = useRef<HTMLCanvasElement>(null); // Main Image (or Left BFP)
    const bfpPhaseCanvasRef = useRef<HTMLCanvasElement>(null); // Right BFP (Phase)

    // Handle clicks on Canvas
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>, isSecondary: boolean = false) => {
        if (!simResult) return;

        // Select Data based on Tab
        let dataGrid: number[][] | undefined;
        if (activeTab === "psf") dataGrid = simResult.img;
        else {
            // In BFP Mode: Left=Intensity, Right=Phase
            if (isSecondary) dataGrid = simResult.bfp_phase;
            else dataGrid = simResult.bfp;
        }

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

        let isPhase = false;
        let usePhaseCanvas = false;

        if (activeTab === "psf") {
            dataGrid = simResult.img;
        } else {
            dataGrid = simResult.bfp;
            isBfp = true;
            // Note: Phase view is handled separately in effect below or same effect?
            // Let's draw Intensity here on Main Canvas
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

        drawMatrix(canvas, flatData, width, height, color, false);

        // --- SECONDARY CANVAS (BFP PHASE) ---
        if (activeTab === "bfp" && bfpPhaseCanvasRef.current && simResult.bfp_phase) {
            const canvas2 = bfpPhaseCanvasRef.current;
            const dataGrid2 = simResult.bfp_phase;
            if (dataGrid2 && dataGrid2.length > 0) {
                const h2 = dataGrid2.length;
                const w2 = dataGrid2[0].length;
                const flatData2 = new Float64Array(w2 * h2);
                for (let y = 0; y < h2; y++) {
                    const row = dataGrid2[y];
                    for (let x = 0; x < w2; x++) {
                        flatData2[y * w2 + x] = row[x];
                    }
                }
                // Colors doesn't matter for Phase Twilight, but we pass one
                drawMatrix(canvas2, flatData2, w2, h2, "#ffffff", true);
            }
        }

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

        const hMax = Math.max(...row);
        const hData = row.map((val: number, i: number) => ({
            x: i,
            intensity: val,
            fit: hFitData[i]?.fit || null
        }));

        const vMax = Math.max(...col);
        const vData = col.map((val: number, i: number) => ({
            y: i,
            intensity: val,
            fit: vFitData[i]?.fit || null
        }));

        return { hData, vData, hStats, vStats, cx, cy, width, height, hMax, vMax };
    }, [simResult, crosshair, activeTab]);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full font-sans justify-center">
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

                {/* 1. Objective Lens Parameters & Correction Collar */}
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

                        {/* Correction Collar */}
                        <div className="space-y-2 col-span-2 pt-2 border-t border-white/10">
                            <div className="flex justify-between">
                                <label className="text-xs text-gray-500 uppercase tracking-wider">Correction Collar</label>
                                <span className="text-xs font-mono text-brand-cyan">{params.correction_sa.toFixed(1)} rad</span>
                            </div>
                            <input
                                type="range"
                                min="-15" max="15" step="0.1"
                                value={params.correction_sa}
                                onChange={e => setParams(p => ({ ...p, correction_sa: parseFloat(e.target.value) }))}
                                className="w-full accent-brand-cyan h-1 bg-white/10 appearance-none cursor-pointer"
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
                            <label className="text-xs text-gray-500 uppercase tracking-wider">Sample medium refractive index (n_sample)</label>
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
                                // Dynamic Range: +/- 4 * DOF
                                // DOF approx lambda / NA^2
                                // 2 * n_imm * lambda / NA^2 ??
                                // Code used: (4 * n_imm * lambda / NA^2)
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
            <div className="flex-1 w-full flex flex-col pt-[58px] overflow-hidden">
                {/* Centered Wrapper: Hugs content width (Visualization) and centers it. Tabs stretch to this width. */}
                <div className="w-full max-w-7xl mx-auto h-full flex flex-col gap-4 min-w-0">

                    {/* Tabs */}
                    <div className="flex border-b border-white/10 w-full">
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

                    {/* Flex Column Layout - Robust Alignment */}
                    <div className="flex flex-row w-full h-full min-h-0 gap-4">

                        {/* LEFT COLUMN: Image + X-Profile */}
                        {/* Width is driven by the aspect-square of the image which fills the available height */}
                        <div className="flex flex-col gap-4 h-full flex-1 min-w-0">

                            {/* 1. Main Canvas Area - Split for BFP Dual View */}
                            <div className="w-full flex gap-2 min-h-0 min-w-0 flex-1">
                                {/* PRIMARY CANVAS (Image or BFP Intensity) */}
                                <div className="glass-card flex-1 h-full flex flex-col items-center justify-center relative overflow-hidden group border border-white/10 !p-0">
                                    <span className="absolute top-4 left-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest pointer-events-none z-10">
                                        {activeTab === 'psf' ? 'Primary View' : 'BFP Intensity'}
                                    </span>

                                    {/* Loading / Calculating Overlay */}
                                    {(state === "LOADING" || calculating) && (
                                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                                            <div className="text-brand-cyan font-bold text-sm uppercase tracking-widest animate-pulse border border-brand-cyan/30 px-6 py-3 bg-black/80 rounded shadow-lg shadow-brand-cyan/20">
                                                {state === "LOADING" ? "Loading Engine..." : "Calculating..."}
                                            </div>
                                        </div>
                                    )}

                                    <div className="relative w-full h-full flex items-center justify-center">
                                        {/* Aspect Ratio Constraint Container */}
                                        <div className="relative aspect-square h-full max-w-full">
                                            <canvas
                                                ref={psfCanvasRef}
                                                onClick={(e) => handleCanvasClick(e, false)}
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
                                        </div>
                                    </div>

                                    {/* BFP Labels & Params Overlay (Same as before but filtered for only this view) */}
                                    {activeTab === 'bfp' && params.NA > params.n_sample && (
                                        <>
                                            {/* UAF (Sub-critical) - Center */}
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-cyan font-bold text-sm pointer-events-none drop-shadow-md select-none">
                                                UAF
                                            </div>

                                            {/* SAF (Super-critical) - Top Edge (Restored) */}
                                            <div
                                                className="absolute left-1/2 -translate-x-1/2 text-[10px] md:text-xs font-bold text-brand-magenta pointer-events-none drop-shadow-md select-none uppercase tracking-widest"
                                                style={{
                                                    top: `calc(50% - (50% * ${params.n_sample / params.NA}) - 20px)`
                                                }}
                                            >
                                                SAF
                                            </div>
                                        </>
                                    )}

                                </div>

                                {/* SECONDARY CANVAS (BFP Phase) - Only visible in BFP mode */}
                                {activeTab === 'bfp' && (
                                    <div className="glass-card flex-1 h-full flex flex-col items-center justify-center relative overflow-hidden group border border-white/10 !p-0">
                                        <span className="absolute top-4 left-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest pointer-events-none z-10">
                                            BFP Phase (Pupil)
                                        </span>
                                        <div className="relative w-full h-full flex items-center justify-center">
                                            <div className="relative aspect-square h-full max-w-full">
                                                <canvas
                                                    ref={bfpPhaseCanvasRef}
                                                    className="w-full h-full image-pixelated block shadow-2xl shadow-black/50"
                                                    style={{ imageRendering: 'pixelated' }}
                                                />
                                            </div>
                                        </div>

                                        {/* ABERRATION CHART OVERLAY */}
                                        {simResult?.stats && (
                                            <div className="absolute bottom-2 right-2 w-48 h-32 bg-black/60 backdrop-blur border border-white/10 p-2 z-20">
                                                <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block mb-1">
                                                    Aberration Power (PV)
                                                </span>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={[
                                                        { name: 'Depth', val: simResult.stats.Depth, fill: '#06b6d4' },
                                                        { name: 'Def', val: simResult.stats.Defocus, fill: '#22c55e' },
                                                        { name: 'Astig', val: simResult.stats.Astig, fill: '#c026d3' },
                                                        { name: 'Collar', val: simResult.stats.Collar, fill: '#eab308' },
                                                    ]}>
                                                        <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#fff' }} interval={0} />
                                                        <YAxis hide domain={[0, 'auto']} />
                                                        <Tooltip contentStyle={{ backgroundColor: '#000', fontSize: '10px' }} />
                                                        <Bar dataKey="val" />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 2. Horizontal Profile (Bottom) - Fixed Height (Only show in PSF mode) */}
                            {activeTab === 'psf' && (
                                <div className="glass-card !p-4 relative flex flex-col h-[240px] shrink-0 border-t border-brand-cyan/20">
                                    <span className="absolute top-2 left-4 text-[10px] font-mono text-brand-cyan uppercase tracking-widest">
                                        X-Axis Intensity
                                    </span>
                                    <div className="flex-1 w-full min-h-0 pt-2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={profileAnalysis?.hData || []} barCategoryGap={0} barGap={0}>
                                                <CartesianGrid strokeDasharray="2 2" stroke="#1a1a1a" vertical={false} />
                                                <XAxis dataKey="x" hide />
                                                <YAxis hide domain={[0, 'auto']} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px' }}
                                                    itemStyle={{ color: '#fff' }}
                                                    cursor={{ stroke: '#333' }}
                                                />
                                                <Bar dataKey="intensity" isAnimationActive={false}>
                                                    {profileAnalysis?.hData.map((entry: any, index: number) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={wavelengthToColor(params.lambda_vac)}
                                                            fillOpacity={profileAnalysis.hMax ? (entry.intensity / profileAnalysis.hMax) : 0}
                                                        />
                                                    ))}
                                                </Bar>
                                                <Line
                                                    dataKey="fit"
                                                    stroke="#ef4444"
                                                    dot={false}
                                                    strokeWidth={2}
                                                    isAnimationActive={false}
                                                />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="absolute bottom-2 right-4 flex items-center gap-4 text-[10px] font-mono">
                                        {profileAnalysis?.hStats && (
                                            <>
                                                <span className="text-brand-cyan">
                                                    σ: {(profileAnalysis.hStats.sigma * params.cam_pixel_um).toFixed(1)} nm
                                                </span>
                                                <span className="text-brand-magenta">
                                                    FWHM: {(profileAnalysis.hStats.fwhm * params.cam_pixel_um).toFixed(1)} nm
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div> {/* End Left Column */}

                    {/* RIGHT COLUMN: Y-Profile + Stats */}
                    {/* Fixed Width */}
                    <div className="flex flex-col gap-4 h-full w-[240px] shrink-0">

                        {/* 3. Vertical Profile (Top) - Dynamic Height (Matches Image) - Only in PSF Mode */}
                        {activeTab === 'psf' && (
                            <div className="glass-card !p-4 relative flex flex-col flex-1 min-h-0 border-l border-brand-magenta/20">
                                <span className="absolute top-2 left-4 text-[10px] font-mono text-brand-magenta uppercase tracking-widest">
                                    Y-Axis Intensity
                                </span>
                                <div className="flex-1 w-full min-h-0 pt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart layout="vertical" data={profileAnalysis?.vData || []} barCategoryGap={0} barGap={0}>
                                            <CartesianGrid strokeDasharray="2 2" stroke="#1a1a1a" horizontal={false} />
                                            <XAxis type="number" hide domain={[0, 'auto']} />
                                            <YAxis dataKey="y" type="number" hide reversed domain={[0, 'dataMax']} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px' }}
                                                itemStyle={{ color: '#fff' }}
                                                cursor={{ stroke: '#333' }}
                                            />
                                            <Bar dataKey="intensity" isAnimationActive={false}>
                                                {profileAnalysis?.vData.map((entry: any, index: number) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={wavelengthToColor(params.lambda_vac)}
                                                        fillOpacity={profileAnalysis.vMax ? (entry.intensity / profileAnalysis.vMax) : 0}
                                                    />
                                                ))}
                                            </Bar>
                                            <Line
                                                dataKey="fit"
                                                type="monotone"
                                                stroke="#fff"
                                                strokeWidth={1.5}
                                                strokeDasharray="4 4"
                                                dot={false}
                                                isAnimationActive={false}
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* 4. Stats Panel (Bottom) - Fixed Height */}
                        <div className="glass-card !p-4 flex flex-col justify-center gap-2 h-[240px] shrink-0">
                            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/10 pb-1">
                                {activeTab === 'psf' ? "Gaussian Fit" : "BFP Analysis"}
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
                                <div className="flex flex-col space-y-3">
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                                        <div className="text-gray-600 text-[10px] uppercase">Parameter</div>
                                        <div className="text-right text-gray-600 text-[10px] uppercase">Value</div>

                                        {params.NA <= params.n_sample ? (
                                            <div className="col-span-2 text-center text-gray-500 py-2">
                                                No SAF (NA &lt; n_sample)
                                            </div>
                                        ) : simResult?.saf_ratio !== undefined ? (
                                            <>
                                                <div className="text-brand-magenta font-mono font-bold">SAF Ratio</div>
                                                <div className="text-right font-mono text-white font-bold">
                                                    {Number(simResult.saf_ratio).toFixed(3)}
                                                </div>
                                                <div className="col-span-2 text-[10px] text-gray-500 italic mt-1">
                                                    Ratio = SAF / UAF Integration
                                                </div>
                                            </>
                                        ) : (
                                            <div className="col-span-2 text-center text-gray-500 py-2 animate-pulse">
                                                Calculating SAF...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div> {/* End Right Column */}

                </div>
            </div>
        </div>
    );
}
