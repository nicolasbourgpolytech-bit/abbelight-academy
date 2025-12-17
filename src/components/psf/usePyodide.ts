import { useState, useEffect, useRef } from 'react';

declare global {
    interface Window {
        loadPyodide: (config: any) => Promise<any>;
    }
}

export type PyodideState = "LOADING" | "READY" | "ERROR";

export function usePyodide() {
    const [state, setState] = useState<PyodideState>("LOADING");
    const pyodideRef = useRef<any>(null);
    const simulatorModuleRef = useRef<any>(null);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                if (pyodideRef.current) {
                    if (mounted) setState("READY");
                    return;
                }

                console.log("Loading Pyodide script...");
                // 1. Load the script tag if not present
                if (!document.querySelector('script[src*="pyodide.js"]')) {
                    const script = document.createElement('script');
                    script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js";
                    script.async = true;
                    document.body.appendChild(script);
                    await new Promise((resolve) => {
                        script.onload = resolve;
                    });
                } else if (!window.loadPyodide) {
                    // Wait for existing script to define global
                    await new Promise(r => setTimeout(r, 500));
                }

                console.log("Initializing Pyodide...");
                // 2. Initialize Pyodide
                const pyodide = await window.loadPyodide({
                    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
                });

                // 3. Load Packages
                console.log("Loading packages...");
                await pyodide.loadPackage(['numpy', 'scipy', 'matplotlib']);

                // 4. Load the Simulation Code
                console.log("Fetching simulator code...");
                const response = await fetch('/python/PSF_simulator.py');
                const code = await response.text();

                // Write to virtual file system so it can be imported
                pyodide.FS.writeFile("PSF_simulator.py", code);

                // Import it to ensure it's valid and available
                // We'll run a small script to import it and keep a reference if needed, 
                // or just rely on 'import PSF_simulator' in subsequent calls.
                await pyodide.runPythonAsync(`
                    import sys
                    import PSF_simulator
                    from PSF_simulator import OpticalFourierMicroscope
                    print("PSF Simulator loaded successfully")
                `);

                pyodideRef.current = pyodide;
                if (mounted) setState("READY");

            } catch (err) {
                console.error("Failed to load Pyodide:", err);
                if (mounted) setState("ERROR");
            }
        };

        load();

        return () => {
            mounted = false;
        };
    }, []);

    // Helper to run code with the simulator
    // params needs to match the Simulate Isotropic args
    const runSimulation = async (
        microscopeParams: any,
        simParams: any
    ) => {
        if (!pyodideRef.current) throw new Error("Pyodide not ready");

        // We define a python script that instantiates/uses the microscope
        // We pass data via global variables or converting js objects

        const py = pyodideRef.current;

        // Expose params to Python
        // We'll use a temporary dictionary for safer data passing
        const globals = py.toPy({
            ...microscopeParams,
            ...simParams
        });

        // This script instantiates the microscope (if params changed/first run) and then runs simulation
        // Note: For performance, we should ideally keep the microscope instance alive
        // and only re-create if microscopeParams change.
        // For now, to keep it simple and robust, we might re-instantiate or check.
        // Let's implement a singleton pattern in the Python side or handle it here.

        // We will maintain a global 'sim_instance' in the python namespace.
        const script = `
            import js
            import numpy as np
            from PSF_simulator import OpticalFourierMicroscope

            # Access the passed parameters
            params = dict(globals_dict)
            
            # Check if we need to (re)initialize the microscope
            # We can store the last used config in a global variable
            if 'current_microscope' not in locals() and 'current_microscope' not in globals():
                current_microscope = None
                last_conf = {}

            # Determine if config changed (simplified check: just always init for now or check key vals)
            # Re-initializing is not THAT expensive compared to the Green's tensor calc? 
            # Actually Green's tensor usage IS the expensive part of the class?
            # Looking at source: calculate_greens_tensor_bfp is called lazily or stored?
            # sim.G_bfp is cached in 'simulate_isotropic' line 440.
            # So we MUST persist the instance.

            # Simple comparison of crucial keys
            re_init = False
            if current_microscope is None:
                re_init = True
            elif (last_conf.get('NA') != params.get('NA') or 
                  last_conf.get('lambda_vac') != params.get('lambda_vac') or
                  last_conf.get('n_imm') != params.get('n_imm') or
                  last_conf.get('n_sample') != params.get('n_sample') or
                  last_conf.get('M_obj') != params.get('M_obj')):
                  re_init = True

            if re_init:
                current_microscope = OpticalFourierMicroscope(
                    NA=float(params.get('NA', 1.49)),
                    lambda_vac=float(params.get('lambda_vac', 600e-9)),
                    n_imm=float(params.get('n_imm', 1.518)),
                    n_sample=float(params.get('n_sample', 1.33)),
                    M_obj=float(params.get('M_obj', 100)),
                    f_tube=float(params.get('f_tube', 0.180))
                )
                last_conf = params.copy()
            
            # Astigmatism Phase Mask Calculation
            astig_val = params.get('astigmatism', 'None')
            phase_mask = None
            f_cyl = 0
            
            if astig_val == "Weak":
                f_cyl = -25.0 # meters? No guide said -25000/1000 = -25? Wait.
                # Guide: f_cyl_m = -25000 / 1000.0  => -25 meters.
                # "None", "Weak", "Strong" 
                phase_mask = current_microscope.compute_cylindrical_phase(-25.0)
            elif astig_val == "Strong":
                phase_mask = current_microscope.compute_cylindrical_phase(-16.0)

            # Run Simulation
            img, bfp, ext_cam, ext_bfp, bfp_phase = current_microscope.simulate_isotropic(
                z_defocus=float(params.get('z_defocus', 0.0)),
                phase_mask=phase_mask,
                oversampling=int(params.get('oversampling', 3)),
                cam_pixel_um=float(params.get('cam_pixel_um', 6.5))
            )

            # Prepare output as a dictionary
            # Convert numpy arrays to lists or direct buffers? 
            # to_js() on numpy array works well in recent Pyodide versions
            result = {
                "img": img,
                "bfp": bfp,
                "ext_cam": ext_cam,
                "ext_bfp": ext_bfp,
                "bfp_phase": bfp_phase
            }
            result
        `;

        try {
            const result = await py.runPythonAsync(script, { globals: globals });
            const jsResult = result.toJs({ dict_converter: Object.fromEntries, create_proxies: false });

            // Clean up
            globals.destroy();
            result.destroy();

            return jsResult;
        } catch (e) {
            console.error("Simulation Error", e);
            throw e;
        }
    };

    return { state, runSimulation, error };
}
