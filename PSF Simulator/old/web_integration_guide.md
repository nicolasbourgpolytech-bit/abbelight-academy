# PSF Simulator Web Integration Guide

This guide explains how to integrate the python-based PSF simulation logic (`PSF_simulator.py`) into a web application (e.g., Next.js, React) using Pyodide.

## 1. Core File to Transfer

You only need to transfer **one** file:

*   **`PSF_simulator.py`**: This is the standalone simulation library containing all physics, astigmatism logic, and resampling code.

## 2. Dependencies

The Python environment (Pyodide) requires the following packages:
*   `numpy`
*   `scipy`
*   `matplotlib` (imported in the file, though mostly used for internal definitions, it is safe to include).

In your Pyodide initialization script (JavaScript/TypeScript):
```javascript
await pyodide.loadPackage(['numpy', 'scipy', 'matplotlib']);
```

## 3. Usage Strategy

The recommended pattern is to instantiate the microscope object **once** (which calculates the expensive Green's Tensor) and then call the simulation method repeatedly when parameters change.

### Step A: Initialization (Run Once)

Initialize the `OpticalFourierMicroscope` class with the system parameters.
**Important**: If the user changes `lambda_vac` (Wavelength), you MUST re-initialize this object.

```python
from PSF_simulator import OpticalFourierMicroscope

# Initialize with system defaults
sim = OpticalFourierMicroscope(
    NA=1.49,
    lambda_vac=0.600e-6,  # 600 nm -> Convert to meters!
    n_imm=1.518,
    n_sample=1.33,
    M_obj=100,
    f_tube=0.180
)
```

### Step B: Simulation Update (On Interaction)

When the user changes Defocus or Astigmatism, call `simulate_isotropic`.

```python
# Parameters from UI (example values)
z_def_m = 0.5 * 1e-6       # 0.5 um defocus
astig_val = "Weak"         # User selection

# 1. Calculate Astigmatism Phase Mask (if needed)
phase_mask = None
if astig_val == "Weak":
    f_cyl_m = -25000 / 1000.0 # Convert mm to m
    phase_mask = sim.compute_cylindrical_phase(f_cyl_m)
elif astig_val == "Strong":
    f_cyl_m = -16000 / 1000.0
    phase_mask = sim.compute_cylindrical_phase(f_cyl_m)

# 2. Run Simulation
# Returns 5 parameters strictly:
img, bfp, ext_cam, ext_bfp, bfp_phase = sim.simulate_isotropic(
    z_defocus=z_def_m,
    phase_mask=phase_mask,
    oversampling=3, # Default: 3
    cam_pixel_um=6.5
)
```

## 4. Key Outputs Explained

The `simulate_isotropic` method returns 5 values:

1.  **`img` (2D Array)**: The final PSF image, downsampled to match the camera pixel size. Ready for display.
2.  **`bfp` (2D Array)**: The Back Focal Plane intensity.
3.  **`ext_cam` (List [min, max, min, max])**: Expect physical extent of the PSF image in microns. Use this for axis labeling.
4.  **`ext_bfp` (List [min, max, min, max])**: Physical extent of the BFP in mm.
5.  **`bfp_phase` (2D Array)**: The phase of the Z-dipole component. Use `cmap='twilight'` to visualize this to see the supercritical phase shift.

## 5. UI & Visualization Recommendations

### A. Wavelength-Dependent Coloring
The user experience is much better if the images match the simulated light color.
*   **Input**: Convert the chosen Wavelength (e.g., 488nm, 532nm, 642nm) to a Hex/RGB color (e.g., Cyan, Green, Red).
*   **PSF Plot**: Instead of gray, apply a custom colormap that goes from Black -> Wavelength Color -> White (or just Black -> Color).
*   **BFP Plot**: Similarly, tinted maps make it visually cohesive.

### B. Critical Angle Visualization (BFP)
To visualize the "Sub-critical" (propagating) and "Super-critical" (evanescent) zones in the BFP:
1.  **Check Condition**: Visualization is only relevant if $NA > n_{sample}$.
2.  **Calculate Radius**:
    *   The BFP image extent (`ext_bfp`) corresponds to the full Numerical Aperture ($R_{max} \propto NA$).
    *   The Critical Angle radius is: $R_{crit} = R_{max} \times (n_{sample} / NA)$.
3.  **Draw Overlay**:
    *   Draw a dashed circle at radius $R_{crit}$.
    *   **Zone < $R_{crit}$**: Label "Sub-critical".
    *   **Zone > $R_{crit}$**: Label "Super-critical".
    *   *Note: This is where the Z-dipole phase jump occurs.*

### C. Gaussian Fitting
For the PSF profile plotting (if implemented in web):
*   Perform a 1D Gaussian fit on the cross-sections.
*   Display $\sigma_x$ and $\sigma_y$.
