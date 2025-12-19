"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { usePyodide } from './usePyodide';
import { ComposedChart, Bar, BarChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList } from 'recharts';

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
    const t = (val + Math.PI) / (2 * Math.PI);
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

// --- Accordion Component ---
const AccordionSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="glass-card !p-0 overflow-hidden shrink-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
            >
                <span className="text-sm font-bold text-white uppercase tracking-widest">{title}</span>
                <span className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L5 5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
            </button>
            {isOpen && <div className="p-4 border-t border-white/10">{children}</div>}
        </div>
    );
};

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

    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }

    const imgData = ctx.createImageData(width, height);
    const buf = imgData.data;

    let min = Infinity, max = -Infinity;
    for (let i = 0; i < data.length; i++) {
        if (data[i] < min) min = data[i];
        if (data[i] > max) max = data[i];
    }
    const range = max - min || 1;

    const r_feat = parseInt(colorHex.slice(1, 3), 16);
    const g_feat = parseInt(colorHex.slice(3, 5), 16);
    const b_feat = parseInt(colorHex.slice(5, 7), 16);

    for (let i = 0; i < data.length; i++) {
        const val = data[i];

        let r, g, b;
        if (isPhase) {
            [r, g, b] = getTwilightColor(val);
        } else {
            const norm = (val - min) / range;
            r = Math.floor(norm * r_feat);
            g = Math.floor(norm * g_feat);
            b = Math.floor(norm * b_feat);
        }

        const idx = i * 4;
        buf[idx] = r;
        buf[idx + 1] = g;
        buf[idx + 2] = b;
        buf[idx + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
}

function calculateGaussStats(data: number[]) {
    if (!data || data.length === 0) return null;
    let min = Infinity, max = -Infinity;
    let maxIdx = -1;
    for (let i = 0; i < data.length; i++) {
        const v = data[i];
        if (v < min) min = v;
        if (v > max) { max = v; maxIdx = i; }
    }
    const bg = min;
    const amplitude = max - bg;
    const halfMax = bg + amplitude / 2;
    if (amplitude <= 0) return { min, max, bg, center: maxIdx, sigma: 0, fwhm: 0, amplitude: 0 };

    let leftX = maxIdx;
    for (let i = maxIdx; i >= 0; i--) {
        if (data[i] < halfMax) {
            const y0 = data[i];
            const y1 = data[i + 1];
            leftX = i + (halfMax - y0) / (y1 - y0);
            break;
        }
    }
    let rightX = maxIdx;
    for (let i = maxIdx; i < data.length; i++) {
        if (data[i] < halfMax) {
            const y1 = data[i];
            const y0 = data[i - 1];
            rightX = (i - 1) + (halfMax - y0) / (y1 - y0);
            break;
        }
    }
    if (leftX === maxIdx) leftX = 0;
    if (rightX === maxIdx) rightX = data.length - 1;
    const fwhm = rightX - leftX;
    const sigma = fwhm / 2.355;
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

function calculateSAFRatio(bfpData: number[][], NA: number, n_sample: number): number {
    if (!bfpData || !bfpData.length || NA <= n_sample) return 0;
    const h = bfpData.length;
    const w = bfpData[0].length;
    const cx = w / 2;
    const cy = h / 2;
    const r_max = w / 2; // Pupil Edge ~ NA
    const crit_ratio = n_sample / NA;
    const r_crit_sq = (r_max * crit_ratio) ** 2;
    const r_max_sq = r_max ** 2;

    let sumSAF = 0;
    let sumTotal = 0;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const val = bfpData[y][x];
            const r2 = (x - cx) ** 2 + (y - cy) ** 2;

            if (r2 <= r_max_sq) {
                sumTotal += val;
                if (r2 > r_crit_sq) {
                    sumSAF += val;
                }
            }
        }
    }
    return sumTotal > 0 ? (sumSAF / sumTotal) : 0;
}

// --- Analyzed View Component ---
interface AnalyzedViewProps {
    title: React.ReactNode;
    dataGrid: number[][] | undefined;
    color: string;
    crosshair: { x: number, y: number } | null;
    onCanvasClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    isPhase?: boolean;
    overlays?: React.ReactNode;
    bottomRightInfo?: (analysis: any) => React.ReactNode;
    yAxisUnit?: string; // "Intensity" or "Rad"
    params?: SimulationParams; // For Pixel/NM conversion in profiles
    fitProfiles?: boolean; // Whether to attempt Gaussian fit
}

const AnalyzedView: React.FC<AnalyzedViewProps> = ({
    title, dataGrid, color, crosshair, onCanvasClick, isPhase = false, overlays, bottomRightInfo, yAxisUnit = "Intensity", params, fitProfiles = false
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Draw Effect
    useEffect(() => {
        if (!canvasRef.current || !dataGrid || dataGrid.length === 0) return;
        const h = dataGrid.length;
        const w = dataGrid[0].length;
        const flat = new Float64Array(w * h);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                flat[y * w + x] = dataGrid[y][x];
            }
        }
        drawMatrix(canvasRef.current, flat, w, h, color, isPhase);
    }, [dataGrid, color, isPhase]);

    // Profile Calculation
    const analysis = useMemo(() => {
        if (!dataGrid || dataGrid.length === 0) return null;
        const h = dataGrid.length;
        const w = dataGrid[0].length;
        const cx = crosshair ? Math.min(Math.max(crosshair.x, 0), w - 1) : Math.floor(w / 2);
        const cy = crosshair ? Math.min(Math.max(crosshair.y, 0), h - 1) : Math.floor(h / 2);

        // Profiles
        const row = dataGrid[cy] ? Array.from(dataGrid[cy]) : new Array(w).fill(0);
        const col = new Array(h);
        for (let y = 0; y < h; y++) col[y] = dataGrid[y] ? dataGrid[y][cx] : 0;

        // Stats
        let hStats = null, vStats = null, hFit: any[] = [], vFit: any[] = [];
        if (fitProfiles && !isPhase) { // Only fit intensity
            hStats = calculateGaussStats(row);
            vStats = calculateGaussStats(col);
            hFit = generateGaussCurve(w, hStats);
            vFit = generateGaussCurve(h, vStats);
        }

        const hMax = isPhase ? Math.PI : Math.max(...row); // For phase, scale to PI? Or just auto
        const vMax = isPhase ? Math.PI : Math.max(...col);

        const hData = row.map((v, i) => ({ x: i, val: v, fit: hFit[i]?.fit }));
        const vData = col.map((v, i) => ({ y: i, val: v, fit: vFit[i]?.fit }));

        return { hData, vData, cx, cy, w, h, hMax, vMax, hStats, vStats };
    }, [dataGrid, crosshair, fitProfiles, isPhase]);

    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!analysis || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const scaleX = analysis.w / rect.width;
        const scaleY = analysis.h / rect.height;
        // Logic handled in parent? No, we need to pass transformed coords back? 
        // Actually parent handles crosshair state, but needs image coords.
        // Let's pass the raw event to parent, handled there using refs?
        // Reuse the logic from original component.
        // Better: AnalyzedView should handle the coordination? 
        // For simplicity, let's keep the coordinate logic in parent or duplicate it here?
        // I will keep logic in parent for now, parent passes handler.
        onCanvasClick(e);
    };

    const wrapperRef = useRef<HTMLDivElement>(null);
    const [gridSize, setGridSize] = useState<number | null>(null);

    // Resize Observer to force Square Aspect Ratio
    useEffect(() => {
        if (!wrapperRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                // Calculate max square size that fits
                // We want to fill as much as possible, but keep 1:1
                const size = Math.min(width, height);
                setGridSize(size);
            }
        });
        resizeObserver.observe(wrapperRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    return (
        // Wrapper that fills the parent
        <div ref={wrapperRef} className="w-full h-full flex items-start justify-center overflow-hidden">
            <div className="grid gap-4 mx-auto"
                style={{
                    width: gridSize ? `${gridSize}px` : '100%',
                    height: gridSize ? `${gridSize}px` : '100%',
                    gridTemplateColumns: 'minmax(0, 1fr) 200px',
                    gridTemplateRows: 'minmax(0, 1fr) 200px',
                    // Fallback if JS hasn't run yet
                    aspectRatio: '1 / 1'
                }}
            >
                {/* 1. TOP LEFT: IMAGE */}
                <div className="relative w-full h-full bg-black/20 border border-white/10 group overflow-hidden aspect-square flex items-center justify-center" ref={containerRef}>
                    <div className="absolute top-0 left-0 right-0 p-2 z-10 flex justify-between items-start pointer-events-none">
                        {title}
                    </div>

                    <canvas
                        ref={canvasRef}
                        onClick={onCanvasClick}
                        className="w-full h-full aspect-square object-contain image-pixelated cursor-crosshair block shadow-2xl shadow-black/50"
                        style={{ imageRendering: 'pixelated' }}
                    />

                    {/* Overlays */}
                    {overlays}

                    {/* Crosshair */}
                    {analysis && (
                        <>
                            <div className="absolute w-full border-t border-white/30 border-dashed pointer-events-none"
                                style={{ top: `${((analysis.cy + 0.5) / analysis.h) * 100}%`, left: 0 }} />
                            <div className="absolute h-full border-l border-white/30 border-dashed pointer-events-none"
                                style={{ left: `${((analysis.cx + 0.5) / analysis.w) * 100}%`, top: 0 }} />
                        </>
                    )}
                </div>

                {/* 2. TOP RIGHT: Y-PROFILE */}
                <div className="glass-card !p-0 relative flex flex-col w-full h-full min-h-0 border-l border-white/10">
                    <span className="absolute top-2 left-2 text-[10px] font-mono text-gray-500 uppercase tracking-widest z-10">
                        {yAxisUnit} (Y)
                    </span>
                    <div className="flex-1 w-full min-h-0 pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart layout="vertical" data={analysis?.vData || []} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                                <YAxis dataKey="y" type="number" hide reversed domain={[0, 'dataMax']} />
                                <XAxis type="number" hide domain={isPhase ? [-Math.PI, Math.PI] : [0, 'auto']} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px', color: '#fff' }}
                                    formatter={(val: number) => [val.toFixed(2), "Intensity"]}
                                    labelFormatter={(label) => `Y-Pos: ${label}`}
                                    itemStyle={{ color: '#fff' }}
                                />
                                {/* For Phase, use Line? Or Area? Bar works. */}
                                <Bar dataKey="val" isAnimationActive={false}>
                                    {analysis?.vData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={color} fillOpacity={isPhase ? 1 : (analysis.vMax ? entry.val / analysis.vMax : 0.5)} />
                                    ))}
                                </Bar>
                                {fitProfiles && <Line dataKey="fit" stroke="#fff" strokeDasharray="3 3" dot={false} isAnimationActive={false} />}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. BOTTOM LEFT: X-PROFILE */}
                <div className="glass-card !p-0 relative flex flex-col w-full h-full min-h-0 border-t border-white/10">
                    <span className="absolute top-2 left-2 text-[10px] font-mono text-gray-500 uppercase tracking-widest z-10">
                        {yAxisUnit} (X)
                    </span>
                    <div className="flex-1 w-full min-h-0 pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={analysis?.hData || []} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                                <XAxis dataKey="x" hide />
                                <YAxis hide domain={isPhase ? [-Math.PI, Math.PI] : [0, 'auto']} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px', color: '#fff' }}
                                    formatter={(val: number) => [val.toFixed(2), "Intensity"]}
                                    labelFormatter={(label) => `X-Pos: ${label}`}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="val" isAnimationActive={false}>
                                    {analysis?.hData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={color} fillOpacity={isPhase ? 1 : (analysis.hMax ? entry.val / analysis.hMax : 0.5)} />
                                    ))}
                                </Bar>
                                {fitProfiles && <Line dataKey="fit" stroke="#ef4444" dot={false} strokeWidth={2} isAnimationActive={false} />}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 4. BOTTOM RIGHT: INFO */}
                <div className="glass-card !p-2 flex flex-col justify-center w-full h-full overflow-hidden">
                    {bottomRightInfo && bottomRightInfo(analysis)}
                </div>
            </div>
        </div>
    );
};


export default function PSFSimulator() {
    const { state, runSimulation, error: pyodideError } = usePyodide();
    const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);

    // View States
    const [psfCrosshair, setPsfCrosshair] = useState<{ x: number, y: number } | null>(null);
    const [bfpCrosshair, setBfpCrosshair] = useState<{ x: number, y: number } | null>(null);
    const [bfpMode, setBfpMode] = useState<"intensity" | "phase">("intensity");

    // Inputs
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

    // Effect: Run Simulation
    useEffect(() => {
        if (state === "READY" && !calculating) {
            const run = async () => {
                setCalculating(true);
                setLastError(null);
                try {
                    const z_shift = -params.depth * Math.pow(params.n_imm / params.n_sample, 2);
                    const z_total = params.z_defocus + z_shift;
                    const simArgs = { ...params, z_defocus: z_total };
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

    // Handlers
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

    // Click Handlers (Crosshair)
    const handlePsfClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!simResult?.img) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const w = simResult.img[0].length;
        const h = simResult.img.length;
        setPsfCrosshair({ x: Math.floor(x * (w / rect.width)), y: Math.floor(y * (h / rect.height)) });
    };

    const handleBfpClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const data = bfpMode === "intensity" ? simResult?.bfp : simResult?.bfp_phase;
        if (!data) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const w = data[0].length;
        const h = data.length;
        setBfpCrosshair({ x: Math.floor(x * (w / rect.width)), y: Math.floor(y * (h / rect.height)) });
    };



    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-80px)] w-full overflow-hidden font-sans justify-center relative">
            {/* Sidebar Controls */}
            {/* Sidebar Controls */}
            {/* Sidebar Controls */}
            {/* Sidebar Controls */}
            <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar h-full pt-[58px] pb-4">
                {state === "ERROR" && (
                    <div className="p-4 bg-red-900/20 border border-red-500 text-red-500 text-xs font-mono">
                        <strong>ERROR:</strong> {pyodideError || "Simulator failed."}
                    </div>
                )}

                <AccordionSection title="Objective lens parameters">
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
                </AccordionSection>

                <AccordionSection title="Sample parameters">
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
                                            setParams(p => ({ ...p, depth: val * 1e-9 }));
                                            (e.target as HTMLInputElement).blur();
                                        }
                                    }
                                }}
                                className="w-full bg-transparent border-b border-white/20 px-0 py-1 text-sm text-brand-cyan font-mono focus:border-brand-cyan focus:outline-none transition-colors"
                            />
                            <div className="grid grid-cols-3 gap-2 pt-2">
                                {[0, 500, 1000, 3000, 5000].map((d_nm) => (
                                    <button
                                        key={d_nm}
                                        onClick={() => {
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
                </AccordionSection>

                <AccordionSection title={`Camera & Aberrations ${calculating ? '(Running...)' : ''}`}>
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
                        <div className="space-y-2 pt-2 border-t border-white/10">
                            <div className="flex justify-between">
                                <label className="text-xs text-gray-500 uppercase tracking-wider">Defocus</label>
                                <span className="text-xs font-mono text-brand-cyan">{(params.z_defocus * 1e6).toFixed(2)} µm</span>
                            </div>
                            {(() => {
                                const limitNm = (4 * params.n_imm * params.lambda_vac / (params.NA ** 2)) * 1e9;
                                return (
                                    <input
                                        type="range"
                                        min={-limitNm} max={limitNm} step={limitNm / 50}
                                        value={params.z_defocus * 1e9}
                                        onChange={e => setParams(p => ({ ...p, z_defocus: parseFloat(e.target.value) * 1e-9 }))}
                                        className="w-full accent-brand-cyan h-1 bg-white/10 appearance-none cursor-pointer"
                                    />
                                );
                            })()}
                        </div>
                        <div className="space-y-2">
                            <button
                                onClick={() => setParams(p => ({ ...p, z_defocus: 0 }))}
                                className="w-full py-1 text-[10px] border border-white/20 hover:bg-white/10 uppercase tracking-wider"
                            >
                                Reset Defocus
                            </button>
                        </div>
                        <div className="space-y-2 pt-2 border-t border-white/10">
                            <label className="text-xs text-gray-500 uppercase tracking-wider">Astigmatism</label>
                            <div className="flex border border-white/20">
                                {["None", "Weak", "Strong"].map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => setParams(p => ({ ...p, astigmatism: opt as any }))}
                                        className={`flex-1 text-[10px] py-1 uppercase tracking-wide transition-all ${params.astigmatism === opt
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
                </AccordionSection>
            </div>

            {/* Main Content Area: Side-by-Side Views */}
            <div className="flex-1 w-full flex flex-col pt-[58px] pb-4 overflow-hidden overflow-y-auto custom-scrollbar min-[1700px]:overflow-hidden h-full">
                <div className="w-full max-w-[1600px] mx-auto h-auto min-[1700px]:h-full flex flex-col min-[1700px]:flex-row gap-4 px-4 pb-4 pt-0 min-w-0">

                    {/* LEFT: PSF View */}
                    <div className="w-full aspect-square min-[1700px]:aspect-auto min-[1700px]:h-full min-[1700px]:flex-1 min-[1700px]:min-w-[400px] flex items-start justify-center overflow-hidden p-2">
                        <AnalyzedView
                            title={<span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest pointer-events-auto">Primary View</span>}
                            dataGrid={simResult?.img}
                            color={wavelengthToColor(params.lambda_vac)}
                            crosshair={psfCrosshair}
                            onCanvasClick={handlePsfClick}
                            params={params}
                            fitProfiles={true} // Intensity profiles fitted
                            overlays={
                                /* Parameter Overlay (Bottom Left) */
                                <div className="absolute bottom-2 left-2 p-3 bg-black/60 backdrop-blur border border-white/10 text-[11px] font-mono text-brand-cyan pointer-events-none z-20 space-y-1 shadow-xl">
                                    <div className="font-bold border-b border-brand-cyan/20 mb-1.5 pb-0.5 text-white text-xs">PARAMETERS</div>
                                    <div className="flex gap-4 justify-between"><span>NA:</span> <span className="text-white">{params.NA}</span></div>
                                    <div className="flex gap-4 justify-between"><span>Mag:</span> <span className="text-white">{params.M_obj}x</span></div>
                                    <div className="flex gap-4 justify-between"><span>λ:</span> <span className="text-white">{(params.lambda_vac * 1e9).toFixed(0)} nm</span></div>
                                    <div className="flex gap-4 justify-between"><span>Defocus:</span> <span className="text-white">{(params.z_defocus * 1e6).toFixed(2)} µm</span></div>
                                    <div className="flex gap-4 justify-between"><span>FOV:</span> <span className="text-white">{params.display_fov_um} µm</span></div>
                                </div>
                            }
                            bottomRightInfo={(analysis) => (
                                <div className="space-y-2 p-2 w-full">
                                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-white/10 pb-1">Gaussian Fit</h4>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs w-full">
                                        <div className="text-gray-500 text-[10px] uppercase">Parameter</div>
                                        <div className="text-right text-gray-500 text-[10px] uppercase">nm</div>

                                        <div className="text-brand-cyan font-mono">σ (X)</div>
                                        <div className="text-right font-mono text-white">
                                            {(analysis?.hStats?.sigma
                                                ? (analysis.hStats.sigma * (params.cam_pixel_um / params.M_obj) * 1.5 * 1000)
                                                : 0).toFixed(1)}
                                        </div>

                                        <div className="text-brand-magenta font-mono">σ (Y)</div>
                                        <div className="text-right font-mono text-white">
                                            {(analysis?.vStats?.sigma
                                                ? (analysis.vStats.sigma * (params.cam_pixel_um / params.M_obj) * 1.5 * 1000)
                                                : 0).toFixed(1)}
                                        </div>

                                        <div className="col-span-2 h-px bg-white/5 my-1" />

                                        <div className="text-gray-500 font-mono">FWHM X</div>
                                        <div className="text-right font-mono text-white">
                                            {(analysis?.hStats?.fwhm
                                                ? (analysis.hStats.fwhm * (params.cam_pixel_um / params.M_obj) * 1.5 * 1000)
                                                : 0).toFixed(1)}
                                        </div>

                                        <div className="text-gray-500 font-mono">FWHM Y</div>
                                        <div className="text-right font-mono text-white">
                                            {(analysis?.vStats?.fwhm
                                                ? (analysis.vStats.fwhm * (params.cam_pixel_um / params.M_obj) * 1.5 * 1000)
                                                : 0).toFixed(1)}
                                        </div>
                                    </div>
                                </div>
                            )}
                        />
                    </div>

                    {/* RIGHT: BFP View */}
                    <div className="w-full aspect-square min-[1700px]:aspect-auto min-[1700px]:h-full min-[1700px]:flex-1 min-[1700px]:min-w-[400px] flex items-start justify-center overflow-hidden p-2">
                        <AnalyzedView
                            title={
                                <div className="flex gap-2 pointer-events-auto items-center">
                                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">BFP View</span>
                                    {/* Toggle */}
                                    <div className="flex bg-white/10 rounded overflow-hidden border border-white/10">
                                        <button
                                            onClick={() => setBfpMode("intensity")}
                                            className={`px-2 py-0.5 text-[9px] uppercase font-bold transition-all ${bfpMode === "intensity" ? "bg-brand-cyan text-black" : "hover:bg-white/20 text-gray-400"}`}
                                        >
                                            Intensity
                                        </button>
                                        <button
                                            onClick={() => setBfpMode("phase")}
                                            className={`px-2 py-0.5 text-[9px] uppercase font-bold transition-all ${bfpMode === "phase" ? "bg-brand-magenta text-black" : "hover:bg-white/20 text-gray-400"}`}
                                        >
                                            Phase
                                        </button>
                                    </div>
                                </div>
                            }
                            dataGrid={bfpMode === "intensity" ? simResult?.bfp : simResult?.bfp_phase}
                            color={bfpMode === "intensity" ? wavelengthToColor(params.lambda_vac) : "#ffffff"}
                            crosshair={bfpCrosshair}
                            onCanvasClick={handleBfpClick}
                            isPhase={bfpMode === "phase"}
                            yAxisUnit={bfpMode === "phase" ? "Rad" : "Int"}
                            fitProfiles={false}
                            overlays={
                                <>
                                    {/* Phase Colormap */}
                                    {bfpMode === "phase" && (
                                        <div className="absolute top-2 right-2 flex flex-col bg-black/60 border border-white/10 p-2 z-20 shadow-lg backdrop-blur">
                                            <div className="w-32 h-4 rounded-sm mb-1" style={{ background: "linear-gradient(to right, white, #4169E1, black, #DC143C, white)" }}></div>
                                            <div className="flex justify-between text-[10px] font-mono text-gray-300 w-32 font-bold">
                                                <span>-π</span>
                                                <span>0</span>
                                                <span>+π</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* SAF / UAF Visualization for Intensity */}
                                    {bfpMode === "intensity" && params.NA > params.n_sample && (
                                        <>
                                            {/* Critical Angle Ring */}
                                            <div
                                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40 border-dashed pointer-events-none z-10 box-border shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                                                style={{
                                                    width: `${(params.n_sample / params.NA) * 100}%`,
                                                    height: `${(params.n_sample / params.NA) * 100}%`
                                                }}
                                            />
                                            {/* Labels: SAF is OUTSIDE, UAF is INSIDE */}
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/30 font-bold text-2xl pointer-events-none select-none">UAF</div>
                                        </>
                                    )}
                                </>
                            }
                            bottomRightInfo={() => (
                                <div className="w-full h-full flex flex-col relative overflow-hidden">
                                    {bfpMode === "intensity" ? (
                                        <div className="flex flex-col items-center justify-center h-full gap-2">
                                            <span className="text-sm text-brand-cyan uppercase tracking-widest font-bold">SAF Ratio</span>
                                            <span className="text-2xl font-mono text-white font-light">
                                                {(simResult?.saf_ratio !== undefined ? simResult.saf_ratio * 100 : 0).toFixed(1)}%
                                            </span>
                                        </div>
                                    ) : (
                                        simResult?.stats && (
                                            <div className="w-full h-full relative p-2">
                                                <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block absolute top-2 left-2">Aberration Power (PV) [rad]</span>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={[
                                                        { name: 'Depth', val: simResult.stats.Depth, fill: '#06b6d4' },
                                                        { name: 'Def', val: simResult.stats.Defocus, fill: '#22c55e' },
                                                        { name: 'Astig', val: simResult.stats.Astig, fill: '#c026d3' },
                                                        { name: 'Collar', val: simResult.stats.Collar, fill: '#eab308' },
                                                    ]} margin={{ top: 30, bottom: 0 }}>
                                                        <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#fff' }} interval={0} stroke="none" />
                                                        <Tooltip contentStyle={{ backgroundColor: '#000', fontSize: '10px' }} cursor={{ fill: 'rgba(255,255,255,0.1)' }} />
                                                        <Bar dataKey="val" radius={[2, 2, 0, 0]}>
                                                            <LabelList dataKey="val" position="top" fill="#fff" fontSize={9} formatter={(val: any) => Number(val).toFixed(2)} />
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        />
                    </div>

                </div>
            </div>
        </div>
    );
}

