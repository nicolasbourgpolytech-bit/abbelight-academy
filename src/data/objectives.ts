export interface ObjectiveLens {
    id: string;
    name: string;
    manufacturer: string;
    NA: number;
    magnification: number;
    immersion: "Oil" | "Water" | "Air" | "Silicone" | "Glycerol";
    n_imm: number;
    f_tube_mm: number; // Tube lens focal length in mm
    imagePath: string;
    hasCorrectionCollar: boolean;
}

export const OBJECTIVES: ObjectiveLens[] = [
    {
        id: "evident_uplapo100xohr",
        name: "UPLAPO100XOHR",
        manufacturer: "Evident",
        NA: 1.50,
        magnification: 100,
        immersion: "Oil",
        n_imm: 1.518,
        f_tube_mm: 180,
        imagePath: "/product-images/uplapo100xohr_evident.png",
        hasCorrectionCollar: true
    },
    {
        id: "evident_uplxapo10x",
        name: "UPLXAPO10X",
        manufacturer: "Evident",
        NA: 0.40,
        magnification: 10,
        immersion: "Air",
        n_imm: 1.0,
        f_tube_mm: 180,
        imagePath: "/product-images/uplxapo10x_evident.png",
        hasCorrectionCollar: false
    }
];
