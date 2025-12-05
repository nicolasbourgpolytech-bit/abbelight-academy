import { UserRole } from "./user";

export interface AppTool {
    id: string;
    name: string;
    description: string;
    version: string;
    icon: string; // Emoji for simplicity or path to image
    rolesRequired: UserRole[]; // If empty or contains 'general', available to all. specific roles restrict access.
    downloadUrl: string;
    size: string;
    releaseDate: string;
}
