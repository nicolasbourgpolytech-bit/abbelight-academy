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

// --- Components ---

export default function PSFSimulator() {
    const { state, runSimulation, error: pyodideError } = usePyodide();
    const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);

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

    const psfCanvasRef = useRef<HTMLCanvasElement>(null);
    const bfpCanvasRef = useRef<HTMLCanvasElement>(null);

    // Sync inputValues to params when valid number is typed
    const handleInputChange = (key: keyof typeof inputValues, val: string) => {
        setInputValues(prev => ({ ...prev, [key]: val }));

        const num = parseFloat(val);
        if (!isNaN(num) && val.trim() !== "" && !val.endsWith(".")) {
            setParams(prev => {
                // Key needs casting because inputValues keys match SimulationParams keys partially
                if (prev[key as keyof SimulationParams] === num) return prev;
                return { ...prev, [key]: num };
            });
        }
    };

    // Run simulation when params change (debounced?)
    // For sliders like defocus, we want fast updates.
    // We'll use a separate effect for running.

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
            // Debounce slightly
            const timer = setTimeout(run, 50);
            return () => clearTimeout(timer);
        }
    }, [state, params]); // Adding runSimulation to deps might cause issues if it's not stable, assuming it is.

    // Effect to Draw
    useEffect(() => {
        // ... (Drawing logic remains same, just ensuring we don't break it)
        if (!simResult) return;

        const color = wavelengthToColor(params.lambda_vac);

        // 1. Draw PSF
        const img = simResult.img;
        if (psfCanvasRef.current) {
            // Flatten img (Array of Arrays)
            const height = img.length;
            const width = img[0]?.length || 0;
            if (width > 0) {
                const flatImg = new Float64Array(width * height);
                for (let y = 0; y < height; y++) {
                    const row = img[y];
                    for (let x = 0; x < width; x++) {
                        flatImg[y * width + x] = row[x];
                    }
                }
                drawMatrix(psfCanvasRef.current, flatImg, width, height, color);
            }
        }

        // 2. Draw BFP
        const bfp = simResult.bfp; // Array of Arrays
        if (bfpCanvasRef.current) {
            const hB = bfp.length;
            const wB = bfp[0]?.length || 0;
            if (wB > 0) {
                const flatBfp = new Float64Array(wB * hB);
                for (let y = 0; y < hB; y++) {
                    const row = bfp[y];
                    for (let x = 0; x < wB; x++) {
                        flatBfp[y * wB + x] = row[x];
                    }
                }
                drawMatrix(bfpCanvasRef.current, flatBfp, wB, hB, color);

                // Draw Critical Angle Overlay
                const ctx = bfpCanvasRef.current.getContext('2d');
                if (ctx && params.NA > params.n_sample) {
                    const radius_max_phys = simResult.ext_bfp[1]; // Max extent
                    // R_crit = R_max * (n_sample / NA)
                    const ratio = params.n_sample / params.NA;
                    // In pixels, R_max corresponds to width/2
                    const r_pix_max = wB / 2;
                    const r_crit_pix = r_pix_max * ratio;

                    ctx.beginPath();
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
                    ctx.setLineDash([5, 5]);
                    ctx.arc(wB / 2, hB / 2, r_crit_pix, 0, 2 * Math.PI);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // Add Labels
                    ctx.font = "10px monospace";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";

                    // Sub-critical (Inside)
                    ctx.fillStyle = "rgba(6, 182, 212, 0.8)"; // Cyan-ish
                    ctx.fillText("Sub-critical", wB / 2, hB / 2);

                    // Super-critical (Outside)
                    // Draw slightly above the circle? Or at the top edge.
                    // r_crit_pix is radius.
                    const r_label = (r_crit_pix + (wB / 2)) / 2; // Midpoint between crit and max?
                    // actually user snippet puts it at (crit + max)/2

                    ctx.fillStyle = "rgba(236, 72, 153, 0.8)"; // Pink-ish
                    // Check if Super-critical region exists (it must if NA > n_sample)
                    // Place it near the top of the ring
                    ctx.fillText("Super-critical", wB / 2, 10);
                }
            }
        }

    }, [simResult, params]);

    // Compute Profiles
    const profileData = useMemo(() => {
        if (!simResult) return [];
        const img = simResult.img;
        if (!img || img.length === 0) return [];
        const midY = Math.floor(img.length / 2);
        const row = img[midY];
        if (!row) return [];

        return row.map((val: number, i: number) => ({
            x: i,
            intensity: val
        }));
    }, [simResult]);

    // Handlers
    // handleChangeRaw removed in favor of handleInputChange above

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
                        {/* FOV input removed as requested */}
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
                        {/* Spectrum Gradient Bar */}
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
                                min="-2000" max="2000" step="50" // nanometers -> converts to meters
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

            {/* Main Visuals */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-[300px]">
                    {/* PSF View */}
                    <div className="bg-black border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center relative group aspect-square">
                        <span className="absolute top-4 left-4 text-xs font-mono text-gray-500 uppercase tracking-widest">PSF (Image Plane)</span>
                        <canvas
                            ref={psfCanvasRef}
                            className="w-full h-full aspect-square image-pixelated"
                            style={{ imageRendering: 'pixelated' }}
                        />
                        {/* Dynamic Scale Overlay */}
                        <div className="absolute bottom-4 left-4 text-[10px] font-mono text-gray-500 bg-black/50 px-2 py-1 rounded">
                            Size: {(params.display_fov_um || 300).toFixed(0)} µm
                        </div>
                    </div>

                    {/* BFP View */}
                    <div className="bg-black border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center relative aspect-square">
                        <span className="absolute top-4 left-4 text-xs font-mono text-gray-500 uppercase tracking-widest">Back Focal Plane</span>
                        <canvas
                            ref={bfpCanvasRef}
                            className="w-full h-full aspect-square"
                        />
                        <div className="absolute bottom-4 right-4 text-[10px] text-gray-500 text-right">
                            Dashed: Critical Angle <br />
                            (NA {">"} n_sample)
                        </div>
                    </div>
                </div>

                {/* Profile Graph */}
                <div className="h-48 bg-white/5 border border-white/10 rounded-2xl p-4 relative">
                    <span className="absolute top-2 left-4 text-xs font-mono text-gray-500 uppercase tracking-widest">X-Profile</span>
                    <div className="w-full h-full pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={profileData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="x" hide />
                                <YAxis hide domain={[0, 'auto']} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="intensity"
                                    stroke={wavelengthToColor(params.lambda_vac)}
                                    strokeWidth={2}
                                    dot={false}
                                    isAnimationActive={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* DEBUG SECTION */}
            <div className="fixed bottom-0 right-0 p-2 bg-black/80 text-[10px] text-gray-500 pointer-events-none z-50">
                State: {state} | Result: {simResult ? "Yes" : "No"} | Computing: {calculating ? "Yes" : "No"}
                <br />
                {simResult && `Image: ${simResult.img?.length}x${simResult.img?.[0]?.length}`}
            </div>
        </div>
    );
}
