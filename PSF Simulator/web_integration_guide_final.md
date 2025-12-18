# Web Integration Guide (Final)

This document outlines the specifications for the web interface of the PSF Simulator, incorporating Depth, Auto-Focus, and the new Correction Collar features.

## 1. User Interface Layout

The interface should display **two simultaneous viewports**:
1.  **Image Plane (PSF Intensity)** - Left.
2.  **Back Focal Plane (BFP Phase)** - Right.

### BFP Phase View (Right Viewport)
*   **Data Source:** The `bfp_phase` output from the simulation (Pupil Function).
*   **Content:** Pure system phase (Aberration Map).
    *   Shows Spherical Aberration (Rings), Astigmatism (Saddle), Defocus.
    *   **NO** dipoles, **NO** UAF/SAF circles overlay (keep cleaner view).
*   **Colormap:** `Twilight` (Cyclic).
    *   This map connects white to black to white, perfect for phase wrapping.
    *   Alternative: `HSV` (if full rainbow desired).
*   **Scale (Colorbar):**
    *   **Units:** Radians.
    *   **Range:** $-\pi$ to $+\pi$ (Wrapped Phase).
    *   Display a colorbar labeled "Phase (rad)".

## 2. Control Parameters

Organize inputs into the following logical sections:

### A. Objective Lens Parameters
*   **Numerical Aperture (NA):** (e.g., 1.49).
*   **Magnification (M):** (e.g., 100).
*   **Immersion Index ($n_{imm}$):** (e.g., 1.518).
*   **Correction Collar (Ring):** [NEW]
    *   **Type:** Slider.
    *   **Label:** "Correction Collar".
    *   **Range:** -15.0 to +15.0.
    *   **Unit:** Arbitrary Unit (SA Amplitude in Rad/$\rho^4$).
    *   **Function:** Adds Spherical Aberration to cancel depth effects.

### B. Sample Parameters
*   **Sample Index ($n_{sample}$):** (e.g., 1.33).
*   **Interface Depth ($d$):**
    *   **Type:** Slider + Presets.
    *   **Range:** 0 to 5.0 µm.
    *   **Presets:** 0, 500, 1000, 3000, 5000 nm.
    *   **Effect:** Introduces Spherical Aberration & Focus Shift.

### C. Camera Parameters
*   **Pixel Size:** (e.g., 6.5 µm).

### D. Aberrations (Optical)
*   **Z Defocus:**
    *   **Mode:** Relative (0 = Best Focus).
    *   **Range:** Dynamic ($\pm 4 \cdot \text{DOF}$).
*   **Astigmatism:** (None, Low, Medium, Strong).

## 3. Phase Calculation & Statistics Logic (Web Implementation)

Since the core simulation is already ported, here is the specific logic for the **Aberration Bar Chart**:

### A. Total Phase Map (For BFP Visualization)
$$ \Phi_{\text{total}} = \Phi_{\text{depth}} + \Phi_{\text{defocus}} + \Phi_{\text{astig}} + \Phi_{\text{ext}} + \Phi_{\text{collar}} $$
*   **Visualize:** `angle(exp(1j * TotalPhase))` using a cyclic colormap (Twilight).

### B. Aberration Statistics (For Bar Chart)
Calculate the **Peak-to-Valley (PV)** magnitude (in Radians) for each component within the pupil ($\rho \le 1$).

1.  **Depth Power:**
    $$ P_{\text{depth}} = \text{PV}(\Phi_{\text{depth}}) = \max(\Phi_{\text{depth}}) - \min(\Phi_{\text{depth}}) $$
2.  **Defocus Power:**
    $$ P_{\text{defocus}} = \text{PV}(\Phi_{\text{defocus}}) $$
3.  **Astigmatism Power (Crucial):**
    *   Must sum Zernike contribution and External Mask (Cylindrical Lens).
    $$ P_{\text{astig}} = \text{PV}(\Phi_{\text{astig}} + \Phi_{\text{ext}}) $$
4.  **Collar Power:**
    $$ P_{\text{collar}} = \text{PV}(\Phi_{\text{collar}}) $$

**Display:** Render these 4 values as a Bar Chart. The user's goal is to match $P_{\text{collar}} \approx P_{\text{depth}}$.

To help users understand the contributions of different aberrations, display a **Bar Chart** (overlay or adjacent to the BFP view).

*   **Metric:** Peak-to-Valley (PV) Phase Magnitude in **Radians**.
*   **Components to Display:**
    1.  **Depth:** PV of $\Phi_{depth}$ (The problem to correct).
    2.  **Defocus:** PV of $\Phi_{defocus}$ (Focus offset).
    3.  **Astigmatism:** PV of $\Phi_{astig}$ (Cylindrical terms).
    4.  **Collar:** PV of $\Phi_{collar}$ (The correction applied).
*   **Goal:** The user adjusts the "Collar" until its bar roughly cancels/matches the "Depth" impact (visually flattening the phase map).
