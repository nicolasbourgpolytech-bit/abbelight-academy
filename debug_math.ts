
// Paste the logic from src/data/spectra.ts here to test it

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

const asymmetricGaussian = (x: number, peak: number, width: number, skew: number): number => {
    const t = (x - peak) / width;
    const gauss = Math.exp(-0.5 * t * t);
    const skewFactor = 1 + erf(skew * t / Math.sqrt(2));
    return gauss * skewFactor;
};

const generateSpectrum = (peak: number, width: number, skew: number, range: number[]) => {
    let maxVal = 0;
    const rawPoints = range.map(nm => {
        const val = asymmetricGaussian(nm, peak, width, skew);
        if (val > maxVal) maxVal = val;
        return { wavelength: nm, value: val };
    });

    return rawPoints.map(p => ({
        wavelength: p.wavelength,
        value: p.value / maxVal
    })).filter(p => p.value > 0.01);
};

const RANGE = Array.from({ length: 501 }, (_, i) => 300 + i);

console.log("Testing erf(0):", erf(0));
console.log("Testing erf(1):", erf(1));
console.log("Testing gauss(358, 358, 20, 0.5):", asymmetricGaussian(358, 358, 20, 0.5));

const dapiEx = generateSpectrum(358, 20, 0.5, RANGE);
console.log("DAPI Ex Points:", dapiEx.length);
console.log("DAPI Ex Sample:", dapiEx.slice(0, 5));
