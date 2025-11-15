const vsock = require('vsock');
require('dotenv').config();
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');

// --- Load the Enclave's Private Key ---
// This key corresponds to the public key registered in the on-chain `Enclave` object.
// It should be provided as a base64-encoded 32-byte secret.
const ENCLAVE_PRIVATE_KEY_B64 = process.env.ENCLAVE_PRIVATE_KEY_B64;

if (!ENCLAVE_PRIVATE_KEY_B64) {
  throw new Error("Critical secret ENCLAVE_PRIVATE_KEY_B64 is not set in the enclave environment.");
}

const enclaveKeypair = Ed25519Keypair.fromSecretKey(
  Buffer.from(ENCLAVE_PRIVATE_KEY_B64, 'base64')
);

/// Enclave Logic
async function handleRequest(request) {
  const { command, data } = request;

  if (command === 'SIGN_MINT_PAYLOAD') {
    if (!data || !data.payloadHex) {
      return { success: false, error: 'payloadHex is required.' };
    }
    const payloadBytes = Buffer.from(data.payloadHex, 'hex');

    // The enclave's sole responsibility: sign the payload bytes.
    const signature = await enclaveKeypair.sign(payloadBytes);

    return {
      success: true,
      signature: Buffer.from(signature).toString('base64'),
    };
  }

  return { success: false, error: 'Unknown command' };
}

/// VSOCK Server
const port = 5000;
const server = vsock.createServer(async (conn) => {
  console.log('Enclave: Parent application connected.');
  conn.on('data', async (buffer) => {
    try {
      const request = JSON.parse(buffer.toString());
      console.log('Enclave: Received command:', request.command);
      const response = await handleRequest(request);
      conn.write(JSON.stringify(response));
    } catch (e) {
      console.error('Enclave: Error processing request:', e.message);
      conn.write(JSON.stringify({ success: false, error: e.message }));
    }
  });
  conn.on('end', () => console.log('Enclave: Parent application disconnected.'));
});

console.log(`Enclave: VSOCK server listening on port ${port}...`);
server.listen(port);