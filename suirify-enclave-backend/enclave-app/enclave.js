const net = require('net'); // Use standard TCP networking
require('dotenv').config();
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');

const ENCLAVE_PRIVATE_KEY = process.env.ENCLAVE_PRIVATE_KEY;
if (!ENCLAVE_PRIVATE_KEY) {
  throw new Error("Critical secret ENCLAVE_PRIVATE_KEY is not set.");
}

const enclaveKeypair = Ed25519Keypair.fromSecretKey(
  Buffer.from(ENCLAVE_PRIVATE_KEY, 'base64')
);

async function handleRequest(request) {
  const { command, data } = request;

  if (command === 'SIGN_MINT_PAYLOAD') {
    if (!data || !data.payloadHex) {
      return { success: false, error: 'payloadHex is required.' };
    }
    const payloadBytes = Buffer.from(data.payloadHex, 'hex');
    const signature = await enclaveKeypair.sign(payloadBytes);
    return {
      success: true,
      signature: Buffer.from(signature).toString('base64'),
    };
  }
  return { success: false, error: 'Unknown command' };
}

// --- TCP Server (Standard Node.js) ---
// Listen on internal TCP 3000. Socat forwards traffic here.
const INTERNAL_PORT = 3000;

const server = net.createServer((socket) => {
  console.log('Enclave: Connection received via Proxy');

  socket.on('data', async (buffer) => {
    try {
      const request = JSON.parse(buffer.toString());
      console.log('Enclave: Processing command:', request.command);
      
      const response = await handleRequest(request);
      
      // Send response and close connection immediately (request/response pattern)
      socket.write(JSON.stringify(response));
      socket.end(); 
    } catch (e) {
      console.error('Enclave: Error:', e.message);
      socket.write(JSON.stringify({ success: false, error: e.message }));
      socket.end();
    }
  });
});

server.listen(INTERNAL_PORT, '127.0.0.1', () => {
  console.log(`Enclave App listening on 127.0.0.1:${INTERNAL_PORT}`);
});