
import { useState, useMemo, useEffect } from 'react';
import {
    ComposedChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Line,
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

type OpticalComponent = {
    id: string;
    name: string;
    type: string;
    visible: boolean;
    color: string;
    line_style: string;
    data: { wavelength: number; value: number }[];
};

// Generate range of wavelengths matching the data source
const WAVELENGTHS = Array.from({ length: 501 }, (_, i) => 300 + i); // 300nm to 800nm

export function SpectraChart() {
    const [isMounted, setIsMounted] = useState(false);
    const [fluorophores, setFluorophores] = useState<Fluorophore[]>([]);
    const [optics, setOptics] = useState<OpticalComponent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showExcitation, setShowExcitation] = useState(true);
    const [showEmission, setShowEmission] = useState(true);

    // Wavelength Range Controls
    const [minWavelength, setMinWavelength] = useState<number>(300);
    const [maxWavelength, setMaxWavelength] = useState<number>(800);

    const [openCategories, setOpenCategories] = useState<string[]>(['UV', 'Green', 'Red', 'Far-red', 'Optics']);

    useEffect(() => {
        setIsMounted(true);
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [spectraRes, opticsRes] = await Promise.all([
                fetch('/api/spectra'),
                fetch('/api/spectra/optics')
            ]);

            if (spectraRes.ok) {
                const data = await spectraRes.json();
                const mapped = data.map((d: any) => ({
                    ...d,
                    visible: ['DAPI', 'Alexa Fluor 488'].includes(d.name)
                }));
                setFluorophores(mapped);
            }

            if (opticsRes.ok) {
                const data = await opticsRes.json();
                const mapped = data.map((d: any) => ({
                    ...d,
                    visible: false // Hidden by default
                }));
                setOptics(mapped);
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

    const toggleOptic = (id: string) => {
        setOptics(prev => prev.map(o =>
            o.id === id ? { ...o, visible: !o.visible } : o
        ));
    };

    const toggleCategory = (category: string) => {
        setOpenCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    // Calculate chart data based on visible fluorophores and optics
    const chartData = useMemo(() => {
        return WAVELENGTHS.map((nm, index) => {
            const point: SpectrumDataPoint = { wavelength: nm };

            fluorophores.forEach(f => {
                if (f.visible) {
                    const exPoint = f.excitation_data?.find((p: any) => p.wavelength === nm);
                    const emPoint = f.emission_data?.find((p: any) => p.wavelength === nm);

                    if (exPoint) point[`${f.id}_ex`] = exPoint.value;
                    if (emPoint) point[`${f.id}_em`] = emPoint.value;
                }
            });

            optics.forEach(o => {
                if (o.visible) {
                    const opPoint = o.data?.find((p: any) => p.wavelength === nm);
                    if (opPoint) point[`${o.id}_optic`] = opPoint.value;
                }
            });

            return point;
        });
    }, [fluorophores, optics]);

    const categories = ['UV', 'Green', 'Red', 'Far-red'];

    if (!isMounted || isLoading) return <div className="h-full flex items-center justify-center text-white">Loading spectra...</div>;

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Global Controls: Range & Toggles */}
            <div className="flex flex-wrap items-center gap-4 bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Range:</span>
                    <div className="flex items-center gap-2 bg-black/20 rounded-lg px-2 py-1 border border-white/5">
                        <input
                            type="number"
                            value={minWavelength}
                            onChange={(e) => setMinWavelength(Number(e.target.value))}
                            className="w-12 bg-transparent text-white text-xs text-center focus:outline-none"
                            min={200} max={maxWavelength - 10}
                        />
                        <span className="text-gray-500 text-xs">-</span>
                        <input
                            type="number"
                            value={maxWavelength}
                            onChange={(e) => setMaxWavelength(Number(e.target.value))}
                            className="w-12 bg-transparent text-white text-xs text-center focus:outline-none"
                            min={minWavelength + 10} max={900}
                        />
                        <span className="text-gray-500 text-xs">nm</span>
                    </div>
                </div>

                <div className="w-px h-6 bg-white/10 mx-2 hidden md:block"></div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowExcitation(!showExcitation)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showExcitation ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'}`}
                    >
                        <div className={`w-2 h-2 rounded-full ${showExcitation ? 'bg-primary' : 'bg-gray-500'}`}></div>
                        Excitation
                    </button>
                    <button
                        onClick={() => setShowEmission(!showEmission)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showEmission ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'}`}
                    >
                        <div className={`w-2 h-2 rounded-full ${showEmission ? 'bg-primary' : 'bg-gray-500'}`}></div>
                        Emission
                    </button>
                </div>
            </div>

            {/* Main Layout: Categories Left, Chart Right */}
            <div className="flex flex-col md:flex-row gap-4 h-full min-h-0">

                {/* Categories Sidebar */}
                <div className="w-full md:w-64 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
                    {/* SAFe Optics Section */}
                    {optics.length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm shrink-0">
                            <button
                                onClick={() => toggleCategory('Optics')}
                                className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                    <span className="font-semibold text-sm">Abbelight SAFe</span>
                                    <span className="text-xs text-gray-500">({optics.length})</span>
                                </div>
                                <svg
                                    className={`w-4 h-4 text-gray-400 transition-transform ${openCategories.includes('Optics') ? 'rotate-180' : ''}`}
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {openCategories.includes('Optics') && (
                                <div className="p-2 space-y-1">
                                    {optics.map(optic => (
                                        <button
                                            key={optic.id}
                                            onClick={() => toggleOptic(optic.id)}
                                            className={`
                                                w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-xs
                                                ${optic.visible
                                                    ? 'bg-white/10 text-white border border-white/20'
                                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                                            `}
                                        >
                                            <div className="w-4 h-0 border-t border-dashed border-white/50" />
                                            <span className="truncate flex-1">{optic.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {categories.map(category => {
                        const categoryDyes = fluorophores.filter(f => f.category === category);
                        const isOpen = openCategories.includes(category);

                        return (
                            <div key={category} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm shrink-0">
                                <button
                                    onClick={() => toggleCategory(category)}
                                    className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${category === 'UV' ? 'bg-purple-400' : category === 'Green' ? 'bg-green-400' : category === 'Red' ? 'bg-red-500' : 'bg-pink-600'}`} />
                                        <span className="font-semibold text-sm">{category}</span>
                                        <span className="text-xs text-gray-500">({categoryDyes.length})</span>
                                    </div>
                                    <svg
                                        className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {isOpen && (
                                    <div className="p-2 space-y-1">
                                        {categoryDyes.map(dye => (
                                            <button
                                                key={dye.id}
                                                onClick={() => toggleFluorophore(dye.id)}
                                                className={`
                                                    w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-xs
                                                    ${dye.visible
                                                        ? 'bg-primary/20 text-white'
                                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                                                `}
                                            >
                                                <div
                                                    className="w-2 h-2 rounded-full shrink-0"
                                                    style={{ backgroundColor: dye.color }}
                                                />
                                                <span className="truncate flex-1">{dye.name}</span>
                                                {dye.visible && (
                                                    <svg className="w-3 h-3 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </button>
                                        ))}
                                        {categoryDyes.length === 0 && (
                                            <div className="p-2 text-xs text-gray-500 text-center italic">No dyes</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Chart Area */}
                <div className="flex-1 w-full bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 relative group flex flex-col min-h-[500px]">
                    {/* Background Grid Pattern */}
                    <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={chartData}
                                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis
                                    dataKey="wavelength"
                                    type="number"
                                    domain={[minWavelength, maxWavelength]}
                                    allowDataOverflow={true}
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
                                                    {payload.map((entry: any) => (
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
                                            strokeWidth={1}
                                            strokeDasharray="4 4"
                                            fill={dye.color}
                                            fillOpacity={0.1}
                                            dot={false}
                                            activeDot={{ r: 4, fill: dye.color }}
                                            isAnimationActive={true}
                                            animationDuration={1500}
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
                                            strokeWidth={2}
                                            fill={`url(#grad_${dye.id})`} // Use gradient for emission for better "colorée" effect
                                            fillOpacity={0.4}
                                            dot={false}
                                            activeDot={{ r: 6, fill: dye.color, stroke: '#fff', strokeWidth: 2 }}
                                            isAnimationActive={true}
                                            animationDuration={1500}
                                            animationBegin={200}
                                            animationEasing="ease-in-out"
                                        />
                                    );
                                })}

                                {/* Optics Rendering */}
                                {optics.map(optic => {
                                    if (!optic.visible) return null;
                                    return (
                                        <Line
                                            key={optic.id}
                                            name={optic.name}
                                            type="monotone"
                                            dataKey={`${optic.id}_optic`}
                                            stroke={optic.color}
                                            strokeWidth={1.5}
                                            strokeDasharray="6 4" // Distinct dash pattern for optics
                                            dot={false}
                                            activeDot={{ r: 4, fill: '#fff', stroke: '#fff' }}
                                            isAnimationActive={true}
                                        />
                                    );
                                })}

                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
