import tkinter as tk
from tkinter import ttk
import matplotlib.pyplot as plt
import matplotlib
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from mpl_toolkits.axes_grid1 import make_axes_locatable
import numpy as np
from scipy.optimize import curve_fit
from PSF_simulator import OpticalFourierMicroscope

class PSFGui(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("PSF Simulator (Telecentric Path)")
        self.geometry("1400x900")
        
        # --- Variables ---
        self.na = tk.DoubleVar(value=1.49)
        self.n_imm = tk.DoubleVar(value=1.518)
        self.n_sample = tk.DoubleVar(value=1.33)
        self.mag = tk.DoubleVar(value=100.0)
        self.z_defocus_um = tk.DoubleVar(value=0.0)
        self.cam_pix = tk.DoubleVar(value=6.5)
        self.oversamp = tk.IntVar(value=3)
        
        # Determine f_obj and f_tube standard
        # Standard Olympus/Nikon tube lens f = 180mm?
        # M = f_tube / f_obj  => f_obj = f_tube / M
        # We assume f_tube = 180mm (0.180m)
        self.f_tube_mm = 180.0
        
        # --- Layout ---
        main_frame = ttk.Frame(self)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Control Panel (Left)
        control_frame = ttk.Frame(main_frame, width=300, padding=10)
        control_frame.pack(side=tk.LEFT, fill=tk.Y)
        
        row = 0
        ttk.Label(control_frame, text="Microscope Settings", font=("Arial", 14, "bold")).grid(row=row, column=0, columnspan=2, pady=10); row+=1
        
        # NA
        ttk.Label(control_frame, text="NA:").grid(row=row, column=0, sticky=tk.W)
        ttk.Entry(control_frame, textvariable=self.na).grid(row=row, column=1); row+=1
        
        # n_imm
        ttk.Label(control_frame, text="n_imm:").grid(row=row, column=0, sticky=tk.W)
        ttk.Entry(control_frame, textvariable=self.n_imm).grid(row=row, column=1); row+=1
        
        # n_sample
        ttk.Label(control_frame, text="n_sample:").grid(row=row, column=0, sticky=tk.W)
        ttk.Entry(control_frame, textvariable=self.n_sample).grid(row=row, column=1); row+=1
        
        # Magnification
        ttk.Label(control_frame, text="Obj Mag (M):").grid(row=row, column=0, sticky=tk.W)
        ttk.Entry(control_frame, textvariable=self.mag).grid(row=row, column=1); row+=1

        # Wavelength (NEW)
        self.wavelength_um = tk.DoubleVar(value=0.600) # Default 600nm
        ttk.Label(control_frame, text="Wavelength (um):").grid(row=row, column=0, sticky=tk.W)
        ttk.Entry(control_frame, textvariable=self.wavelength_um).grid(row=row, column=1); row+=1
        
        ttk.Button(control_frame, text="Update System", command=self.run_simulation_full).grid(row=row, column=0, columnspan=2, pady=10); row+=1
        
        ttk.Separator(control_frame, orient=tk.HORIZONTAL).grid(row=row, column=0, columnspan=2, sticky="ew", pady=10); row+=1
        
        # Dynamic Controls
        ttk.Label(control_frame, text="Interactive Controls", font=("Arial", 14, "bold")).grid(row=row, column=0, columnspan=2, pady=10); row+=1
        
        # Z Defocus
        ttk.Label(control_frame, text="Z Defocus (µm):").grid(row=row, column=0, sticky=tk.W)
        self.scale_z = tk.Scale(control_frame, variable=self.z_defocus_um, from_=-1.0, to=1.0, resolution=0.01, orient=tk.HORIZONTAL, command=lambda v: self.run_fast_update())
        self.scale_z.grid(row=row, column=1, sticky="ew"); row+=1
        
        # Interface Depth
        self.depth_um = tk.DoubleVar(value=0.0)
        ttk.Label(control_frame, text="Interface Depth (µm):").grid(row=row, column=0, sticky=tk.W)
        scale_depth = tk.Scale(control_frame, variable=self.depth_um, from_=0.0, to=5.0, resolution=0.05, orient=tk.HORIZONTAL, command=lambda v: self.run_fast_update())
        scale_depth.grid(row=row, column=1, sticky="ew"); row+=1
        
        # Depth Presets Frame
        frame_presets = ttk.Frame(control_frame)
        frame_presets.grid(row=row, column=0, columnspan=2, pady=2, sticky="ew"); row+=1
        
        presets = [0, 500, 1000, 3000, 5000] # nm
        for p in presets:
            btn = ttk.Button(frame_presets, text=f"{p}nm", width=6, command=lambda val=p: self.set_depth_preset(val))
            btn.pack(side=tk.LEFT, padx=1)
            
        # Astigmatism
        ttk.Label(control_frame, text="Cylindrical Lens (BFP)", font=("Arial", 12, "bold")).grid(row=row, column=0, columnspan=2, pady=5); row+=1
        
        self.astig_var = tk.StringVar(value="None")
        astig_combo = ttk.Combobox(control_frame, textvariable=self.astig_var, values=["None", "Weak (f=-25m)", "Strong (f=-16m)"], state="readonly")
        astig_combo.grid(row=row, column=0, columnspan=2, pady=5)
        astig_combo.bind("<<ComboboxSelected>>", self.on_astig_change)
        row += 1
        
        # Checkbox for BFP Phase
        self.show_bfp_phase = tk.BooleanVar(value=False)
        chk_phase = ttk.Checkbutton(control_frame, text="Show BFP Phase", variable=self.show_bfp_phase, command=self.run_fast_update)
        chk_phase.grid(row=row, column=0, columnspan=2, pady=5); row+=1


        # Correction Collar (Spherical Aberration)
        self.correction_sa = tk.DoubleVar(value=0.0)
        ttk.Label(control_frame, text="Correction Collar (SA):").grid(row=row, column=0, sticky=tk.W)
        scale_sa = ttk.Scale(control_frame, from_=-15.0, to=15.0, variable=self.correction_sa, orient=tk.HORIZONTAL, command=self.run_fast_update)
        scale_sa.grid(row=row, column=1, sticky=tk.EW); row+=1


        # Camera Params
        ttk.Label(control_frame, text="Camera").grid(row=row, column=0, sticky=tk.W); row+=1
        ttk.Label(control_frame, text="Pixel Size (um):").grid(row=row, column=0, sticky=tk.W)
        ttk.Entry(control_frame, textvariable=self.cam_pix).grid(row=row, column=1); row+=1
        ttk.Label(control_frame, text="Oversampling:").grid(row=row, column=0, sticky=tk.W)
        ttk.Entry(control_frame, textvariable=self.oversamp).grid(row=row, column=1); row+=1
        
        # Info Label (f_obj display)
        self.info_var = tk.StringVar(value="")
        ttk.Label(control_frame, textvariable=self.info_var, padding=10).grid(row=row, column=0, columnspan=2); row+=1

        # --- Plots ---
        plot_frame = ttk.Frame(main_frame)
        plot_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        
        # Figure
        self.fig, (self.ax_img, self.ax_bfp) = plt.subplots(1, 2, figsize=(10, 5))
        
        # Create dedicated axis for colorbar to prevent shrinking
        divider = make_axes_locatable(self.ax_bfp)
        self.cax_bfp = divider.append_axes("right", size="5%", pad=0.05)
        
        self.canvas = FigureCanvasTkAgg(self.fig, master=plot_frame)
        self.canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)
        
        # Profile Plotting State
        self.canvas.mpl_connect('button_press_event', self.on_canvas_click)
        self.profile_window = None
        self.current_img = None
        self.current_bfp_data = None
        self.current_ext_img = None
        self.current_ext_bfp = None
        
        # Crosshair artists
        self.crosshair_lines = [] 
        
        self.sim = None
        self.cbar_bfp = None # Initialize colorbar reference
        
        # Initial Run
        self.run_simulation_full()

    def on_astig_change(self, event):
        self.run_fast_update()
        
    def update_slider_range(self):
        """Update Defocus Slider Range based on DOF: +/- 2*n_imm*lambda / NA^2."""
        try:
            na = self.na.get()
            nim = self.n_imm.get()
            # wavelength is stored in self.wavelength_um (microns)
            # Formula uses same units.
            lam = self.wavelength_um.get()
            
            if na == 0: return
            
            # User requested 2x the standard DOF limit (Factor 4)
            doi_limit = (4 * nim * lam) / (na**2)
            
            # Update Scale
            # Use 'resolution' to allow fine control (e.g. 100 steps)
            res = doi_limit / 50.0
            
            self.scale_z.configure(from_=-doi_limit, to=doi_limit, resolution=res)
            # print(f"DEBUG: New Defocus Range +/- {doi_limit:.3f} um")
            
        except Exception as e:
            print(f"Error updating slider: {e}")

    def set_depth_preset(self, depth_nm):
        """Set depth and reset z-defocus (relative mode)."""
        d_um = depth_nm / 1000.0
        self.depth_um.set(d_um)
        # Update range first to ensure 0 is valid (it always is, but good practice)
        self.update_slider_range()
        self.z_defocus_um.set(0.0) # Reset User Defocus to center
        self.run_fast_update()


    def run_simulation_full(self):
        # Update Slider Range based on new params
        self.update_slider_range()
        
        # Create Simulator Instance
        M = self.mag.get()
        f_obj_m = (self.f_tube_mm * 1e-3) / M
        
        self.sim = OpticalFourierMicroscope(
            NA=self.na.get(),
            lambda_vac=self.wavelength_um.get() * 1e-6, # um to meters
            n_imm=self.n_imm.get(),
            n_sample=self.n_sample.get(),
            M_obj=M,
            f_tube=self.f_tube_mm*1e-3
        )
        
        # Update Info
        # Better: let sim calculate it.
        # Geometric formula: R = f_obj * NA
        R_obj = f_obj_m * self.na.get() 
        M_pupil = 300 / 180 # Fixed in simulator logic
        R_phys = R_obj * M_pupil * 1000
        
        self.info_var.set(f"f_obj = {f_obj_m*1000:.3f} mm\\nBFP Max Radius = {R_phys:.3f} mm\\nBFP Diameter = {2*R_phys:.3f} mm")
        
        self.run_fast_update()
        
    def run_fast_update(self, *args):
        """Fast run: uses existing microscope object (cached Green tensor)."""
        if self.sim is None: return
        

        try:
            # GUI Defocus is now RELATIVE to the Best Focus at Depth
            gui_z_um = self.z_defocus_um.get()
            
            # Get Depth and Indices for correction
            depth_m = self.depth_um.get() * 1e-6
            n1 = self.n_imm.get()
            n2 = self.n_sample.get()
            
            # Focal Shift Correction
            # Paraxial approx is (n1/n2).
            # Empirical observation for High NA/Mismatch: The 'Best Focus' (peak intensity) 
            # shifts more than paraxial. A factor of (n1/n2)^2 fits user data well.
            # Depth 1um -> Shift ~1.3um. (1.518/1.33)^2 ~= 1.30.
            shift_m = -depth_m * (n1 / n2)**2
            
            # Total Z passed to simulation (Actual Defocus from Coverglass)
            total_z_m = (gui_z_um * 1e-6) + shift_m
            
            pix_cam = self.cam_pix.get()
            overs = self.oversamp.get()
            
            # Determine Phase Mask (Astigmatism)
            val = self.astig_var.get()
            f_cyl = 0.0
            if "Weak" in val: f_cyl = -25000.0 # mm -> need meters?
            if "Strong" in val: f_cyl = -16000.0 # mm -> need meters?
            
            # Convert to meters
            f_cyl_m = f_cyl / 1000.0
            
            phase_current = None
            if f_cyl != 0:
                 phase_current = self.sim.compute_cylindrical_phase(f_cyl_m)
            
            # Run Isotropic with Defocus and Phase Mask
            # Now returns 6 values: img, bfp, ext_cam, ext_bfp, bfp_phase_vis, stats
            corr_val = self.correction_sa.get()
            img, bfp, ext_cam, ext_bfp, bfp_phase_vis, stats = self.sim.simulate_isotropic(z_defocus=total_z_m, phase_mask=phase_current, oversampling=overs, cam_pixel_um=pix_cam, depth=depth_m, correction_sa=corr_val)
            
            # Store for interactivity
            self.current_img = img
            self.current_ext_img = ext_cam
            self.current_ext_bfp = ext_bfp
            
            if self.show_bfp_phase.get():
                self.current_bfp_data = bfp_phase_vis
                self.is_phase = True
            else:
                self.current_bfp_data = bfp
                self.is_phase = False
            
            # Update Plots
            self.ax_img.clear()
            self.ax_img.imshow(img, cmap='gray', origin='lower', extent=ext_cam)
            # self.ax_img.set_title(f"PSF (Rel={gui_z_um:.2f}, Abs={(total_z_m*1e6):.2f} um)")
            
            # Overlay Info (Top-Right)
            info_str = f"Defocus: Rel={gui_z_um:.2f} um, Abs={(total_z_m*1e6):.2f} um\n"
            info_str += f"Depth: {depth_m*1e6:.2f} um\n"
            info_str += f"NA: {self.na.get()}  n_imm: {n1}  Mag: {self.mag.get()}\n"
            info_str += f"n_sample: {n2}\n"
            info_str += f"Pixel: {pix_cam} um"
            
            self.ax_img.text(0.95, 0.95, info_str, transform=self.ax_img.transAxes,
                             color='white', fontsize=8, ha='right', va='top', fontweight='bold')

            self.ax_img.set_xlabel("x (um)")
            self.ax_img.set_ylabel("y (um)")

            # Zoom Restore (300 um FOV)
            zoom = 150
            self.ax_img.set_xlim(-zoom, zoom)
            self.ax_img.set_ylim(-zoom, zoom)
            
            self.ax_bfp.clear()
            
            if self.is_phase:
                im_bfp = self.ax_bfp.imshow(self.current_bfp_data, cmap='twilight', origin='lower', extent=ext_bfp)
                self.ax_bfp.set_title("BFP Phase (Pupil Function)")
                
                # INSET BAR CHART for Aberrations
                # [x, y, width, height] in normalized axes coords (Bottom Right)
                ax_ins = self.ax_bfp.inset_axes([0.6, 0.02, 0.38, 0.3])
                labels = list(stats.keys())
                vals = list(stats.values())
                colors = ['cyan', 'lime', 'magenta', 'orange']
                
                # Use numeric positions to avoid Categorical Conversion Error
                x_pos = np.arange(len(labels))
                ax_ins.bar(x_pos, vals, color=colors, alpha=0.8)
                
                ax_ins.set_title("Phase PV (rad)", fontsize=7, color='white')
                
                # Set X-Ticks
                ax_ins.set_xticks(x_pos)
                ax_ins.set_xticklabels(labels, fontsize=6, color='white', rotation=45)
                
                ax_ins.tick_params(axis='y', labelsize=6, colors='white')
                ax_ins.patch.set_alpha(0.3)
                for spine in ax_ins.spines.values():
                    spine.set_edgecolor('white')

            else:
                norm = matplotlib.colors.LogNorm(vmin=np.max(self.current_bfp_data)*1e-4, vmax=np.max(self.current_bfp_data))
                im_bfp = self.ax_bfp.imshow(self.current_bfp_data, cmap='inferno', norm=norm, origin='lower', extent=ext_bfp)
                self.ax_bfp.set_title("BFP Intensity")
            
            self.ax_bfp.set_xlabel("mm")
            
            self.cax_bfp.clear()
            self.fig.colorbar(im_bfp, cax=self.cax_bfp)

            self.canvas.draw()
            
            im_bfp = None
            if self.show_bfp_phase.get():
                # Show Phase (Z-Dipole Component)
                im_bfp = self.ax_bfp.imshow(bfp_phase_vis, cmap='twilight', origin='lower', extent=ext_bfp)
                self.ax_bfp.set_title("BFP Phase (Z-Dipole)")
            else:
                # Show Intensity
                im_bfp = self.ax_bfp.imshow(bfp, cmap='hot', origin='lower', extent=ext_bfp)
                self.ax_bfp.set_title("BFP Intensity")
                print(f"DEBUG GUI: BFP Extent: {ext_bfp}")
            
            self.ax_bfp.set_xlabel("x (mm)")
            self.ax_bfp.set_ylabel("y (mm)")
            
            # Critical Angle Visualization
            # R_max corresponds to NA
            # R_crit corresponds to n_sample
            na_val = self.na.get()
            ns_val = self.n_sample.get()
            
            # Clear previous texts/patches if any? (ax.clear() does this)
            
            if na_val > ns_val:
                # Calculate physical radius of critical angle
                # ext_bfp is [-R, R, -R, R]
                r_max_phys = ext_bfp[1]
                r_crit_phys = r_max_phys * (ns_val / na_val)
                
                # Draw Circle
                circ = plt.Circle((0, 0), r_crit_phys, color='cyan', fill=False, linestyle='--', linewidth=1.5, label='Critical Angle')
                self.ax_bfp.add_patch(circ)
                
                # Add Labels (Highlighter)
                # Sub-critical (Inside)
                self.ax_bfp.text(0, 0, "Sub-critical", color='cyan', ha='center', va='center', fontsize=8, fontweight='bold', alpha=0.7)
                
                # Super-critical (Outside - Top edges)
                # Position at R_avg * angle
                r_pos = (r_crit_phys + r_max_phys) / 2
                self.ax_bfp.text(0, r_pos, "Super-critical", color='magenta', ha='center', va='center', fontsize=8, fontweight='bold')
                
            
            # Colorbar handling (Use dedicated cax to prevent shrinking)
            # Ensure cax_bfp exists (it should from __init__)
            if hasattr(self, 'cax_bfp'):
                self.cax_bfp.clear() 
                self.cbar_bfp = self.fig.colorbar(im_bfp, cax=self.cax_bfp)
            else:
                pass 
            
            self.canvas.draw()
            
        except Exception as e:
            print(f"Update Error: {e}")
            import traceback
            traceback.print_exc()

    def on_canvas_click(self, event):
        """Handle click events to show profiles."""
        if event.inaxes not in [self.ax_img, self.ax_bfp]:
            return
            
        if event.button != 1: # Left click only
            return
            
        # Determine which plot and data
        if event.inaxes == self.ax_img:
            data = self.current_img
            extent = self.current_ext_img
            title_prefix = "PSF"
            xlabel = "um"
        else:
            data = self.current_bfp_data
            extent = self.current_ext_bfp
            title_prefix = "BFP Phase" if getattr(self, 'is_phase', False) else "BFP Intensity"
            xlabel = "mm"
            
        if data is None: return

        # Draw Crosshair on Main Plot
        # Remove old lines first
        for line in self.crosshair_lines:
            try: line.remove()
            except: pass
        self.crosshair_lines = []
        
        # Draw new lines (Red, dashed)
        # Vertical line at x
        l1 = event.inaxes.axvline(event.xdata, color='r', linestyle='--', alpha=0.7)
        # Horizontal line at y
        l2 = event.inaxes.axhline(event.ydata, color='r', linestyle='--', alpha=0.7)
        self.crosshair_lines.extend([l1, l2])
        self.canvas.draw()

        # Map coords to indices
        # extent = [xmin, xmax, ymin, ymax]
        xmin, xmax, ymin, ymax = extent
        Ny, Nx = data.shape
        
        x_click, y_click = event.xdata, event.ydata
        
        # Indices
        col = int((x_click - xmin) / (xmax - xmin) * Nx)
        row = int((y_click - ymin) / (ymax - ymin) * Ny)
        
        if not (0 <= col < Nx and 0 <= row < Ny):
            return
            
        # Extract slices
        profile_x = data[row, :] # Horizontal profile at y_click
        profile_y = data[:, col] # Vertical profile at x_click
        
        # Axis vectors
        x_axis = np.linspace(xmin, xmax, Nx)
        y_axis = np.linspace(ymin, ymax, Ny)
        
        # Get Display Limits (to sync zoom)
        xlims = event.inaxes.get_xlim()
        ylims = event.inaxes.get_ylim()
        
        self.show_profile_window(x_axis, profile_x, y_axis, profile_y, col, row, title_prefix, xlabel, xlims, ylims)

    def gaussian(self, x, a, x0, sigma, offset):
        return a * np.exp(-(x - x0)**2 / (2 * sigma**2)) + offset

    def fit_gaussian(self, x, y):
        """Fit a gaussian to data. Returns params and fitted curve."""
        try:
            # Initial guess
            a0 = np.max(y) - np.min(y)
            x00 = x[np.argmax(y)]
            sigma0 = (np.max(x) - np.min(x)) / 10.0 # Guess
            offset0 = np.min(y)
            
            p0 = [a0, x00, sigma0, offset0]
            
            popt, pcov = curve_fit(self.gaussian, x, y, p0=p0, maxfev=5000)
            return popt, self.gaussian(x, *popt)
        except Exception:
            return None, None

    def show_profile_window(self, x_ax, prof_x, y_ax, prof_y, col, row, title, unit, xlims=None, ylims=None):
        """Display profiles in a Toplevel window."""
        if self.profile_window is None or not tk.Toplevel.winfo_exists(self.profile_window):
            self.profile_window = tk.Toplevel(self)
            self.profile_window.title("Profile Viewer")
            self.profile_window.geometry("600x800")
            
            self.fig_prof, (self.ax_prof_x, self.ax_prof_y) = plt.subplots(2, 1, figsize=(5, 8))
            self.canvas_prof = FigureCanvasTkAgg(self.fig_prof, master=self.profile_window)
            self.canvas_prof.get_tk_widget().pack(fill=tk.BOTH, expand=True)
        
        # Check if we should fit (Only for PSF Intensity)
        do_fit = "PSF" in title
        
        # Plot X Profile (Horizontal slice) -> X axis
        self.ax_prof_x.clear()
        self.ax_prof_x.plot(x_ax, prof_x, 'b-', label='Data')
        self.ax_prof_x.axvline(x_ax[col], color='r', linestyle='--', alpha=0.5)
        
        title_x = f"{title} - Horizontal"
        if do_fit:
            popt, fit_y = self.fit_gaussian(x_ax, prof_x)
            if popt is not None:
                sigma_x = abs(popt[2])
                self.ax_prof_x.plot(x_ax, fit_y, 'r:', linewidth=2, label=f'Fit $\\sigma$={sigma_x:.3f}')
                title_x += f" ($\\sigma_x$={sigma_x:.3f} {unit})"
        
        self.ax_prof_x.set_title(title_x)
        self.ax_prof_x.set_xlabel(f"x ({unit})")
        self.ax_prof_x.grid(True)
        self.ax_prof_x.legend()
        if xlims: self.ax_prof_x.set_xlim(xlims)
        
        # Plot Y Profile (Vertical slice) -> Y axis
        self.ax_prof_y.clear()
        self.ax_prof_y.plot(y_ax, prof_y, 'g-', label='Data')
        self.ax_prof_y.axvline(y_ax[row], color='r', linestyle='--', alpha=0.5)
        
        title_y = f"{title} - Vertical"
        if do_fit:
            popt, fit_y = self.fit_gaussian(y_ax, prof_y)
            if popt is not None:
                sigma_y = abs(popt[2])
                self.ax_prof_y.plot(y_ax, fit_y, 'r:', linewidth=2, label=f'Fit $\\sigma$={sigma_y:.3f}')
                title_y += f" ($\\sigma_y$={sigma_y:.3f} {unit})"
                
        self.ax_prof_y.set_title(title_y)
        self.ax_prof_y.set_xlabel(f"y ({unit})")
        self.ax_prof_y.grid(True)
        self.ax_prof_y.legend()
        if ylims: self.ax_prof_y.set_xlim(ylims) 
        
        self.fig_prof.tight_layout()
        self.canvas_prof.draw()

if __name__ == "__main__":
    app = PSFGui()
    app.mainloop()
