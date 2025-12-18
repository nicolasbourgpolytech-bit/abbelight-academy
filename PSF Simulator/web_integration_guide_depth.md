# Web Integration Guide: Interface Depth & Auto-Focus

This guide details the implementation of the Depth-Induced Spherical Aberration and the Relative Auto-Focus logic for the web version of the simulator.

## 1. New Parameters

### Interface Depth ($d$)
*   **Definition:** Distance of the molecule from the coverglass interface.
*   **Units:** Micrometers (µm).
*   **Range:** 0 to 5.0 µm.
*   **Default:** 0.

## 2. Physics Model

### SAF & Aberration
The simulation must account for the propagation of light within the sample medium (index $n_{\text{sample}}$) before entering the immersion medium (index $n_{\text{imm}}$).

**Phase Term:**
A phase factor is applied to the Green's Tensor in the Back Focal Plane:
$$ \Phi_{\text{depth}} = e^{i \cdot k_{\text{sample}} \cdot d \cdot \cos(\theta_{\text{sample}})} $$

*   This naturally models **Spherical Aberration** due to index mismatch.
*   It also models **SAF (Supercritical Angle Fluorescence)** decay for dipoles near the interface.

## 3. Auto-Focus Logic (Relative Mode)

The "Z Defocus" slider in the GUI operates in **Relative Mode**.
*   **0** on the slider corresponds to the **Theoretical Best Focus** at that depth.
*   Positive/Negative values represent manual offsets from this optimal position.

### High-NA Focus Shift Formula
Due to the high numerical aperture (1.49) and index mismatch (1.518 vs 1.33), the focal shift is non-linear. We use an empiricalsquared correction that matches experimental data:

$$ Z_{\text{shift}} \approx - \text{Depth} \times \left( \frac{n_{\text{imm}}}{n_{\text{sample}}} \right)^2 $$

### Total Defocus Calculation
The value passed to the simulation engine ($Z_{\text{input}}$) is:

$$ Z_{\text{total}} = Z_{\text{slider}} + Z_{\text{shift}} $$

**Total Z** is the physical distance of the objective from the coverglass surface.

## 4. Slider Range (Dynamic)

To provide precise control, the user slider range is dynamically restricted based on the theoretical Depth of Field (Axial Resolution), multiplied by a factor of 4 for usability.

$$ \text{Range}_{\text{limit}} = \pm \frac{4 \cdot n_{\text{imm}} \cdot \lambda}{NA^2} $$

*   **Example (NA 1.49, Oil, Cyan):** Range $\approx \pm 1.64 \text{ µm}$.
*   When parameters change, this range must be recalculated.

## 5. Preset Buttons

Recommended presets for the UI:
*   **0 nm:** Surface (Shift = 0).
*   **500 nm**
*   **1000 nm**
*   **3000 nm**
*   **5000 nm:** Deep (Shift $\approx$ -6.5 µm).

**Action:**
Clicking a preset sets the `Depth` and resets `Z Defocus Slider` to **0**.
