export const routelyPresetsVersion: string;
export const APP_PRESETS: Record<string, Record<string, unknown>>;
export const DATABASE_PRESETS: Record<string, Record<string, unknown>>;
export function listAppPresets(): Array<Record<string, unknown>>;
export function getAppPreset(name: string): Record<string, unknown> | null;
export function getDatabasePreset(type: string): Record<string, unknown> | null;
export function createDatabaseService(type: string, overrides?: Record<string, unknown>): Record<string, unknown>;
export function detectPreset(projectPath: string): Record<string, unknown>;
