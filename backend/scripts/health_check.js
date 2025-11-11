const fetch = globalThis.fetch || require('node-fetch');

let SuiClient = null;
let getFullnodeUrl = null;
try {
  const sui = require('@mysten/sui');
  SuiClient = sui.SuiClient || (sui.client && sui.client.SuiClient) || null;
  getFullnodeUrl = sui.getFullnodeUrl || (sui.client && sui.client.getFullnodeUrl) || null;
} catch (e1) {
  try {
    ({ SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client'));
  } catch (e2) {
    SuiClient = null;
    getFullnodeUrl = (net) => (net === 'devnet' ? 'https://fullnode.devnet.sui.io:443' : 'https://fullnode.devnet.sui.io:443');
  }
}

(async () => {
  const SUI_RPC = process.env.SUI_RPC || (getFullnodeUrl ? getFullnodeUrl('devnet') : null);
  const PACKAGE_ID = process.env.PACKAGE_ID || null;

  console.log('SUI Health Check');
  if (!SUI_RPC) {
    console.error('✖ SUI_RPC is not configured in environment.');
    process.exit(2);
  }

  console.log(`- RPC endpoint: ${SUI_RPC}`);
  // Basic JSON-RPC ping: sui_getRpcApiVersion (best-effort)
  try {
    const res = await fetch(SUI_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'sui_getRpcApiVersion', params: [] }),
      // node fetch doesn't support timeout in this signature; keep simple
    });
    if (!res.ok) {
      console.error(`✖ RPC request failed with status ${res.status}`);
      process.exit(3);
    }
    const body = await res.json().catch(() => null);
    if (body && body.result) {
      console.log(`✓ RPC responsive: ${JSON.stringify(body.result)}`);
    } else {
      console.warn('⚠ RPC responded but without a result for sui_getRpcApiVersion. Continuing with additional checks.');
    }
  } catch (e) {
    console.error('✖ Failed to reach RPC endpoint:', e.message || e);
    process.exit(4);
  }

  // If PACKAGE_ID is provided, try to fetch the object.
  if (PACKAGE_ID && PACKAGE_ID.length > 0) {
    console.log(`- Checking package object: ${PACKAGE_ID}`);
    try {
      if (SuiClient) {
        // prefer official client if available
        const client = new SuiClient({ url: SUI_RPC });
        const obj = await client.getObject({ id: PACKAGE_ID });
        if (obj && (obj.data || obj.status)) {
          console.log('✓ Package object lookup successful (SuiClient).');
          process.exit(0);
        } else {
          console.error('✖ Package object lookup did not return expected data:', obj);
          process.exit(5);
        }
      } else {
        // fallback: use JSON-RPC sui_getObject
        const rpcRes = await fetch(SUI_RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'sui_getObject',
            params: [PACKAGE_ID],
          }),
        });
        if (!rpcRes.ok) {
          console.error(`✖ sui_getObject RPC failed with status ${rpcRes.status}`);
          process.exit(5);
        }
        const rpcBody = await rpcRes.json().catch(() => null);
        if (rpcBody && rpcBody.result) {
          console.log('✓ Package object lookup successful (RPC).');
          process.exit(0);
        } else {
          console.error('✖ Package object lookup did not return expected data via RPC:', rpcBody);
          process.exit(5);
        }
      }
    } catch (e) {
      console.error('✖ Error fetching package object:', e && e.message ? e.message : e);
      process.exit(6);
    }
  } else {
    console.log('ℹ PACKAGE_ID not set — skipping on-chain package lookup.');
    process.exit(0);
  }
})();
