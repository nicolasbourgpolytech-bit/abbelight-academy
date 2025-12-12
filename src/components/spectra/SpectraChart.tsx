"use client";

import { useState, useMemo, useEffect } from 'react';
import {
    ComposedChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';


// --- Types & Data ---

type SpectrumDataPoint = {
    wavelength: number;
    [key: string]: number; // dynamic keys for fluorophores e.g. "dapi_ex", "dapi_em"
};

type Fluorophore = {
    id: string; // UUID from DB
    name: string;
    category: string;
    color: string;
    visible: boolean;
    excitation_data: { wavelength: number; value: number }[];
    emission_data: { wavelength: number; value: number }[];
};

// Generate range of wavelengths matching the data source
const WAVELENGTHS = Array.from({ length: 501 }, (_, i) => 300 + i); // 300nm to 800nm

export function SpectraChart() {
    const [isMounted, setIsMounted] = useState(false);
    const [fluorophores, setFluorophores] = useState<Fluorophore[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showExcitation, setShowExcitation] = useState(true);
    const [showEmission, setShowEmission] = useState(true);

    useEffect(() => {
        setIsMounted(true);
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/spectra');
            if (res.ok) {
                const data = await res.json();
                // Ensure initial visibility logic (e.g. show DAPI by default)
                // Actually the DB has a 'visible' column, but that's for "default visibility" or we manage local state?
                // For the viewer, we likely want to toggle them locally.
                // Let's assume we fetch them all and map them to local state.
                const mapped = data.map((d: any) => ({
                    ...d,
                    visible: ['DAPI', 'Alexa Fluor 488'].includes(d.name) // Default visible logic
                }));
                setFluorophores(mapped);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleFluorophore = (id: string) => {
        setFluorophores(prev => prev.map(f =>
            f.id === id ? { ...f, visible: !f.visible } : f
        ));
    };

    // Calculate chart data based on visible fluorophores and their data arrays
    const chartData = useMemo(() => {
        return WAVELENGTHS.map((nm, index) => {
            const point: SpectrumDataPoint = { wavelength: nm };

            fluorophores.forEach(f => {
                if (f.visible) {
                    // Data from DB is in f.excitation_data (Array of {wavelength, value})
                    // Assuming alignment or lookup
                    const exPoint = f.excitation_data?.find((p: any) => p.wavelength === nm);
                    const emPoint = f.emission_data?.find((p: any) => p.wavelength === nm);

                    if (exPoint) point[`${f.id}_ex`] = exPoint.value;
                    if (emPoint) point[`${f.id}_em`] = emPoint.value;
                }
            });
            return point;
        });
    }, [fluorophores]);

    if (!isMounted || isLoading) return <div className="h-full flex items-center justify-center text-white">Loading spectra...</div>;

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Control Panel */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                {fluorophores.map(dye => {
                    return (
                        <button
                            key={dye.id}
                            onClick={() => toggleFluorophore(dye.id)}
                            className={`
                                flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200
                                ${dye.visible
                                    ? 'bg-white/10 border-white/20'
                                    : 'bg-transparent border-transparent opacity-50 hover:opacity-100'}
                            `}
                        >
                            <div
                                className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]"
                                style={{ backgroundColor: dye.color, color: dye.color }}
                            />
                            <span className="text-sm font-medium text-white truncate">{dye.name}</span>
                            {dye.visible && (
                                <svg className="w-4 h-4 ml-auto text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Chart Area */}
            <div className="flex-1 min-h-[500px] w-full bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6 relative group">
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

                <div className="w-full flex justify-center overflow-x-auto">
                    <ComposedChart
                        key={fluorophores.filter(f => f.visible).map(f => f.id).join('-')} // Force remount on change to fix animation glitch
                        width={1000}
                        height={500}
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis
                            dataKey="wavelength"
                            type="number"
                            domain={[300, 800]}
                            tick={{ fill: '#6B7280', fontSize: 12 }}
                            tickLine={false}
                            axisLine={{ stroke: '#ffffff20' }}
                            label={{ value: 'Wavelength (nm)', position: 'insideBottom', offset: -10, fill: '#9CA3AF' }}
                        />
                        <YAxis
                            hide
                            domain={[0, 1.1]}
                        />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-black/90 border border-white/10 p-3 rounded-lg shadow-xl backdrop-blur-md">
                                            <p className="text-gray-400 text-xs mb-2">{label} nm</p>
                                            {payload.map((entry: { name: string; value: number; color: string }) => (
                                                <div key={entry.name} className="flex items-center gap-2 text-sm">
                                                    <div
                                                        className="w-2 h-2 rounded-full"
                                                        style={{ backgroundColor: entry.color }}
                                                    />
                                                    <span className="text-white font-medium capitalize">
                                                        {entry.name.replace('_', ' ')}:
                                                    </span>
                                                    <span className="text-gray-400">
                                                        {(entry.value * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />

                        <defs>
                            {fluorophores.map(dye => (
                                <linearGradient key={`grad_${dye.id}`} id={`grad_${dye.id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={dye.color} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={dye.color} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>

                        {/* Excitation Areas (Dashed line, very faint fill) */}
                        {fluorophores.map(dye => {
                            if (!dye.visible || !showExcitation) return null;
                            return (
                                <Area
                                    key={`${dye.id}_ex`}
                                    name={`${dye.name} Ex`}
                                    type="monotone"
                                    dataKey={`${dye.id}_ex`}
                                    stroke={dye.color}
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    fill={dye.color}
                                    fillOpacity={0.1}
                                    dot={false}
                                    activeDot={{ r: 4, fill: dye.color }}
                                    isAnimationActive={true}
                                    animationDuration={2000}
                                    animationEasing="ease-in-out"
                                />
                            );
                        })}

                        {/* Emission Areas (Solid line, creating a "glow" fill) */}
                        {fluorophores.map(dye => {
                            if (!dye.visible || !showEmission) return null;
                            return (
                                <Area
                                    key={`${dye.id}_em`}
                                    name={`${dye.name} Em`}
                                    type="monotone"
                                    dataKey={`${dye.id}_em`}
                                    stroke={dye.color}
                                    strokeWidth={3}
                                    fill={`url(#grad_${dye.id})`} // Use gradient for emission for better "colorée" effect
                                    fillOpacity={0.4}
                                    dot={false}
                                    activeDot={{ r: 6, fill: dye.color, stroke: '#fff', strokeWidth: 2 }}
                                    isAnimationActive={true}
                                    animationDuration={2000}
                                    animationBegin={200}
                                    animationEasing="ease-in-out"
                                />
                            );
                        })}
                    </ComposedChart>
                </div>

                {/* Legend/Info Overlay */}
                <div className="absolute top-4 right-4 flex gap-4 text-xs text-gray-500 z-10">
                    <button
                        onClick={() => setShowExcitation(!showExcitation)}
                        className={`flex items-center gap-2 hover:text-white transition-colors ${!showExcitation ? 'opacity-50 grayscale' : ''}`}
                        title="Toggle Excitation"
                    >
                        <div className="w-6 h-0.5 border-t-2 border-dashed border-current"></div>
                        <span>Excitation</span>
                    </button>
                    <button
                        onClick={() => setShowEmission(!showEmission)}
                        className={`flex items-center gap-2 hover:text-white transition-colors ${!showEmission ? 'opacity-50 grayscale' : ''}`}
                        title="Toggle Emission"
                    >
                        <div className="w-6 h-0.5 bg-current rounded-full"></div>
                        <span>Emission</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
