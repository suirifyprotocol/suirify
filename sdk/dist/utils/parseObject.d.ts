/**
 * Helper utilities for coercing Sui RPC payloads into typed objects.
 */
import type { AttestationOnChain, RawSuiObjectRpcResponse } from "../client/types.js";
interface ParsedObject {
    type?: string;
    owner?: string;
    objectId?: string;
    version?: number;
    fields?: Record<string, any> | null;
}
/**
 * Attempts to normalize different RPC response shapes into a predictable structure.
 * If you notice that your RPC node returns data in a different layout, adapt the
 * accessors below and add another branch with a comment describing the payload.
 */
export declare function normalizeRpcObject(raw: RawSuiObjectRpcResponse): ParsedObject;
export declare function parseAttestationObject(raw: RawSuiObjectRpcResponse): AttestationOnChain | null;
export {};
