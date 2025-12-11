"use client";

import { useState, useMemo, useEffect } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceArea
} from 'recharts';

// --- Types & Data ---

type SpectrumDataPoint = {
    wavelength: number;
    [key: string]: number; // dynamic keys for fluorophores e.g. "GFP_ex", "GFP_em"
};

type Fluorophore = {
    id: string;
    name: string;
    exPeak: number;
    emPeak: number;
    color: string;
    visible: boolean;
};

// Simplified Gaussian function to generate spectral curves
const gaussian = (x: number, peak: number, width: number) => {
    return Math.exp(-Math.pow(x - peak, 2) / (2 * Math.pow(width, 2)));
};

// Generate range of wavelengths
const WAVELENGTHS = Array.from({ length: 501 }, (_, i) => 300 + i); // 300nm to 800nm

// Default Fluorophores
const DEFAULT_FLUOROPHORES: Fluorophore[] = [
    { id: 'dapi', name: 'DAPI', exPeak: 358, emPeak: 461, color: '#00CAF8', visible: true }, // Blue/Cyan
    { id: 'gfp', name: 'GFP', exPeak: 488, emPeak: 507, color: '#00D296', visible: true },   // Green
    { id: 'rfp', name: 'RFP', exPeak: 555, emPeak: 584, color: '#FF9B35', visible: false },  // Orange
    { id: 'cy5', name: 'Cy5', exPeak: 649, emPeak: 666, color: '#FF73FF', visible: false },  // Magenta
];

export function SpectraChart() {
    const [isMounted, setIsMounted] = useState(false);
    const [fluorophores, setFluorophores] = useState<Fluorophore[]>(DEFAULT_FLUOROPHORES);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const toggleFluorophore = (id: string) => {
        setFluorophores(prev => prev.map(f =>
            f.id === id ? { ...f, visible: !f.visible } : f
        ));
    };

    // Calculate chart data based on visible fluorophores
    const chartData = useMemo(() => {
        return WAVELENGTHS.map(nm => {
            const point: SpectrumDataPoint = { wavelength: nm };

            fluorophores.forEach(f => {
                if (f.visible) {
                    // Excitation (dashed or tailored) - usually narrower
                    point[`${f.id}_ex`] = gaussian(nm, f.exPeak, 25);
                    // Emission (solid) - usually slightly wider
                    point[`${f.id}_em`] = gaussian(nm, f.emPeak, 35) * 0.8; // slightly lower intensity
                }
            });
            return point;
        });
    }, [fluorophores]);

    if (!isMounted) return <div className="h-full flex items-center justify-center">Loading spectra...</div>;

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Control Panel */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                {fluorophores.map(f => (
                    <button
                        key={f.id}
                        onClick={() => toggleFluorophore(f.id)}
                        className={`
                            flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200
                            ${f.visible
                                ? 'bg-white/10 border-white/20'
                                : 'bg-transparent border-transparent opacity-50 hover:opacity-100'}
                        `}
                    >
                        <div
                            className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]"
                            style={{ backgroundColor: f.color, color: f.color }}
                        />
                        <span className="text-sm font-medium text-white">{f.name}</span>
                        {f.visible && (
                            <svg className="w-4 h-4 ml-auto text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </button>
                ))}
            </div>

            {/* Chart Area */}
            <div className="flex-1 min-h-[500px] w-full bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6 relative group">
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

                <div className="w-full flex justify-center overflow-x-auto">
                    <LineChart width={1000} height={500} data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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

                        {/* Excitation Lines (Dashed) */}
                        {fluorophores.map(f => f.visible && (
                            <Line
                                key={`${f.id}_ex`}
                                name={`${f.name} Ex`}
                                type="monotone"
                                dataKey={`${f.id}_ex`}
                                stroke={f.color}
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                strokeOpacity={0.6}
                                dot={false}
                                activeDot={{ r: 4, fill: f.color }}
                                isAnimationActive={true}
                                animationDuration={2000}
                                animationEasing="ease-in-out"
                            />
                        ))}

                        {/* Emission Lines (Solid) */}
                        {fluorophores.map(f => f.visible && (
                            <Line
                                key={`${f.id}_em`}
                                name={`${f.name} Em`}
                                type="monotone"
                                dataKey={`${f.id}_em`}
                                stroke={f.color}
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 6, fill: f.color, stroke: '#fff', strokeWidth: 2 }}
                                isAnimationActive={true}
                                animationDuration={2000}
                                animationBegin={200}
                                animationEasing="ease-in-out"
                            />
                        ))}
                    </LineChart>
                </div>

                {/* Legend/Info Overlay */}
                <div className="absolute top-4 right-4 flex gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-0.5 border-t-2 border-dashed border-gray-500"></div>
                        <span>Excitation</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-0.5 bg-gray-500 rounded-full"></div>
                        <span>Emission</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
