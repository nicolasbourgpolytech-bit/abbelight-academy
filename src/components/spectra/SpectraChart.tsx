
import { useState, useMemo, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import { SpectraReport } from './SpectraReport';
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
    type: 'Organic Dye' | 'Fluorescent Protein';
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

type Product = {
    id: string;
    name: string;
    image_url: string;
    description: string;
    link: string;
};

// Generate range of wavelengths matching the data source
const WAVELENGTHS = Array.from({ length: 501 }, (_, i) => 300 + i); // 300nm to 800nm

export function SpectraChart() {
    const [isMounted, setIsMounted] = useState(false);
    const [fluorophores, setFluorophores] = useState<Fluorophore[]>([]);
    const [optics, setOptics] = useState<OpticalComponent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showExcitation, setShowExcitation] = useState(false); // Default hidden as requested
    const [showEmission, setShowEmission] = useState(true);

    // Filters
    const [showOrganicDyes, setShowOrganicDyes] = useState(true);
    const [showFluorescentProteins, setShowFluorescentProteins] = useState(true);

    const [activeTab, setActiveTab] = useState<'raw' | 'detected'>('detected');

    // Product Configuration
    const [selectedProduct, setSelectedProduct] = useState<string>('MN360'); // Default to MN360
    const [products, setProducts] = useState<Product[]>([]);
    const [dichroics, setDichroics] = useState<OpticalComponent[]>([]);
    const [emissionFilters, setEmissionFilters] = useState<OpticalComponent[]>([]);
    const [imagingSplitters, setImagingSplitters] = useState<OpticalComponent[]>([]);

    // Modalities
    const [modalities, setModalities] = useState<any[]>([]);
    const [selectedModalityId, setSelectedModalityId] = useState<string>('');

    // Filter Wheel State
    const [cam1FilterId, setCam1FilterId] = useState<string>('');
    const [cam2FilterId, setCam2FilterId] = useState<string>('');
    const [activeCameraView, setActiveCameraView] = useState<'cam1' | 'cam2'>('cam1');
    const [isCompareMode, setIsCompareMode] = useState(true);

    // Wavelength Range Controls
    const [minWavelength, setMinWavelength] = useState<number>(400); // Default 400nm
    const [maxWavelength, setMaxWavelength] = useState<number>(800);

    const [openCategories, setOpenCategories] = useState<string[]>(['UV', 'Green', 'Red', 'Far-red', 'Optics']); // Optics here refers to Dichroics panel

    // Export State
    const [isExporting, setIsExporting] = useState(false);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsMounted(true);
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [spectraRes, opticsRes, modalitiesRes, productsRes] = await Promise.all([
                fetch('/api/spectra'),
                fetch('/api/spectra/optics'),
                fetch('/api/spectra/modalities'),
                fetch('/api/products')
            ]);

            if (spectraRes.ok) {
                const data = await spectraRes.json();
                const mapped = data.map((d: any) => ({
                    ...d,
                    type: d.type || 'Organic Dye', // Default if missing
                    visible: false
                }));
                setFluorophores(mapped);
            }

            if (opticsRes.ok) {
                const data = await opticsRes.json();
                const mapped = data.map((d: any) => ({
                    ...d,
                    visible: false // Hidden by default
                }));

                setOptics(mapped); // Keep full list if needed, or remove. Let's keep for generic usage if needed, but better split.
                // Actually `optics` state was used for rendering lines and panel list.
                // We should assume `optics` state = Dichroics (SAFe Optics panel)
                // And `emissionFilters` state = Filter Wheels.

                const d = mapped.filter((o: any) => o.type === 'dichroic' || !o.type); // Default to dichroic
                const f = mapped.filter((o: any) => o.type === 'emission_filter');
                const s = mapped.filter((o: any) => o.type === 'imaging_splitter');

                setDichroics(d);
                setEmissionFilters(f);
                setImagingSplitters(s);

                // Set default filters if available
                if (f.length > 0) {
                    setCam1FilterId(f[0].id);
                    setCam2FilterId(f[0].id);
                }
            }

            if (modalitiesRes.ok) {
                const data = await modalitiesRes.json();
                setModalities(data);
            }

            if (productsRes.ok) {
                const data = await productsRes.json();
                setProducts(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    // Report Ref
    const reportRef = useRef<HTMLDivElement>(null);

    const handleExport = async () => {
        setIsExporting(true);
        // Allow render cycle to populate report
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            if (reportRef.current) {
                // Use html-to-image on the hidden report component
                const dataUrl = await toPng(reportRef.current, {
                    cacheBust: true,
                    backgroundColor: '#ffffff'
                });

                const downloadLink = document.createElement('a');
                downloadLink.href = dataUrl;
                downloadLink.download = `abbelight_spectra_report_${new Date().toISOString().slice(0, 10)}.png`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            }
        } catch (e) {
            console.error("Export failed:", e);
        } finally {
            setIsExporting(false);
        }
    };

    // Add effect to apply default modality when modalities are loaded
    // Add effect to apply default modality when modalities are loaded or product changes
    useEffect(() => {
        // Only auto-select if no modality is currently selected (or if we just switched products and want to set the default)
        if (modalities.length > 0 && !selectedModalityId) {
            // Find default for current product
            const defaultModality = modalities.find(m => m.product === selectedProduct && m.is_default);

            if (defaultModality) {
                applyModality(defaultModality.id);
            }
        }
    }, [modalities, selectedProduct, selectedModalityId]);

    const toggleFluorophore = (id: string) => {
        setFluorophores(prev => prev.map(f =>
            f.id === id ? { ...f, visible: !f.visible } : f
        ));
    };

    const toggleOptic = (id: string) => {
        setDichroics(prev => prev.map(o =>
            o.id === id ? { ...o, visible: !o.visible } : o
        ));
    };

    const toggleImagingSplitter = (id: string) => {
        setImagingSplitters(prev => prev.map(s =>
            s.id === id ? { ...s, visible: !s.visible } : { ...s, visible: false }
        ));
    };

    const toggleCategory = (category: string) => {
        setOpenCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const applyModality = (modalityId: string) => {
        setSelectedModalityId(modalityId);
        if (!modalityId) return; // If cleared, maybe reset? Or keep current.

        const modality = modalities.find(m => m.id === modalityId);
        if (!modality) return;

        // Apply Dichroic (set visible)
        if (modality.dichroic_id) {
            setDichroics(prev => prev.map(d =>
                d.id === modality.dichroic_id ? { ...d, visible: true } : { ...d, visible: false }
            ));
        } else {
            // If no dichroic in modality, hide all?
            setDichroics(prev => prev.map(d => ({ ...d, visible: false })));
        }

        // Apply Splitter
        if (modality.splitter_id) {
            setImagingSplitters(prev => prev.map(s =>
                s.id === modality.splitter_id ? { ...s, visible: true } : { ...s, visible: false }
            ));
        } else {
            setImagingSplitters(prev => prev.map(s => ({ ...s, visible: false })));
        }

        // Apply Filters
        if (modality.cam1_filter_id) setCam1FilterId(modality.cam1_filter_id);
        if (modality.cam2_filter_id) setCam2FilterId(modality.cam2_filter_id);

        // Apply Associated Dyes
        if (modality.associated_dyes && modality.associated_dyes.length > 0) {
            setFluorophores(prev => prev.map(f => ({
                ...f,
                visible: modality.associated_dyes.includes(f.id)
            })));
        }
    };

    // --- Calculation Helpers ---

    // Calculate Area Under Curve using Trapezoidal Rule
    const calculateAUC = (range: { wavelength: number, value: number }[]) => {
        let area = 0;
        for (let i = 0; i < range.length - 1; i++) {
            const p1 = range[i];
            const p2 = range[i + 1];
            // Only count if within current view range
            if (p1.wavelength >= minWavelength && p2.wavelength <= maxWavelength) {
                area += (p1.value + p2.value) * (p2.wavelength - p1.wavelength) / 2;
            }
        }
        return area;
    };

    // Helper to get active splitter (Cube) transmission for a given camera
    const getSplitterTransmission = (wavelength: number, camera: 'cam1' | 'cam2') => {
        // Assume only one splitter is active/visible at a time? Or usually just one "Cube" in system.
        // If multiple are visible, maybe they cascade? Let's assume the first visible one is THE splitter.
        const activeSplitter = imagingSplitters.find(s => s.visible);

        if (!activeSplitter) {
            // No splitter: Cam1 (Transmitted) gets 100%, Cam2 (Reflected) gets 0%
            return camera === 'cam1' ? 1.0 : 0.0;
        }

        const point = activeSplitter.data.find(p => p.wavelength === wavelength);
        const T = point ? point.value : 0; // Transmission

        if (camera === 'cam1') {
            return T; // Transmitted
        } else {
            return 1.0 - T; // Reflected
        }
    };

    // Calculate Detection Efficiency
    const calculateEfficiency = (dye: Fluorophore, overrideFilterId?: string, overrideCamera?: 'cam1' | 'cam2') => {
        // 1. Get Combined Optics Transmission (Dichroics + Filter)
        const visibleDichroics = dichroics.filter(o => o.visible);

        // Determine Filter to use
        let activeFilter: OpticalComponent | undefined;

        if (overrideFilterId) {
            activeFilter = emissionFilters.find(f => f.id === overrideFilterId);
        } else {
            // Default to current active view
            if (activeCameraView === 'cam1' && cam1FilterId) {
                activeFilter = emissionFilters.find(f => f.id === cam1FilterId);
            } else if (activeCameraView === 'cam2' && cam2FilterId) {
                activeFilter = emissionFilters.find(f => f.id === cam2FilterId);
            }
        }

        const targetCamera = overrideCamera || activeCameraView;

        // If no optics (dichroics or filters) are selected, assume 100%? 
        // Or if "Detected", we need at least something? 
        // Let's assume: Base 100% * Dichroics * Filter.

        // Precompute optics map
        const opticsMap = new Map<number, number>();
        WAVELENGTHS.forEach(nm => {
            if (nm < minWavelength || nm > maxWavelength) return;

            let transmission = 1.0;

            // Apply Dichroics
            visibleDichroics.forEach(opt => {
                const point = opt.data.find(p => p.wavelength === nm);
                const val = point ? point.value : 0; // If data missing for this wavelength, assume 0 or 1? Usually 0 if outside range or interp. logic. We used 0 before.
                transmission *= val;
            });

            // Apply Active Filter
            if (activeFilter) {
                const point = activeFilter.data.find(p => p.wavelength === nm);
                const val = point ? point.value : 0;
                transmission *= val;
            }

            // Apply Imaging Splitter (Cube)
            const splitterTrans = getSplitterTransmission(nm, targetCamera);
            transmission *= splitterTrans;

            opticsMap.set(nm, transmission);
        });

        // 2. Calculate Raw AUC (Dye Emission only)
        const rawPoints = dye.emission_data.filter(p => p.wavelength >= minWavelength && p.wavelength <= maxWavelength);
        const rawAUC = calculateAUC(rawPoints);

        // 3. Calculate Weighted AUC (Dye Emission * Optics)
        // We generate the weighted curve points effectively
        const weightedPoints = rawPoints.map(p => {
            const opticTrans = opticsMap.get(p.wavelength) ?? 0;
            return { wavelength: p.wavelength, value: p.value * opticTrans };
        });
        const detectedAUC = calculateAUC(weightedPoints);

        const ratio = rawAUC > 0 ? (detectedAUC / rawAUC) : 0;
        return { ratio, rawAUC, detectedAUC };
    };

    // --- Chart Data Calculation ---
    const chartData = useMemo(() => {
        const visibleDichroics = dichroics.filter(o => o.visible);

        // Active Filter
        let activeFilter: OpticalComponent | undefined;
        if (activeCameraView === 'cam1' && cam1FilterId) {
            activeFilter = emissionFilters.find(f => f.id === cam1FilterId);
        } else if (activeCameraView === 'cam2' && cam2FilterId) {
            activeFilter = emissionFilters.find(f => f.id === cam2FilterId);
        }

        // Secondary Filter (for comparison)
        let secondaryFilter: OpticalComponent | undefined;
        if (isCompareMode && ['M90', 'MN360'].includes(selectedProduct)) {
            if (activeCameraView === 'cam1' && cam2FilterId) {
                secondaryFilter = emissionFilters.find(f => f.id === cam2FilterId);
            } else if (activeCameraView === 'cam2' && cam1FilterId) {
                secondaryFilter = emissionFilters.find(f => f.id === cam1FilterId);
            }
        }

        return WAVELENGTHS.map((nm, index) => {
            const point: SpectrumDataPoint = { wavelength: nm };

            // 1. Calculate Combined Optic Value
            let combinedOpticTrans = 1.0;
            let secondaryOpticTrans = 1.0;

            // Dichroics (Apply to both)
            visibleDichroics.forEach(opt => {
                const opP = opt.data?.find((p: any) => p.wavelength === nm);
                const val = opP ? Number(opP.value) : 1.0; // Assume 1.0 if no data? Or 0? Let's assume 1.0 to avoid invisible bugs if generic.
                combinedOpticTrans *= val;
                secondaryOpticTrans *= val;
            });

            // Imaging Splitters (Cube 1)
            // Combined (Active View)
            const activeSplitterTrans = getSplitterTransmission(nm, activeCameraView);
            combinedOpticTrans *= activeSplitterTrans;

            // Store for visualization
            imagingSplitters.forEach(s => {
                if (s.visible) {
                    const sPoint = s.data?.find((p: any) => p.wavelength === nm);
                    if (sPoint) {
                        // For visualization, do we show the Raw T? Or the effective T for the camera?
                        // User wants to understand, so probably the Effective T for the active camera VIEW.
                        // If Cam 2 (Reflected), we should probably show the Reflection curve (1-T).
                        // Let's use getSplitterTransmission logic logic but for this specific splitter.
                        let val = sPoint.value;
                        if (activeCameraView === 'cam2') val = 1.0 - val;
                        point[`${s.id}_splitter`] = val;
                    }
                }
            });

            // Secondary (Other View for Compare)
            if (isCompareMode) {
                const otherCam = activeCameraView === 'cam1' ? 'cam2' : 'cam1';
                const secondarySplitterTrans = getSplitterTransmission(nm, otherCam);
                secondaryOpticTrans *= secondarySplitterTrans;
            }

            // Active Filter
            if (activeFilter) {
                const fP = activeFilter.data?.find((p: any) => p.wavelength === nm);
                const val = fP ? Number(fP.value) : 0.0; // Assume 0 (Blocked) if data missing/gap for Bandpass
                combinedOpticTrans *= val;

                // Visualization
                point[`active_filter`] = val;
            } else {
                // Even if undefined, if we are in detected mode, maybe render 0 line? No.
            }

            // Store secondary filter point for visualization (if compare mode)
            if (secondaryFilter) {
                const fP = secondaryFilter.data?.find((p: any) => p.wavelength === nm);
                const val = fP ? Number(fP.value) : 0.0;
                secondaryOpticTrans *= val;
                point[`secondary_filter`] = val;
            }

            fluorophores.forEach(f => {
                if (f.visible) {
                    const exPoint = f.excitation_data?.find((p: any) => p.wavelength === nm);
                    const emPoint = f.emission_data?.find((p: any) => p.wavelength === nm);

                    if (activeTab === 'raw') {
                        // RAW TAB
                        if (exPoint) point[`${f.id}_ex`] = exPoint.value;
                        if (emPoint) point[`${f.id}_em`] = emPoint.value;
                    } else {
                        // DETECTED TAB
                        if (exPoint && showExcitation) point[`${f.id}_ex`] = exPoint.value;

                        if (emPoint) {
                            // Primary Curve
                            point[`${f.id}_em`] = emPoint.value * combinedOpticTrans;

                            // Secondary Curve (Ghost)
                            if (secondaryFilter) {
                                point[`${f.id}_em_secondary`] = emPoint.value * secondaryOpticTrans;
                            }
                        }
                    }
                }
            });

            // Always show Optics curve as reference in both tabs (or maybe just Raw?)
            // If in Detected Tab, maybe show the *Combined* optic curve?
            // For now, let's keep showing individual optics as reference lines
            // 2. Render Dichroics lines (Reference)
            dichroics.forEach(o => {
                if (o.visible) {
                    const opPoint = o.data?.find((p: any) => p.wavelength === nm);
                    if (opPoint) point[`${o.id}_optic`] = opPoint.value;
                }
            });

            return point;
        });
    }, [fluorophores, dichroics, emissionFilters, imagingSplitters, activeTab, showExcitation, activeCameraView, cam1FilterId, cam2FilterId, isCompareMode, selectedProduct]);

    const categories = ['UV', 'Blue', 'Green', 'Red', 'Far-red'];

    const category = fluorophores.find(f => f.category === 'Blue') ? 'Blue' : 'UV';

    const hasSplitter = !['M45', 'MN180'].includes(selectedProduct);
    const selectedProductData = products.find(p => p.name.includes(selectedProduct));

    // Prepare Metrics for Report
    const efficiencyMetrics = categories.flatMap(cat =>
        fluorophores.filter(f => f.visible && f.category === cat).map(dye => {
            const cam1Stats = calculateEfficiency(dye, cam1FilterId, 'cam1');
            const p1 = (cam1Stats.ratio * 100).toFixed(1);

            let p2 = undefined;
            let splitRatio = undefined;

            if (['M90', 'MN360'].includes(selectedProduct)) {
                const cam2Stats = calculateEfficiency(dye, cam2FilterId, 'cam2');
                p2 = (cam2Stats.ratio * 100).toFixed(1) + '%';
                const total = cam1Stats.ratio + cam2Stats.ratio;
                splitRatio = total > 0 ? (cam1Stats.ratio / total * 100).toFixed(0) + '%' : '0%';
            }

            return {
                dyeName: dye.name,
                color: dye.color,
                cam1: p1 + '%',
                cam2: p2,
                splitRatio
            };
        })
    );



    if (!isMounted || isLoading) return <div className="h-full flex items-center justify-center text-white">Loading spectra...</div>;

    return (
        <div className="flex flex-col space-y-6">
            {/* Instrument Configuration */}
            <div className="flex gap-6">
                {/* Product Image */}
                {selectedProductData?.image_url && (
                    <div className="w-48 h-full min-h-[140px] bg-white/5 border border-white/10 rounded-xl overflow-hidden shrink-0">
                        <img
                            src={selectedProductData.image_url}
                            alt={selectedProductData.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                <div className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-sm flex flex-wrap items-center gap-6">

                    {/* Product Selector */}
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Product System</label>
                        <select
                            value={selectedProduct}
                            onChange={(e) => {
                                const newProduct = e.target.value;
                                setSelectedProduct(newProduct);
                                setSelectedModalityId(''); // Reset modality on product change

                                // Reset splitters and view for single-camera systems
                                if (['M45', 'MN180'].includes(newProduct)) {
                                    setImagingSplitters(prev => prev.map(s => ({ ...s, visible: false })));
                                    setIsCompareMode(false);
                                    setActiveCameraView('cam1');
                                }
                            }}
                            className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50 min-w-[140px]"
                        >
                            <option value="M45" className="bg-gray-900 text-white">SAFe M45</option>
                            <option value="M90" className="bg-gray-900 text-white">SAFe M90</option>
                            <option value="MN180" className="bg-gray-900 text-white">SAFe MN180</option>
                            <option value="MN360" className="bg-gray-900 text-white">SAFe MN360</option>
                        </select>
                    </div>

                    {/* Modality Selector */}
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Imaging Modality</label>
                        <select
                            value={selectedModalityId}
                            onChange={(e) => applyModality(e.target.value)}
                            className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50 min-w-[180px]"
                        >
                            <option value="" className="bg-gray-900 text-white">Custom / None</option>
                            {modalities.filter(m => m.product === selectedProduct).map(m => (
                                <option key={m.id} value={m.id} className="bg-gray-900 text-white">{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="w-px h-8 bg-white/10 hidden md:block"></div>

                    {/* Filter Configuration */}
                    <div className="flex flex-wrap items-center gap-6">
                        {/* Camera 1 Filter */}
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block">
                                {['M90', 'MN360'].includes(selectedProduct) ? 'Transmission Camera (Cam T)' : 'Emission Filter'}
                            </label>
                            <select
                                value={cam1FilterId}
                                onChange={(e) => setCam1FilterId(e.target.value)}
                                className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50 min-w-[200px]"
                            >
                                {emissionFilters.map(f => (
                                    <option key={f.id} value={f.id} className="bg-gray-900 text-white">{f.name}</option>
                                ))}
                                {emissionFilters.length === 0 && <option value="" className="bg-gray-900 text-white">No filters available</option>}
                            </select>
                        </div>

                        {/* Camera 2 Filter (Only for Dual Cam) */}
                        {['M90', 'MN360'].includes(selectedProduct) && (
                            <>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Reflection Camera (Cam R)</label>
                                    <select
                                        value={cam2FilterId}
                                        onChange={(e) => setCam2FilterId(e.target.value)}
                                        className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50 min-w-[200px]"
                                    >
                                        {emissionFilters.map(f => (
                                            <option key={f.id} value={f.id} className="bg-gray-900 text-white">{f.name}</option>
                                        ))}
                                        {emissionFilters.length === 0 && <option value="" className="bg-gray-900 text-white">No filters available</option>}
                                    </select>
                                </div>

                                <div className="w-px h-8 bg-white/10 hidden md:block"></div>

                                {/* View Toggle & Compare */}
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Active Camera</label>
                                    <div className="flex items-center gap-3">
                                        <div className="flex bg-black/20 rounded-lg border border-white/5 p-0.5">
                                            <button
                                                onClick={() => setActiveCameraView('cam1')}
                                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${activeCameraView === 'cam1' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                            >
                                                Cam T
                                            </button>
                                            <button
                                                onClick={() => setActiveCameraView('cam2')}
                                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${activeCameraView === 'cam2' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                            >
                                                Cam R
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setIsCompareMode(!isCompareMode)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isCompareMode ? 'bg-white/10 text-white border-white/30' : 'text-gray-400 border-transparent hover:text-white'}`}
                                        >
                                            Compare
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Optics & Splitters Configuration (New Row) */}
                    {(dichroics.length > 0 || (hasSplitter && imagingSplitters.length > 0)) && (
                        <>
                            <div className="w-full h-px bg-white/10"></div>

                            <div className="flex flex-wrap gap-x-8 gap-y-4 w-full">
                                {/* SAFe Optics Chips */}
                                {dichroics.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block">
                                            Abbelight SAFe Excitation/Emission dichroic
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {dichroics.map(optic => (
                                                <button
                                                    key={optic.id}
                                                    onClick={() => toggleOptic(optic.id)}
                                                    className={`
                                                    px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                                                    ${optic.visible
                                                            ? 'bg-primary/20 text-primary border-primary/50 shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]'
                                                            : 'bg-black/20 text-gray-400 border-white/5 hover:text-white hover:border-white/10'}
                                                `}
                                                >
                                                    {optic.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Imaging Splitters Chips */}
                                {hasSplitter && imagingSplitters.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block">
                                            Imaging Splitters
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {imagingSplitters.map(splitter => (
                                                <button
                                                    key={splitter.id}
                                                    onClick={() => toggleImagingSplitter(splitter.id)}
                                                    className={`
                                                    px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                                                    ${splitter.visible
                                                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                                                            : 'bg-black/20 text-gray-400 border-white/5 hover:text-white hover:border-white/10'}
                                                `}
                                                >
                                                    {splitter.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                </div>
            </div>

            {/* Global Controls: Range & Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-sm">

                {/* Left: Range & Toggles */}
                <div className="flex items-center gap-6">
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

                    <div className="w-px h-6 bg-white/10 hidden md:block"></div>

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

                {/* Right: Tab Switcher */}
                <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
                    <button
                        onClick={() => setActiveTab('raw')}
                        className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'raw' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Raw Spectra
                    </button>
                    <button
                        onClick={() => setActiveTab('detected')}
                        className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'detected' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Detected Spectra
                    </button>
                </div>

                {/* Export Button */}
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-white text-black hover:bg-gray-200 transition-all disabled:opacity-50"
                >
                    {isExporting ? (
                        <span>Exporting...</span>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>Export Config</span>
                        </>
                    )}
                </button>
            </div>

            {/* Main Layout: Categories Left, Chart Right */}
            <div className="flex flex-col lg:flex-row gap-6">

                {/* Categories Sidebar */}
                <div className="w-full lg:w-72 flex flex-col gap-3 pr-1">

                    {/* Dye Type Filters */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm shrink-0 space-y-2">
                        <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Filter Types</div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowOrganicDyes(!showOrganicDyes)}
                                className={`flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-all ${showOrganicDyes ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/5 text-gray-500 border border-transparent hover:bg-white/10'}`}
                            >
                                <span className="w-2 h-2 rounded-full bg-blue-400" />
                                Dyes
                            </button>
                            <button
                                onClick={() => setShowFluorescentProteins(!showFluorescentProteins)}
                                className={`flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-all ${showFluorescentProteins ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-white/5 text-gray-500 border border-transparent hover:bg-white/10'}`}
                            >
                                <span className="w-2 h-2 rounded-full bg-green-400" />
                                Proteins
                            </button>
                        </div>
                    </div>

                    {categories.map(category => {
                        const categoryDyes = fluorophores.filter(f => {
                            if (f.category !== category) return false;
                            if (f.type === 'Fluorescent Protein' && !showFluorescentProteins) return false;
                            if (f.type !== 'Fluorescent Protein' && !showOrganicDyes) return false;
                            return true;
                        });
                        const isOpen = openCategories.includes(category);

                        return (
                            <div key={category} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm shrink-0">
                                <button
                                    onClick={() => toggleCategory(category)}
                                    className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${category === 'UV' ? 'bg-purple-400' : category === 'Blue' ? 'bg-blue-400' : category === 'Green' ? 'bg-green-400' : category === 'Red' ? 'bg-red-500' : 'bg-pink-600'}`} />
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

                {/* Chart & Metrics Area */}
                <div className="flex-1 w-full flex flex-col gap-4">
                    <div className="w-full bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 relative group flex flex-col lg:flex-row h-[600px] gap-4">
                        {/* Background Grid Pattern - Apply to whole box? Or just chart? Probably whole box looks nice, or maybe just chart area. Let's keep it on parent for cohesion. */}
                        <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none rounded-2xl" />

                        {/* Chart Component */}
                        <div className="flex-1 min-w-0 h-full relative" ref={chartContainerRef}>
                            {/* Warning Overlay if Cam R is relevant but no Splitter active */}
                            {(hasSplitter && (activeCameraView === 'cam2' || isCompareMode) && !imagingSplitters.some(s => s.visible)) && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                                    <div className="bg-black/80 backdrop-blur-md border border-white/20 px-6 py-3 rounded-xl text-white font-medium flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                        <span>Add Imaging Splitter to detect signal on Cam R</span>
                                    </div>
                                </div>
                            )}

                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart
                                    data={chartData}
                                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke={isExporting ? "#e5e7eb" : "#ffffff10"}
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="wavelength"
                                        type="number"
                                        domain={[minWavelength, maxWavelength]}
                                        allowDataOverflow={true}
                                        tick={{ fill: isExporting ? '#000000' : '#6B7280', fontSize: 10 }}
                                        tickLine={false}
                                        axisLine={{ stroke: isExporting ? '#000000' : '#ffffff20' }}
                                        label={{ value: 'Wavelength (nm)', position: 'insideBottom', offset: -10, fill: isExporting ? '#000000' : '#9CA3AF', fontSize: 10 }}
                                    />
                                    <YAxis hide domain={[0, 1.1]} />
                                    <Tooltip
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                // Grouping logic
                                                const fluorophores = payload.filter((p: any) => p.dataKey.includes('_ex') || p.dataKey.includes('_em'));
                                                const optics = payload.filter((p: any) => p.dataKey.includes('_optic') || p.dataKey.includes('_splitter'));
                                                const filters = payload.filter((p: any) => p.dataKey.includes('active_filter') || p.dataKey.includes('secondary_filter'));

                                                return (
                                                    <div className="bg-black/95 border border-white/20 p-3 rounded-lg shadow-2xl backdrop-blur-md text-xs min-w-[200px]">
                                                        <p className="text-gray-400 font-mono mb-2 border-b border-white/10 pb-1">{label} nm</p>

                                                        {/* Fluorophores */}
                                                        {fluorophores.length > 0 && (
                                                            <div className="mb-2 space-y-1">
                                                                <p className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Fluorophores</p>
                                                                {fluorophores.map((entry: any) => (
                                                                    <div key={entry.name} className="flex justify-between items-center gap-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                                            <span className="text-gray-200">{entry.name}</span>
                                                                        </div>
                                                                        <span className="font-mono text-gray-400">{(entry.value * 100).toFixed(0)}%</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Optics (Dichroics / Splitters) */}
                                                        {optics.length > 0 && (
                                                            <div className="mb-2 space-y-1">
                                                                <p className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Optics & Splitters</p>
                                                                {optics.map((entry: any) => (
                                                                    <div key={entry.name} className="flex justify-between items-center gap-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-0.5" style={{ backgroundColor: entry.color, borderTop: '1px dashed ' + entry.color }} />
                                                                            <span className="text-gray-200">{entry.name}</span>
                                                                        </div>
                                                                        <span className="font-mono text-gray-400">{(entry.value * 100).toFixed(0)}%</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Filters */}
                                                        {filters.length > 0 && (
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Filters</p>
                                                                {filters.map((entry: any) => (
                                                                    <div key={entry.name} className="flex justify-between items-center gap-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-0.5" style={{ backgroundColor: entry.color }} />
                                                                            <span className="text-gray-200">{entry.name}</span>
                                                                        </div>
                                                                        <span className="font-mono text-gray-400">{(entry.value * 100).toFixed(0)}%</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
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

                                    {/* Excitation (Only in Raw Tab) */}
                                    {fluorophores.map(dye => {
                                        if (!dye.visible || !showExcitation || activeTab === 'detected') return null;
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
                                                isAnimationActive={false}
                                            />
                                        );
                                    })}

                                    {/* Emission Primary */}
                                    {fluorophores.map(dye => {
                                        if (!dye.visible || !showEmission) return null;
                                        return (
                                            <Area
                                                key={`${dye.id}_em`}
                                                name={`${dye.name} (Em)`}
                                                type="monotone"
                                                dataKey={`${dye.id}_em`}
                                                stroke={dye.color}
                                                strokeWidth={2}
                                                fill={`url(#grad_${dye.id})`}
                                                fillOpacity={0.4}
                                                dot={false}
                                                isAnimationActive={true}
                                                animationDuration={1000}
                                            />
                                        );
                                    })}

                                    {/* Emission Secondary (Ghost for comparison) */}
                                    {fluorophores.map(dye => {
                                        if (!dye.visible || !showEmission || !isCompareMode) return null;
                                        return (
                                            <Line
                                                key={`${dye.id}_em_secondary`}
                                                name={`${dye.name} (Other Cam)`}
                                                type="monotone"
                                                dataKey={`${dye.id}_em_secondary`}
                                                stroke={dye.color}
                                                strokeWidth={1.5}
                                                strokeDasharray="2 2"
                                                strokeOpacity={0.5}
                                                dot={false}
                                                isAnimationActive={true}
                                            />
                                        );
                                    })}

                                    {/* Dichroics (Only in Detected Tab) */}
                                    {activeTab === 'detected' && dichroics.map(optic => {
                                        if (!optic.visible) return null;
                                        return (
                                            <Line
                                                key={optic.id}
                                                name={`${optic.name} (Dichroic)`}
                                                type="monotone"
                                                dataKey={`${optic.id}_optic`}
                                                stroke={optic.color}
                                                strokeWidth={1}
                                                strokeDasharray="4 4"
                                                dot={false}
                                                isAnimationActive={false}
                                            />
                                        );
                                    })}

                                    {/* Imaging Splitters (Only in Detected Tab) */}
                                    {activeTab === 'detected' && imagingSplitters.map(splitter => {
                                        if (!splitter.visible) return null;
                                        return (
                                            <Line
                                                key={splitter.id}
                                                name={`${splitter.name} (${activeCameraView === 'cam1' ? 'T' : 'R'})`}
                                                type="monotone"
                                                dataKey={`${splitter.id}_splitter`}
                                                stroke="#3B82F6" // Blue-500
                                                strokeWidth={2}
                                                strokeDasharray="6 2"
                                                dot={false}
                                                isAnimationActive={true}
                                            />
                                        );
                                    })}

                                    {/* Active Filter Rendering (Only in Detected Tab) */}
                                    {activeTab === 'detected' && (
                                        <Line
                                            name="Emission Filter"
                                            type="monotone"
                                            dataKey="active_filter"
                                            stroke="#FFD700"
                                            strokeWidth={2}
                                            strokeDasharray="4 2"
                                            dot={false}
                                            isAnimationActive={true}
                                        />
                                    )}

                                    {/* Secondary Filter Rendering (Only in Detected Tab + Compare Mode) */}
                                    {activeTab === 'detected' && isCompareMode && (
                                        <Line
                                            name={`Emission Filter (${activeCameraView === 'cam1' ? 'Cam R' : 'Cam T'})`}
                                            type="monotone"
                                            dataKey="secondary_filter"
                                            stroke="#FFA500"
                                            strokeWidth={2}
                                            strokeDasharray="2 4"
                                            strokeOpacity={0.7}
                                            dot={false}
                                            isAnimationActive={true}
                                        />
                                    )}

                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Hidden Report Component - Rendered only for export */}
                        {isExporting && (
                            <SpectraReport
                                ref={reportRef}
                                chartData={chartData}
                                product={selectedProductData}
                                modalityName={modalities.find(m => m.id === selectedModalityId)?.name}
                                fluorophores={fluorophores}
                                dichroics={dichroics}
                                emissionFilters={emissionFilters}
                                imagingSplitters={imagingSplitters}
                                cam1FilterId={cam1FilterId}
                                cam2FilterId={cam2FilterId}
                                minWavelength={minWavelength}
                                maxWavelength={maxWavelength}
                                efficiencyMetrics={efficiencyMetrics}
                            />
                        )}

                        {/* Metrics Sidebar (Right Side) */}
                        {activeTab === 'detected' && (
                            <div className="w-full lg:w-72 bg-black/20 border-t lg:border-t-0 lg:border-l border-white/10 p-0 lg:pl-4 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider sticky top-0 bg-[#0c0c16]/90 backdrop-blur-md py-2 z-10 border-b border-white/5">
                                    Efficiency Metrics
                                </h3>
                                <div className="space-y-4">
                                    {categories.map(category => {
                                        const categoryDyes = fluorophores.filter(f => f.visible && f.category === category);
                                        if (categoryDyes.length === 0) return null;

                                        return (
                                            <div key={category}>
                                                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                                                    {category}
                                                </h4>
                                                <div className="space-y-2">
                                                    {categoryDyes.map(dye => {
                                                        const isDual = ['M90', 'MN360'].includes(selectedProduct);

                                                        // ALWAYS Calculate Cam T (Cam 1) Stats
                                                        const cam1Stats = calculateEfficiency(dye, cam1FilterId, 'cam1');
                                                        const p1 = (cam1Stats.ratio * 100).toFixed(1);

                                                        // Calculate Cam R (Cam 2) Stats if Dual
                                                        let p2 = null;
                                                        let splitRatioT = 0;
                                                        if (isDual) {
                                                            const cam2Stats = calculateEfficiency(dye, cam2FilterId, 'cam2');
                                                            p2 = (cam2Stats.ratio * 100).toFixed(1);

                                                            const totalEff = cam1Stats.ratio + cam2Stats.ratio;
                                                            splitRatioT = totalEff > 0 ? (cam1Stats.ratio / totalEff) * 100 : 0;
                                                        }

                                                        return (
                                                            <div key={dye.id} className="bg-white/5 rounded-lg p-2 border border-white/5 hover:border-white/10 transition-colors">
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dye.color }}></div>
                                                                    <span className="text-xs font-medium text-gray-200 truncate">{dye.name}</span>
                                                                </div>

                                                                <div className="flex items-center gap-2 mb-2">
                                                                    {/* Cam T (Always Left) */}
                                                                    <div className={`flex-1 bg-black/30 rounded px-2 py-1 flex justify-between items-center ${activeCameraView === 'cam1' || !isDual ? 'opacity-100' : 'opacity-60'}`}>
                                                                        <span className="text-[9px] text-gray-500 uppercase">CAM T</span>
                                                                        <span className={`text-sm font-bold ${Number(p1) > 50 ? 'text-green-400' : Number(p1) > 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                                            {p1}%
                                                                        </span>
                                                                    </div>

                                                                    {/* Cam R (Always Right, if Dual) */}
                                                                    {isDual && p2 && (
                                                                        <div className={`flex-1 bg-black/30 rounded px-2 py-1 flex justify-between items-center ${activeCameraView === 'cam2' ? 'opacity-100' : 'opacity-60'}`}>
                                                                            <span className="text-[9px] text-gray-500 uppercase">CAM R</span>
                                                                            <span className={`text-sm font-bold ${Number(p2) > 50 ? 'text-green-400' : Number(p2) > 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                                                {p2}%
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Split Ratio Bar (Only Dual) */}
                                                                {isDual && (
                                                                    <div className="space-y-1">
                                                                        <div className="flex justify-between text-[9px] text-gray-400">
                                                                            <span>Split Ratio (Cam T)</span>
                                                                            <span>{splitRatioT.toFixed(0)}%</span>
                                                                        </div>
                                                                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden flex">
                                                                            <div
                                                                                className="h-full bg-blue-500 transition-all duration-500"
                                                                                style={{ width: `${splitRatioT}%` }}
                                                                            />
                                                                            <div
                                                                                className="h-full bg-indigo-500 transition-all duration-500"
                                                                                style={{ width: `${100 - splitRatioT}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {fluorophores.filter(f => f.visible).length === 0 && (
                                        <div className="text-xs text-gray-500 italic text-center py-4">Select dyes to view metrics.</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Old Metrics Panel Removed */}
                </div>
            </div >
        </div >
    );
}
