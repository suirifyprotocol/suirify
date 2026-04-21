type AnyRecord = Record<string, unknown>;

type AnyClient = {
  stateService?: {
    listOwnedObjects?: (params: AnyRecord) => Promise<AnyRecord>;
  };
  core?: {
    getOwnedObjects?: (params: AnyRecord) => Promise<AnyRecord>;
  };
  getOwnedObjects?: (params: AnyRecord) => Promise<AnyRecord>;
  getObject?: (params: AnyRecord) => Promise<AnyRecord>;
};

const extractObjectId = (entry: unknown): string | null => {
  if (!entry || typeof entry !== "object") return null;
  const node = entry as AnyRecord;
  if (typeof node.objectId === "string" && node.objectId) return node.objectId;
  if (typeof node.id === "string" && node.id) return node.id;

  const data = node.data;
  if (data && typeof data === "object") {
    const dataNode = data as AnyRecord;
    if (typeof dataNode.objectId === "string" && dataNode.objectId) return dataNode.objectId;
    if (typeof dataNode.id === "string" && dataNode.id) return dataNode.id;
  }

  return null;
};

const normalizeOwnedEntries = (payload: unknown): AnyRecord[] => {
  if (!payload || typeof payload !== "object") return [];
  const node = payload as AnyRecord;
  if (Array.isArray(node.data)) return node.data as AnyRecord[];
  if (Array.isArray(node.objects)) return node.objects as AnyRecord[];
  if (node.response && typeof node.response === "object" && Array.isArray((node.response as AnyRecord).objects)) {
    return ((node.response as AnyRecord).objects as AnyRecord[]) ?? [];
  }
  return [];
};

const fetchObjectDetails = async (client: AnyClient, objectId: string): Promise<AnyRecord | null> => {
  if (typeof client.getObject !== "function") {
    return { data: { objectId } };
  }

  try {
    const response = await client.getObject({
      id: objectId,
      options: { showContent: true, showType: true, showOwner: true },
    });
    return (response as AnyRecord) ?? null;
  } catch {
    return { data: { objectId } };
  }
};

export const loadFirstOwnedAttestation = async (
  client: AnyClient,
  owner: string,
  structType: string,
): Promise<AnyRecord | null> => {
  if (!client || !owner || !structType) return null;

  if (client.stateService && typeof client.stateService.listOwnedObjects === "function") {
    try {
      const result = await client.stateService.listOwnedObjects({
        owner,
        objectType: structType,
        pageSize: 1,
      });
      const firstId = extractObjectId(normalizeOwnedEntries(result)[0]);
      if (firstId) return await fetchObjectDetails(client, firstId);
    } catch {
      // Continue to next strategy.
    }
  }

  if (client.core && typeof client.core.getOwnedObjects === "function") {
    try {
      const result = await client.core.getOwnedObjects({ address: owner, type: structType, limit: 1 });
      const first = normalizeOwnedEntries(result)[0];
      if (first) return first;
    } catch {
      try {
        const result = await client.core.getOwnedObjects({
          owner,
          filter: { StructType: structType },
          options: { showContent: true },
          limit: 1,
        });
        const first = normalizeOwnedEntries(result)[0];
        if (first) return first;
      } catch {
        // Continue to next strategy.
      }
    }
  }

  if (typeof client.getOwnedObjects === "function") {
    try {
      const result = await client.getOwnedObjects({
        owner,
        filter: { StructType: structType },
        options: { showContent: true },
        limit: 1,
      });
      const first = normalizeOwnedEntries(result)[0];
      if (first) return first;
    } catch {
      return null;
    }
  }

  return null;
};
