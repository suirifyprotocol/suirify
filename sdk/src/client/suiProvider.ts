/**
 * Thin wrapper around the official @mysten/sui.js JsonRpcProvider.
 */

import { SuiClient } from "@mysten/sui.js/client";
import type { RawSuiObjectRpcResponse, SuiProviderInstance } from "./types.js";

const resolveDefaultRpc = () => {
  if (typeof process === "undefined") return undefined;
  return (
    process.env?.SUI_RPC ||
    process.env?.SUI_RPC_URL ||
    process.env?.SUI_FULLNODE_URL ||
    process.env?.SUI_PROVIDER_URL
  );
};

const DEFAULT_RPC_URL = resolveDefaultRpc() || "https://fullnode.devnet.sui.io:443";

class DefaultSuiProvider implements SuiProviderInstance {
  private readonly client: SuiClient;

  constructor(rpcUrl = DEFAULT_RPC_URL) {
    this.client = new SuiClient({ url: rpcUrl });
  }

  /**
   * Fetches all objects owned by a given address, returning the raw RPC payloads.
   * Options request enough metadata for downstream parsing.
   */
  async getOwnedObjects(owner: string): Promise<RawSuiObjectRpcResponse[]> {
    const result = await this.client.getOwnedObjects({
      owner,
      options: {
        showContent: true,
        showOwner: true,
        showType: true
      }
    });

    return (result?.data ?? []) as RawSuiObjectRpcResponse[];
  }

  /**
   * Fetches a specific object by its ID.
   */
  async getObject(objectId: string): Promise<RawSuiObjectRpcResponse | null> {
    try {
      const result = await this.client.getObject({
        id: objectId,
        options: {
          showContent: true,
          showOwner: true,
          showType: true
        }
      });
      return result as RawSuiObjectRpcResponse;
    } catch (error) {
      console.error("Failed to fetch object", objectId, error);
      return null;
    }
  }
}

export const createSuiProvider = (rpcUrl?: string): SuiProviderInstance =>
  new DefaultSuiProvider(rpcUrl);

export type { SuiProviderInstance } from "./types.js";
