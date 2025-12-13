
export interface SpectrumPoint {
    wavelength: number;
    value: number;
}

export interface FluorophoreData {
    id: string;
    label: string;
    color: string;
    excitation: SpectrumPoint[];
    emission: SpectrumPoint[];
}

// Standalone Error Function approximation
const erf = (x: number): number => {
    // maximal error: 1.5e-7
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
};

// Helper: Asymmetric Gaussian (Skewed Normal Distribution) to mimic real spectra
// x: wavelength
// peak: peak wavelength
// width: standard deviation (controls width)
// skew: controls the "tail" (positive for right-tail emission, negative for left-tail excitation usually)
const asymmetricGaussian = (x: number, peak: number, width: number, skew: number): number => {
    const t = (x - peak) / width;
    // Standard Gaussian
    const gauss = Math.exp(-0.5 * t * t);
    // Skew factor (Error function approximation)
    // This adds the "tail" characteristic of real spectra
    const skewFactor = 1 + erf(skew * t / Math.sqrt(2));

    return gauss * skewFactor;
};




// Generate full spectrum array
const generateSpectrum = (peak: number, width: number, skew: number, range: number[]): SpectrumPoint[] => {
    // We normalize the peak to 1.0
    let maxVal = 0;
    const rawPoints = range.map(nm => {
        const val = asymmetricGaussian(nm, peak, width, skew);
        if (val > maxVal) maxVal = val;
        return { wavelength: nm, value: val };
    });

    // Do not filter low values to maintain index alignment with WAVELENGTHS array (0..500)
    return rawPoints.map(p => ({
        wavelength: p.wavelength,
        value: p.value / maxVal
    }));
};

const generateMultiPeakSpectrum = (components: { peak: number, width: number, skew: number, weight: number }[], range: number[]): SpectrumPoint[] => {
    let maxVal = 0;
    const rawPoints = range.map(nm => {
        let val = 0;
        components.forEach(c => {
            val += c.weight * asymmetricGaussian(nm, c.peak, c.width, c.skew);
        });
        if (val > maxVal) maxVal = val;
        return { wavelength: nm, value: val };
    });

    return rawPoints.map(p => ({
        wavelength: p.wavelength,
        value: p.value / (maxVal || 1)
    }));
};

const RANGE = Array.from({ length: 701 }, (_, i) => 200 + i); // 200nm to 900nm

// --- DEFINITIONS ---

export const FLUOROPHORE_DATA: Record<string, FluorophoreData> = {
    dapi: {
        id: 'dapi',
        label: 'DAPI',
        color: '#00CAF8', // Cyan
        // DAPI Ex: ~358nm, narrow. Skewed slightly right.
        excitation: generateSpectrum(358, 20, 0.5, RANGE),
        // DAPI Em: ~461nm, broad. Significant right skew (tail).
        emission: generateSpectrum(461, 35, 2, RANGE)
    },
    alexa488: {
        id: 'alexa488',
        label: 'Alexa Fluor 488',
        color: '#00D296', // Green
        // Ex: 490nm (Absorption spectrum often has a shoulder, effectively modeled by a wider skew)
        excitation: generateSpectrum(499, 15, -1, RANGE), // Sharp peak near 499
        // Em: 520nm, classic asymmetric tail
        emission: generateSpectrum(520, 20, 3, RANGE)
    },
    cf568: {
        id: 'cf568',
        label: 'CF568',
        color: '#FF9B35', // Orange
        // Ex: 562nm
        excitation: generateSpectrum(562, 18, -0.5, RANGE),
        // Em: 583nm
        emission: generateSpectrum(583, 22, 2.5, RANGE)
    },
    af647: {
        id: 'af647',
        label: 'Alexa Fluor 647',
        color: '#FF73FF', // Magenta/Far Red
        // Deep red/NIR dye.
        // Matches user requested "Sum of Gaussians" model.
        excitation: generateMultiPeakSpectrum([
            { peak: 650, width: 14, skew: 0, weight: 1.0 },   // Main sharp peak
            { peak: 605, width: 20, skew: 0, weight: 0.25 },  // Approx 25% shoulder at 605nm
            { peak: 560, width: 35, skew: 0, weight: 0.05 }   // Wide low tail
        ], RANGE),

        emission: generateMultiPeakSpectrum([
            { peak: 665, width: 15, skew: 0, weight: 1.0 },   // Main peak shifted to 665nm (standard)
            { peak: 705, width: 28, skew: 0, weight: 0.32 },  // Shoulder shifted to 705nm
            { peak: 750, width: 45, skew: 0, weight: 0.12 }   // Tail
        ], RANGE)
    }
};

export const AVAILABLE_DYES = Object.values(FLUOROPHORE_DATA);
