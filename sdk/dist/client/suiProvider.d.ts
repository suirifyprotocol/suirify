/**
 * Thin wrapper around the official @mysten/sui.js JsonRpcProvider.
 */
import type { SuiProviderInstance } from "./types.js";
export declare const createSuiProvider: (rpcUrl?: string) => SuiProviderInstance;
export type { SuiProviderInstance } from "./types.js";
