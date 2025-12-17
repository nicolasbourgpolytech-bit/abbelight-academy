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
    oversampling: 3
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
    const { state, runSimulation } = usePyodide();
    const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
    const [simResult, setSimResult] = useState<any>(null);
    const [calculating, setCalculating] = useState(false);

    const psfCanvasRef = useRef<HTMLCanvasElement>(null);
    const bfpCanvasRef = useRef<HTMLCanvasElement>(null);

    // Run simulation when params change (debounced?)
    // For sliders like defocus, we want fast updates.
    // We'll use a separate effect for running.

    useEffect(() => {
        if (state === "READY" && !calculating) {
            const run = async () => {
                setCalculating(true);
                try {
                    const res = await runSimulation(params, {});
                    setSimResult(res);
                } catch (e) {
                    console.error(e);
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
        if (!simResult) return;

        const color = wavelengthToColor(params.lambda_vac);

        // 1. Draw PSF
        // img is a 2D array (list of lists in JS from Python list conversion? Or typed array?)
        // Pyodide toJs with 'false' proxies returns nested Map/Arrays.
        // If we used default converter:
        // 'img' is likely a JS Array of Arrays (rows).
        // Let's flatten it.

        const img = simResult.img;
        // Checks to handle Pyodide return types safely
        // Better to flatten in Python or handle here. 
        // Assuming img is array of arrays.
        const height = img.length;
        const width = img[0].length;
        const flatImg = new Float64Array(width * height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                flatImg[y * width + x] = img[y][x];
            }
        }

        if (psfCanvasRef.current) {
            drawMatrix(psfCanvasRef.current, flatImg, width, height, color);
        }

        // 2. Draw BFP
        const bfp = simResult.bfp;
        const hB = bfp.length;
        const wB = bfp[0].length;
        const flatBfp = new Float64Array(wB * hB);
        for (let y = 0; y < hB; y++) {
            for (let x = 0; x < wB; x++) {
                flatBfp[y * wB + x] = bfp[y][x];
            }
        }

        if (bfpCanvasRef.current) {
            drawMatrix(bfpCanvasRef.current, flatBfp, wB, hB, color);

            // Draw Critical Angle Overlay
            const ctx = bfpCanvasRef.current.getContext('2d');
            if (ctx && params.NA > params.n_sample) {
                const ext_bfp = simResult.ext_bfp; // [min, max, min, max]
                const radius_max_phys = ext_bfp[1]; // Max extent
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
            }
        }

    }, [simResult, params]);

    // Compute Profiles
    const profileData = useMemo(() => {
        if (!simResult) return [];
        const img = simResult.img;
        const midY = Math.floor(img.length / 2);
        const row = img[midY];

        return row.map((val: number, i: number) => ({
            x: i,
            intensity: val
        }));
    }, [simResult]);

    // Handlers
    const handleChangeRaw = (key: keyof SimulationParams, val: string) => {
        const num = parseFloat(val);
        if (!isNaN(num)) {
            setParams(p => ({ ...p, [key]: num }));
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
            {/* Sidebar Controls */}
            <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">

                {state === "LOADING" && (
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary animate-pulse">
                        Loading Simulation Engine...
                    </div>
                )}
                {state === "ERROR" && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                        Failed to load Simulator. Refresh page.
                    </div>
                )}

                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white">System Parameters</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400">NA</label>
                            <input
                                type="text"
                                value={params.NA}
                                onChange={e => handleChangeRaw('NA', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-primary/50 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400">Mag (M)</label>
                            <input
                                type="text"
                                value={params.M_obj}
                                onChange={e => handleChangeRaw('M_obj', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-primary/50 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400">n Immersion</label>
                            <input
                                type="text"
                                value={params.n_imm}
                                onChange={e => handleChangeRaw('n_imm', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-primary/50 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400">n Sample</label>
                            <input
                                type="text"
                                value={params.n_sample}
                                onChange={e => handleChangeRaw('n_sample', e.target.value)}
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
                        <div className="h-2 rounded w-full" style={{ backgroundColor: wavelengthToColor(params.lambda_vac) }}></div>
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
                    <div className="bg-black border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center relative group">
                        <span className="absolute top-4 left-4 text-xs font-mono text-gray-500 uppercase tracking-widest">PSF (Image Plane)</span>
                        <canvas
                            ref={psfCanvasRef}
                            className="max-w-full max-h-full aspect-square image-pixelated"
                            style={{ imageRendering: 'pixelated' }}
                        />
                        {/* Scale Bar could go here */}
                    </div>

                    {/* BFP View */}
                    <div className="bg-black border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center relative">
                        <span className="absolute top-4 left-4 text-xs font-mono text-gray-500 uppercase tracking-widest">Back Focal Plane</span>
                        <canvas
                            ref={bfpCanvasRef}
                            className="max-w-full max-h-full aspect-square"
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
        </div>
    );
}
