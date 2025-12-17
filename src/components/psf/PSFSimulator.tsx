"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { usePyodide } from './usePyodide';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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
    display_fov_um: 300
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
            // Twilight-ish map: Blue -> White -> Red
            // -PI to PI typically
            // Let's us a simple rainbow or just Cyclical
            // Simple Grayscale for now or simple diverging
            const v = (val + Math.PI) / (2 * Math.PI); // 0 to 1
            r = Math.floor(v * 255);
            g = Math.floor(v * 255);
            b = Math.floor(255 - v * 255); // Dummy map
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
    });

    const [simResult, setSimResult] = useState<any>(null);
    const [calculating, setCalculating] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);

    // Interactive Crosshair State (Indices in simulation array)
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

        const num = parseFloat(val);
        if (!isNaN(num) && val.trim() !== "" && !val.endsWith(".")) {
            setParams(prev => {
                if (prev[key as keyof SimulationParams] === num) return prev;
                return { ...prev, [key]: num };
            });
        }
    };

    // Run simulation
    useEffect(() => {
        if (state === "READY" && !calculating) {
            const run = async () => {
                setCalculating(true);
                setLastError(null);
                try {
                    const res = await runSimulation(params, {});
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

        // BFP Overlays
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

                ctx.font = "bold 12px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                const drawTextWithOutline = (text: string, x: number, y: number, color: string) => {
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = 'black';
                    ctx.strokeText(text, x, y);
                    ctx.fillStyle = color;
                    ctx.fillText(text, x, y);
                };

                drawTextWithOutline("Sub-critical", width / 2, height / 2, "#06b6d4");
                drawTextWithOutline("Super-critical", width / 2, 20, "#e879f9");
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

        const cx = crosshair ? crosshair.x : Math.floor(width / 2);
        const cy = crosshair ? crosshair.y : Math.floor(height / 2);

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
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
            {/* Sidebar Controls */}
            <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">

                {state === "LOADING" && (
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary animate-pulse text-xs">
                        Loading Simulation Engine (Pyodide)...
                    </div>
                )}
                {state === "ERROR" && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                        <strong>System Error:</strong><br />
                        {pyodideError || "Failed to load Simulator."}
                    </div>
                )}
                {lastError && (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500 text-xs break-words">
                        <strong>Simulation Error:</strong><br />
                        {lastError}
                    </div>
                )}

                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white flex justify-between items-center">
                        System
                        {calculating && <span className="text-xs text-primary animate-pulse">Computing...</span>}
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400">NA</label>
                            <input
                                type="text"
                                value={inputValues.NA}
                                onChange={e => handleInputChange('NA', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-primary/50 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400">Mag (M)</label>
                            <input
                                type="text"
                                value={inputValues.M_obj}
                                onChange={e => handleInputChange('M_obj', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-primary/50 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400">n Immersion</label>
                            <input
                                type="text"
                                value={inputValues.n_imm}
                                onChange={e => handleInputChange('n_imm', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-primary/50 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400">n Sample</label>
                            <input
                                type="text"
                                value={inputValues.n_sample}
                                onChange={e => handleInputChange('n_sample', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-primary/50 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400">Pixel Size (µm)</label>
                            <input
                                type="text"
                                value={inputValues.cam_pixel_um}
                                onChange={e => handleInputChange('cam_pixel_um', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-primary/50 outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-gray-400">Wavelength (nm): {(params.lambda_vac * 1e9).toFixed(0)}</label>
                        <input
                            type="range"
                            min="400" max="700" step="10"
                            value={params.lambda_vac * 1e9}
                            onChange={e => setParams(p => ({ ...p, lambda_vac: parseFloat(e.target.value) * 1e-9 }))}
                            className="w-full accent-primary h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="h-2 rounded w-full" style={{ background: SPECTRUM_GRADIENT }}></div>
                    </div>
                </div>

                <div className="w-full h-px bg-white/10" />

                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white">Aberrations</h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-xs text-gray-400">Defocus (µm)</label>
                                <span className="text-xs font-mono text-primary">{(params.z_defocus * 1e6).toFixed(2)}</span>
                            </div>
                            <input
                                type="range"
                                min="-2000" max="2000" step="50"
                                value={params.z_defocus * 1e9}
                                onChange={e => setParams(p => ({ ...p, z_defocus: parseFloat(e.target.value) * 1e-9 }))}
                                className="w-full accent-primary h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400">Astigmatism</label>
                            <div className="flex p-1 bg-white/5 rounded-lg">
                                {["None", "Weak", "Strong"].map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => setParams(p => ({ ...p, astigmatism: opt as any }))}
                                        className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${params.astigmatism === opt
                                            ? "bg-primary text-black font-medium shadow-sm"
                                            : "text-gray-400 hover:text-white"
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
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('psf')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'psf' ? 'bg-black text-white border border-white/20' : 'bg-transparent text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        PSF Image plane
                    </button>
                    <button
                        onClick={() => setActiveTab('bfp')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'bfp' ? 'bg-black text-white border border-white/20' : 'bg-transparent text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        BFP Image plane
                    </button>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-[1fr_240px] grid-rows-[1fr_240px] gap-4 w-full h-full min-h-0">

                    {/* 1. Main Canvas (Top-Left) */}
                    <div className="bg-black border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden group">
                        <span className="absolute top-4 left-4 text-xs font-mono text-gray-500 uppercase tracking-widest pointer-events-none">
                            {activeTab === 'psf' ? 'PSF (Image Plane)' : 'Back Focal Plane'}
                        </span>

                        <div className="relative h-full aspect-square">
                            <canvas
                                ref={psfCanvasRef}
                                onClick={handleCanvasClick}
                                className="w-full h-full image-pixelated cursor-crosshair block"
                                style={{ imageRendering: 'pixelated' }}
                            />

                            {/* Crosshair Overlay */}
                            {profileAnalysis && (
                                <>
                                    {/* Horizontal Line */}
                                    <div
                                        className="absolute w-full border-t border-white/50 border-dashed pointer-events-none transition-all duration-75"
                                        style={{
                                            top: `${((profileAnalysis.cy + 0.5) / profileAnalysis.height) * 100}%`,
                                            left: 0
                                        }}
                                    />
                                    {/* Vertical Line */}
                                    <div
                                        className="absolute h-full border-l border-white/50 border-dashed pointer-events-none transition-all duration-75"
                                        style={{
                                            left: `${((profileAnalysis.cx + 0.5) / profileAnalysis.width) * 100}%`,
                                            top: 0
                                        }}
                                    />
                                </>
                            )}
                        </div>

                        <div className="absolute bottom-4 left-4 text-[10px] font-mono text-gray-500 bg-black/50 px-2 py-1 rounded pointer-events-none">
                            {activeTab === 'psf'
                                ? `Size: ${(params.display_fov_um || 300).toFixed(0)} µm`
                                : `NA: ${params.NA.toFixed(2)}`
                            }
                        </div>
                    </div>

                    {/* 2. Vertical Profile (Top-Right) */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 relative flex flex-col min-h-0">
                        <span className="absolute top-2 -right-2 rotate-90 origin-top-right text-xs font-mono text-gray-500 uppercase tracking-widest whitespace-nowrap">
                            Y-Profile (x={profileAnalysis?.cx ?? '-'})
                        </span>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart layout="vertical" data={profileAnalysis?.vData || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                    {/* X Axis is Value (Intensity) */}
                                    <XAxis type="number" hide domain={[0, 'auto']} />
                                    {/* Y Axis is Index, reversed to match image top-down */}
                                    <YAxis dataKey="y" type="number" hide reversed domain={[0, 'dataMax']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '10px' }}
                                        itemStyle={{ color: '#fff' }}
                                        cursor={{ stroke: '#555' }}
                                    />
                                    {activeTab === 'psf' && (
                                        <Line dataKey="fit" type="monotone" stroke="#888" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
                                    )}
                                    <Line dataKey="intensity" type="monotone" stroke={wavelengthToColor(params.lambda_vac)} strokeWidth={2} dot={false} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 3. Horizontal Profile (Bottom-Left) */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 relative flex flex-col min-h-0">
                        <span className="absolute top-2 left-4 text-xs font-mono text-gray-500 uppercase tracking-widest">
                            X-Profile (y={profileAnalysis?.cy ?? '-'})
                        </span>
                        <div className="flex-1 w-full min-h-0 pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={profileAnalysis?.hData || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="x" hide />
                                    <YAxis hide domain={[0, 'auto']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '10px' }}
                                        itemStyle={{ color: '#fff' }}
                                        cursor={{ stroke: '#555' }}
                                    />
                                    {activeTab === 'psf' && (
                                        <Line dataKey="fit" type="monotone" stroke="#888" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
                                    )}
                                    <Line dataKey="intensity" type="monotone" stroke={wavelengthToColor(params.lambda_vac)} strokeWidth={2} dot={false} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 4. Stats Panel (Bottom-Right) */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-center gap-3">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-white/10 pb-1">
                            {activeTab === 'psf' ? "Gaussian Fit (Pixels)" : "Analysis"}
                        </h4>

                        {activeTab === 'psf' ? (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                <div className="text-gray-500">Parameter</div>
                                <div className="text-right text-gray-500 font-mono">Value</div>

                                <div className="text-cyan-400">Sigma X</div>
                                <div className="text-right font-mono text-white">
                                    {profileAnalysis?.hStats?.sigma.toFixed(2) ?? '-'}
                                </div>

                                <div className="text-pink-400">Sigma Y</div>
                                <div className="text-right font-mono text-white">
                                    {profileAnalysis?.vStats?.sigma.toFixed(2) ?? '-'}
                                </div>

                                <div className="col-span-2 h-px bg-white/10 my-1" />

                                <div className="text-gray-400">FWHM X</div>
                                <div className="text-right font-mono text-white">
                                    {profileAnalysis?.hStats?.fwhm.toFixed(2) ?? '-'}
                                </div>
                                <div className="text-gray-400">FWHM Y</div>
                                <div className="text-right font-mono text-white">
                                    {profileAnalysis?.vStats?.fwhm.toFixed(2) ?? '-'}
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-gray-500 italic text-center">
                                Fitting disabled for BFP. <br />
                                Use crosshair to inspect intensity profiles.
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* DEBUG SECTION */}
            <div className="fixed bottom-0 right-0 p-2 bg-black/80 text-[10px] text-gray-500 pointer-events-none z-50">
                State: {state} | Result: {simResult ? "Yes" : "No"} | Computing: {calculating ? "Yes" : "No"}
            </div>
        </div>
    );
}
