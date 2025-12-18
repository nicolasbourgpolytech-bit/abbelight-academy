
import numpy as np
import scipy.fft
import scipy.ndimage
import matplotlib.pyplot as plt

class OpticalFourierMicroscope:
    def __init__(self, NA=1.49, lambda_vac=600e-9, n_imm=1.518, n_sample=1.33, 
                 M_obj=100, f_tube=0.180, f_4f_1=0.300, f_4f_2=0.200, 
                 npix=256):
        """
        Initialize the simulation parameters for the specific optical setup.
        
        Args:
            NA: Numerical Aperture.
            lambda_vac: Wavelength (m).
            n_imm: Index of immersion medium.
            n_sample: Index of sample.
            M_obj: Nominal magnification of the objective (e.g. 60, 100).
            f_tube: Focal length of the microscope tube lens (m). Default 180mm.
            f_4f_1: Focal length of first 4f lens (m). Default 300mm.
            f_4f_2: Focal length of second 4f lens (m). Default 200mm.
            npix: Number of pixels in BFP grid.
        """
        self.NA = NA
        self.lambda_vac = lambda_vac
        self.n1 = n_imm
        self.n2 = n_sample
        
        # Optical System Parameters
        self.M_obj = M_obj
        self.f_tube = f_tube
        
        # Calculate Objective Focal Length
        # M = f_tube / f_obj  => f_obj = f_tube / M
        self.f_obj = self.f_tube / self.M_obj
        
        # 4f System Magnification
        # M_4f = f2 / f1
        self.f_4f_1 = f_4f_1
        self.f_4f_2 = f_4f_2
        self.M_4f = self.f_4f_2 / self.f_4f_1
        
        # Total Magnification to Camera
        self.M_total = self.M_obj * self.M_4f
        
        self.npix = int(npix)
        self.k0 = 2 * np.pi / self.lambda_vac
        self.k1 = self.k0 * self.n1
        self.k2 = self.k0 * self.n2
        
        # BFP coordinates (Objective side, n1)
        # Max radius in BFP corresponds to NA
        # Normalized radius rho = sin(theta1) / sin(theta1_max)
        # self.sin_theta1_max = self.NA / self.n1
        
        # Defined on a grid.
        # We model the BFP pupil. The radius = 1 corresponds to NA.
        extent = 1.0 
        x = np.linspace(-extent, extent, npix)
        y = np.linspace(-extent, extent, npix)
        self.XX, self.YY = np.meshgrid(x, y)
        self.RHO = np.sqrt(self.XX**2 + self.YY**2)
        self.PHI = np.arctan2(self.YY, self.XX)
        
        # Mask for the pupil aperture
        self.pupil_mask = self.RHO <= 1.0
        
        # 1. Angles in Immersion Medium (Objective side, n1)
        # sin(theta1) = RHO * (NA / n1)
        self.sin_theta1 = self.RHO * (self.NA / self.n1)
        # Clip strictly to 1 for numerical stability inside pupil, 
        # though mask handles outside.
        self.sin_theta1[self.sin_theta1 > 1] = 1 
        self.cos_theta1 = np.sqrt(1 - self.sin_theta1**2)
        
        # 2. Angles in Sample Medium (n2) via Snell's Law
        # n1 * sin(theta1) = n2 * sin(theta2)
        # sin(theta2) = (n1/n2) * sin(theta1)
        self.sin_theta2 = (self.n1 / self.n2) * self.sin_theta1
        
        # cos(theta2) can be complex for SAF (Supercritical Angle Fluorescence)
        # when sin(theta2) > 1.
        # We use complex math: sqrt(1 - sin^2)
        # For sin > 1, 1 - sin^2 is negative -> sqrt gives imaginary part.
        self.cos_theta2 = np.sqrt(1 - self.sin_theta2**2 + 0j)
        
        # For propagation direction z (z > 0 away from interface), 
        # evanescent decay means +i * alpha? Or is it exp(i*kz*z)?
        # If kz = k * cos_theta, and cos_theta is imaginary (say i*A),
        # exp(i*k*(i*A)*z) = exp(-k*A*z). Correct decay.
        # Numpy sqrt of negative real number gives 1j * sqrt(val).
        
    def calculate_greens_tensor_bfp(self, depth=0.0):
        """
        Calculates the Green's tensor at the Back Focal Plane including interface transmission.
        Using Fresnel coefficients for transmission n2 -> n1.
        
        Args:
            depth: Distance of the molecule from the interface (meters). >0 is inside sample.
        """
        # Aliases for readability (angles in sample frame mostly, but we need transmission)
        # Field lines map from theta2 to theta1.
        
        # Grid variables (shape: npix, npix)
        st1 = self.sin_theta1
        ct1 = self.cos_theta1
        st2 = self.sin_theta2
        ct2 = self.cos_theta2
        
        phi = self.PHI
        cp = np.cos(phi)
        sp = np.sin(phi)
        
        # Fresnel Transmission Coefficients (Using Reciprocity: 1 -> 2)
        # We calculate the strength of the E-field at the dipole position (in n2)
        # excited by a plane wave from the objective (n1).
        # T_s = 2*n1*cos(theta1) / (n1*cos(theta1) + n2*cos(theta2))
        # T_p = 2*n1*cos(theta1) / (n2*cos(theta1) + n1*cos(theta2))
        
        # Denominators
        Denom_s = self.n1 * ct1 + self.n2 * ct2
        ts = (2 * self.n1 * ct1) / Denom_s
        
        Denom_p = self.n2 * ct1 + self.n1 * ct2
        tp = (2 * self.n1 * ct1) / Denom_p
        
        # Apodization factor
        # Conservation of energy through the objective:
        # Field in BFP ~ Field at infinity / sqrt(cos theta1)
        # But we also have the Flux factor n1/n2?
        # Standard factor often cited is sqrt(n1/n2) / sqrt(cos theta1). 
        # But for 'unnormalized' intensity, 1/sqrt(ct1) is the shape factor.
        
        # Avoid divide by zero
        prefactor = 1.0 / np.sqrt(np.maximum(ct1, 1e-9))
        prefactor[~self.pupil_mask] = 0
        
        # Matrix elements
        # Project Dipole mu onto the local field vectors in Sample (n2).
        # p-pol unit vector in n2: e_p2 = [cos(theta2)cos(phi), cos(theta2)sin(phi), -sin(theta2)]
        # s-pol unit vector in n2: e_s2 = [-sin(phi), cos(phi), 0]
        
        # Note: direction of e_p2 z-component might be + or - depending on convention of k.
        # Incident wave k = (.., -kz). e_p is perp. so has -z ?
        # Richards-Wolf usually gives z-component as J0(rho)*sin(theta)*...
        # Let's stick to the projection: mu . e_p2
        
        # Mxx implies we map mu_x -> E_x_bfp
        # mu_x contributes to e_p2 (via cos(theta2)cos(phi)) and e_s2 (via -sin(phi))
        # E_p_amp = tp * (mu . e_p2)
        # E_s_amp = ts * (mu . e_s2)
        
        # Then map p, s back to x, y in BFP
        # E_x_bfp = E_p_amp * cos(phi) - E_s_amp * sin(phi)
        
        # Ex_from_mux:
        # E_p = tp * (1 * ct2 * cp)
        # E_s = ts * (1 * -sp)
        # E_x = (tp*ct2*cp)*cp - (ts*-sp)*sp = tp*ct2*cp^2 + ts*sp^2
        Mxx = tp * ct2 * cp**2 + ts * sp**2
        
        # Ex_from_muy:
        # E_p = tp * (1 * ct2 * sp)
        # E_s = ts * (1 * cp)
        # E_x = (tp*ct2*sp)*cp - (ts*cp)*sp = (tp*ct2 - ts)*sp*cp
        Mxy = (tp * ct2 - ts) * sp * cp
        
        # Ex_from_muz:
        # E_p = tp * (1 * -st2)  <-- Note the sin(theta2) term!
        # E_s = 0
        # E_x = (tp * -st2) * cp
        Mxz = -tp * st2 * cp    # st2 can be > 1 (Supercritical)
        
        # Myx (Ey from mux):
        # E_y = E_p * sp + E_s * cp
        # E_p = tp*ct2*cp, E_s = -ts*sp
        # E_y = tp*ct2*cp*sp - ts*sp*cp = (tp*ct2 - ts)*cp*sp
        Myx = Mxy
        
        # Myy (Ey from muy):
        # E_p = tp*ct2*sp, E_s = ts*cp
        # E_y = tp*ct2*sp*sp + ts*cp*cp
        Myy = tp * ct2 * sp**2 + ts * cp**2
        
        # Myz (Ey from muz):
        # E_p = -tp*st2
        # E_y = -tp*st2*sp
        Myz = -tp * st2 * sp
        
        # Assemble Tensor
        G_bfp = np.zeros((2, 3, self.npix, self.npix), dtype=complex)
        
        G_bfp[0, 0] = Mxx * prefactor
        G_bfp[0, 1] = Mxy * prefactor
        G_bfp[0, 2] = Mxz * prefactor
        
        G_bfp[1, 0] = Myx * prefactor
        G_bfp[1, 1] = Myy * prefactor
        G_bfp[1, 2] = Myz * prefactor
        
        # --- Interface Depth Phase Term ---
        # Propagating from the interface (z=0) to the molecule (z=depth) inside medium 2.
        # Phase factor = exp(i * k2 * depth * cos_theta2)
        # k2 = k0 * n2
        # If SAF (sin_theta2 > 1), cos_theta2 is imaginary -> decay.
        if depth != 0:
            phase_depth = self.k2 * depth * self.cos_theta2
            # Add phase to all components
            phase_factor = np.exp(1j * phase_depth)
            G_bfp *= phase_factor
            
        return G_bfp

    def compute_cylindrical_phase(self, f_cyl_len):
        """
        Computes the phase mask for a cylindrical lens placed at the BFP.
        
        Args:
            f_cyl_len: Focal length of the cylindrical lens in meters. 
                       (Positive for converging, Negative for diverging).
                       The lens usually has power in one axis.
                       We assume the lens acts on the Y-axis (vertical power) to create 'vertical' astigmatism?
                       Standard Astigmatism Zernike cos(2theta) ~ x^2 - y^2. 
                       A cylinder on Y adds power y^2. 
                       
        Returns:
            phase_mask: 2D array of phase values.
        """
        if f_cyl_len == 0 or np.isinf(f_cyl_len):
            return None
            
        # 1. Physical coordinates in BFP
        # The grid self.XX, self.YY is normalized to 1.0 at NA.
        # Physical radius corresponding to NA:
        # R_phys = f_obj * (NA / n1) ?
        # Actually simplest is: NA = n1 * sin(theta_max).
        # Abbe sine condition: r_bfp = f_obj * sin(theta_obj).
        # So r_bfp_max = f_obj * (NA / n1).
        
        # R_phys = f_obj * (NA / n1)  <-- Wave optics Abbe sine
        # User observation and common geometric approx: R_phys = f_obj * NA
        # This yields a larger pupil (~1.5x) and matches the observed astigmatism strength (R^2 dependency).
        
        # R_obj_bfp = self.f_obj * (self.NA / self.n1) # Old rigorous
        R_obj_bfp = self.f_obj * self.NA # New Geometric/User Match
        
        # Pupil Magnification via Tube Lens and 4f L1
        # The BFP is relayed by Tube Lens + L1.
        # Magnification M_pupil = f_4f_1 / f_tube
        
        M_pupil = self.f_4f_1 / self.f_tube
        R_max_phys = R_obj_bfp * M_pupil
        
        # Physical grid (Magnified)
        # Y_phys = self.YY * R_max_phys
        # Cylinder axis: we assume power along Y axis (so it focuses/defocuses Y rays).
        # Phase shift of thin lens: phi = - k * y^2 / (2 * f)
        
        Y_phys = self.YY * R_max_phys
        
        # k in the medium where the lens is (usually air? or inside the microscope?)
        # BFP is usually in air or inside the objective housing. 
        # But here we are simulating the phase added to the field.
        # The field has wavenumber k0 * n1 ?? No, BFP is usually a Fourier plane.
        # If we stick to standard Fourier optics, we apply a phase delay.
        # k should be k0 (vacuum/air) if the lens is in air path.
        # Let's assume air (n=1).
        
        k_lens = self.k0 * 1.0 # Assuming lens in air
        
        # Phase
        # Converting Sign convention:
        # Diverging lens (f < 0) -> makes wave diverge -> adds positive phase quadratic?
        # A plane wave e^(ikz) meeting a diverging lens becomes spherical wave originating from virtual focus.
        # e^( i k (x^2+y^2)/2R ). 
        # Standard: exp( - i k r^2 / 2f ). If f < 0, exponent is + i k r^2 / 2|f|.
        # So formula -k*r^2/(2f) works.
        
        phase_mask = - k_lens * (Y_phys**2) / (2 * f_cyl_len)
        
        print(f"DEBUG: Cylindrical Phase. f={f_cyl_len}m. Max Y={np.max(Y_phys)*1e3:.3f}mm.")
        print(f"DEBUG: Phase Range: {np.min(phase_mask):.2f} to {np.max(phase_mask):.2f} rad")
        
        return phase_mask

    def simulate_image(self, dipole_ori, z_defocus=0.0, phase_mask=None, oversampling=8):
        """
        Simulate the image of a single molecule with enhanced sampling (via zero-padding).
        
        Args:
            dipole_ori: Tuple (theta_d, phi_d) or (mu_x, mu_y, mu_z).
            z_defocus: Defocus distance (meters).
            phase_mask: 2D array of phase values.
            oversampling: Factor to pad the BFP before FFT to decrease pixel size (increase zoom resolution).
            
        Returns:
            Intensity, BFP_Intensity, extent_img (in meters)
        """
        # Parse dipole orientation
        if len(dipole_ori) == 2:
            theta_d, phi_d = dipole_ori
            mu = np.array([
                np.sin(theta_d)*np.cos(phi_d),
                np.sin(theta_d)*np.sin(phi_d),
                np.cos(theta_d)
            ])
        else:
            mu = np.array(dipole_ori)
            mu = mu / np.linalg.norm(mu)
            
        # 1. Calculate Field at BFP
        G = self.calculate_greens_tensor_bfp()
        
        # E_bfp = G * mu
        Ex_bfp = G[0, 0]*mu[0] + G[0, 1]*mu[1] + G[0, 2]*mu[2]
        Ey_bfp = G[1, 0]*mu[0] + G[1, 1]*mu[1] + G[1, 2]*mu[2]
        
        # 2. Apply Phase Mask (Psi)
        if phase_mask is not None:
            exp_psi = np.exp(1j * phase_mask)
            Ex_bfp *= exp_psi
            Ey_bfp *= exp_psi
            
        # 3. Apply Defocus
        if z_defocus != 0:
            defocus_phase = self.n1 * self.k0 * z_defocus * self.cos_theta1
            exp_defocus = np.exp(1j * defocus_phase)
            Ex_bfp *= exp_defocus
            Ey_bfp *= exp_defocus
            
        # 4. Propagate to Image Plane (FFT with Zero Padding)
        
        # BFP Intensity (before padding, for visualization)
        BFP_Intensity = np.abs(Ex_bfp)**2 + np.abs(Ey_bfp)**2
        
        # Padding
        # We want to increase the array size from npix to (oversampling * npix)
        # by surrounding with zeros.
        # This keeps d_k constant (FOV constant) but increases N (finer pixels).
        
        original_npix = self.npix
        target_npix = int(original_npix * oversampling)
        
        pad_width = (target_npix - original_npix) // 2
        
        # Pad with zeros
        Ex_padded = np.pad(Ex_bfp, pad_width, mode='constant')
        Ey_padded = np.pad(Ey_bfp, pad_width, mode='constant')
        
        # FFT
        E_img_x = scipy.fft.fftshift(scipy.fft.fft2(scipy.fft.ifftshift(Ex_padded)))
        E_img_y = scipy.fft.fftshift(scipy.fft.fft2(scipy.fft.ifftshift(Ey_padded)))
        
        # Intensity
        Intensity = np.abs(E_img_x)**2 + np.abs(E_img_y)**2
        
        # Calculate Dimensions on Camera
        # 1. FOV in Object Plane (meters)
        # fov_obj = lambda * N_pupil / (2 * NA)
        fov_obj = (self.lambda_vac * original_npix) / (2 * self.NA)
        
        # 2. FOV in Camera Plane (micrometers)
        fov_cam_um = fov_obj * self.M_total * 1e6
        half_fov = fov_cam_um / 2
        extent_cam = [-half_fov, half_fov, -half_fov, half_fov]
        
        # 3. BFP Extent (millimeters)
        # R_obj_bfp = self.f_obj * self.NA # Geometric Approx
        R_obj_bfp = self.f_obj * self.NA
        M_pupil = self.f_4f_1 / self.f_tube
        R_max_phys = R_obj_bfp * M_pupil * 1000.0
        
        extent_bfp = [-R_max_phys, R_max_phys, -R_max_phys, R_max_phys]
        
        return Intensity, BFP_Intensity, extent_cam, extent_bfp

    def resample_to_camera(self, intensity, extent_cam, cam_pixel_um=6.5):
        """
        Resample the high-resolution intensity image to the camera pixel grid.
        
        Args:
            intensity: High-resolution intensity array.
            extent_cam: [min_x, max_x, min_y, max_y] in micrometers.
            cam_pixel_um: Physical pixel size of the camera in micrometers (default 6.5).
            
        Returns:
            pixelated_img: Image resampled to camera resolution.
            new_extent: Extent of the pixelated image (should match input mostly).
        """
        Ny, Nx = intensity.shape
        width = extent_cam[1] - extent_cam[0]
        height = extent_cam[3] - extent_cam[2]
        
        dx_highres = width / Nx
        dy_highres = height / Ny
        
        print(f"DEBUG: Resample. SimGrid={Nx}x{Ny}. FOV={width:.1f}um. dx_sim={dx_highres:.3f}um. Target_pix={cam_pixel_um:.3f}um")
        
        # Calculate scaling factor (Zoom < 1 for downsampling)
        zoom_x = dx_highres / cam_pixel_um
        zoom_y = dy_highres / cam_pixel_um
        
        print(f"DEBUG: Resample Factors. Zoom_X={zoom_x:.3f}. (Threshold 0.5)")
        
        # Use simple binning if zoom is small (downsampling)
        # Note: If zoom_x = 0.51 (e.g. 3.3um vs 6.5um), we use interpolation.
        if zoom_x < 0.5: # Calculate integer binning factor
            bin_x = int(np.round(cam_pixel_um / dx_highres))
            bin_y = int(np.round(cam_pixel_um / dy_highres))
            
            # Crop to multiple of bin size (SYMMETRICALLY to preserve center)
            new_Nx = (Nx // bin_x) * bin_x
            new_Ny = (Ny // bin_y) * bin_y
            
            start_x = (Nx - new_Nx) // 2
            start_y = (Ny - new_Ny) // 2
            
            crop_intensity = intensity[start_y:start_y+new_Ny, start_x:start_x+new_Nx]
            
            # Reshape (Ny/bin_y, bin_y, Nx/bin_x, bin_x)
            sh = (new_Ny // bin_y, bin_y, new_Nx // bin_x, bin_x)
            pixelated_img = crop_intensity.reshape(sh).mean(-1).mean(1)
            
            # Update extent (center might shift slightly due to crop)
            # New width = new_Nx * dx_highres -> mapped to pixelated
            # We assume pixelated grid covers roughly same area.
            new_width = pixelated_img.shape[1] * cam_pixel_um
            new_height = pixelated_img.shape[0] * cam_pixel_um
            
            # Assuming bounds were centered
            new_extent = [-new_width/2, new_width/2, -new_height/2, new_height/2]
            
            return pixelated_img, new_extent
            
        else:
            # Use spline interpolation for mild scaling
            pixelated_img = scipy.ndimage.zoom(intensity, (zoom_y, zoom_x), order=1)
            return pixelated_img, extent_cam

    def simulate_isotropic(self, z_defocus=0.0, astigmatism=0.0, phase_mask=None, oversampling=8, cam_pixel_um=6.5, depth=0.0, display_fov_um=None):
        """
        Simulate an isotropic (free) dipole by summing intensities of three orthogonal dipoles (X, Y, Z).
        Optimized with batched FFT.
        
        Args:
            astigmatism: Coefficient for vertical astigmatism (Zernike Z2,2). Resulting phase = astig * rho^2 * cos(2*phi).
            depth: Distance of molecule from interface (meters).
            display_fov_um: Optional. If set, crops the final image to this field of view (in micrometers) centered on the axis.
        """
        # 1. Get Green's Tensor (Shape: 2, 3, N, N)
        # Check if we can reuse cached G
        if (hasattr(self, 'G_bfp') and 
            hasattr(self, 'last_depth') and 
            self.last_depth == depth):
             G = self.G_bfp
        else:
             G = self.calculate_greens_tensor_bfp(depth=depth)
             self.G_bfp = G # Cache it
             self.last_depth = depth
        
        # 2. Define Dipoles (X, Y, Z columns)
        # Mu vectors: [ [1,0,0], [0,1,0], [0,0,1] ]
        # We can compute E fields for all 3 directly.
        # E_bfp shape: (3_dipoles, 2_pol, N, N)
        
        # Init empty field stack
        E_bfp_stack = np.zeros((3, 2, self.npix, self.npix), dtype=complex)
        
        # Dipole X: (1, 0, 0)
        # Ex = G[0,0]*1, Ey = G[1,0]*1
        E_bfp_stack[0, 0] = G[0, 0]
        E_bfp_stack[0, 1] = G[1, 0]
        
        # Dipole Y: (0, 1, 0)
        # Ex = G[0,1]*1, Ey = G[1,1]*1
        E_bfp_stack[1, 0] = G[0, 1]
        E_bfp_stack[1, 1] = G[1, 1]
        
        # Dipole Z: (0, 0, 1)
        E_bfp_stack[2, 0] = G[0, 2]
        E_bfp_stack[2, 1] = G[1, 2]
        
        # 3. Apply Phase / Defocus / Astigmatism (Broadcasting over dipoles)
        factor = 1.0 + 0j
        
        if phase_mask is not None:
            factor *= np.exp(1j * phase_mask)
            
        # Z-Defocus term
        if z_defocus != 0:
            defocus_phase = self.n1 * self.k0 * z_defocus * self.cos_theta1
            factor *= np.exp(1j * defocus_phase)
            
        # Astigmatism term (Vertical): A * rho^2 * cos(2*phi)
        if astigmatism != 0:
            # Mask is already handled by G_bfp prefactor being 0 outside pupil? 
            # Yes, G is 0 outside. So we just compute phase everywhere.
            astig_phase = astigmatism * (self.RHO**2) * np.cos(2 * self.PHI)
            factor *= np.exp(1j * astig_phase)
            
        if not np.isscalar(factor) or factor != 1.0:
            E_bfp_stack *= factor
            
        # 4. Padding and FFT
        # We perform batched FFT over the first two axes (3 dipoles * 2 pols = 6 images)
        original_npix = self.npix
        target_npix = int(original_npix * oversampling)
        pad_width = (target_npix - original_npix) // 2
        
        # Pad: ((0,0), (0,0), (pad,pad), (pad,pad))
        # This might be memory intensive if oversampling is huge?
        # Stack is (3, 2, N, N).
        E_padded = np.pad(E_bfp_stack, ((0,0), (0,0), (pad_width, pad_width), (pad_width, pad_width)), mode='constant')
        
        # Batched FFT (on last 2 axes)
        # scipy.fft.fft2 handles n-dim arrays and transforms last 2 axes by default.
        E_img_stack = scipy.fft.fftshift(scipy.fft.fft2(scipy.fft.ifftshift(E_padded, axes=(-2,-1)), axes=(-2,-1)), axes=(-2,-1))
        
        # 5. Compute Intensities
        # Intensity = |Ex|^2 + |Ey|^2
        # Sum over X, Y, Z dipoles incoherently
        # Result Shape: (Target_N, Target_N)
        
        # AbsSq per component
        I_stack = np.abs(E_img_stack)**2
        
        # Sum polarizations (axis 1) -> (3, N, N)
        # Sum polarizations (axis 1) -> (3, N, N)
        # Sum dipoles (axis 0) -> (N, N)
        I_iso_high = np.sum(np.sum(I_stack, axis=1), axis=0)
        
        # Define image_total for return (it's the high res isotropic intensity)
        image_total = I_iso_high
        
        # BFP Total Intensity (for visualization)
        # Sum of moduli squared of all dipoles
        # E_bfp_stack is (3, 2, npix, npix)
        bfp_total = np.sum(np.abs(E_bfp_stack)**2, axis=(0, 1))
        
        # EXTRACT PHASE (Z-Dipole, P-Polarization dominant) for visualization
        # Dipole Z is index 2. Polarization P is roughly Radial... let's take a component.
        # Or just take the phase of the first component of Z dipole?
        # Z dipole field at BFP ~ sin(theta) * Tp (p-pol).
        # Let's return the phase of E_bfp_stack[2, 0] (Ex component of Z dipole)
        # Or better: Phase of the Dot product with a reference?
        # Simplest: Phase of one component of Z dipole.
        complex_z = E_bfp_stack[2, 0] # Z-dipole, X-polarization component
        # If it's zero (e.g. at center), phase is noise. 
        bfp_phase_vis = np.angle(complex_z)
        
        # Calculate Dimensions
        fov_obj = (self.lambda_vac * original_npix) / (2 * self.NA)
        fov_cam_um = fov_obj * self.M_total * 1e6
        
        print(f"DEBUG: FOV Obj={fov_obj*1e6:.2f}um, M={self.M_total:.2f}, FOV Cam={fov_cam_um:.2f}um")
        
        half_fov = fov_cam_um / 2
        extent_cam = [-half_fov, half_fov, -half_fov, half_fov]
        
        # BFP Extent (Physical mm)
        # R_obj_bfp = self.f_obj * self.NA # Geometric Approx
        R_obj_bfp = self.f_obj * self.NA
        M_pupil = self.f_4f_1 / self.f_tube
        R_max_phys = R_obj_bfp * M_pupil * 1000.0
        
        extent_bfp = [-R_max_phys, R_max_phys, -R_max_phys, R_max_phys]
        
        # 7. Resample to Camera Pixels
        # Crucial step: Downsample/Interpolate I_iso_high to match cam_pixel_um
        img_iso_cam, ext_cam_iso = self.resample_to_camera(I_iso_high, extent_cam, cam_pixel_um)
        
        # 8. CROP to Display FOV (if requested)
        if display_fov_um is not None and display_fov_um > 0:
            # Current extent: ext_cam_iso = [min_x, max_x, min_y, max_y]
            # Width = max_x - min_x
            current_width = ext_cam_iso[1] - ext_cam_iso[0]
            current_height = ext_cam_iso[3] - ext_cam_iso[2]
            
            # Pixels
            Ny, Nx = img_iso_cam.shape
            
            # Pixels to keep
            # crop_um / pixel_um
            # display_fov_um should be total width? User said +/- 150 -> Total 300.
            # Assuming display_fov_um is TOTAL width.
            
            target_px_x = int(display_fov_um / cam_pixel_um)
            target_px_y = int(display_fov_um / cam_pixel_um)
            
            if target_px_x < Nx:
                 start_x = (Nx - target_px_x) // 2
                 start_y = (Ny - target_px_y) // 2
                 
                 img_iso_cam = img_iso_cam[start_y:start_y+target_px_y, start_x:start_x+target_px_x]
                 
                 # Update extent
                 new_half = (display_fov_um) / 2
                 ext_cam_iso = [-new_half, new_half, -new_half, new_half]
        
        return img_iso_cam, bfp_total, ext_cam_iso, extent_bfp, bfp_phase_vis
