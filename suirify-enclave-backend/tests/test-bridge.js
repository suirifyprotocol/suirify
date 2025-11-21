const net = require('net');

// Connect to the Proxy (Socat) on port 8000
const client = new net.Socket();
console.log("Connecting to Proxy on 8000...");

client.connect(8000, '127.0.0.1', () => {
    console.log('✅ Connected to Enclave via Proxy!');
    
    // Send a dummy command the Enclave understands
    // (Based on your enclave.js logic)
    const payload = JSON.stringify({
        command: 'SIGN_MINT_PAYLOAD',
        data: { payloadHex: 'deadbeef' } // Dummy hex data
    });
    
    client.write(payload);
});

client.on('data', (data) => {
    console.log('📩 Received from Enclave:', data.toString());
    console.log('🎉 SUCCESS! The architecture is working.');
    client.destroy();
});

client.on('error', (err) => {
    console.error('❌ Connection Error:', err.message);
});

client.on('close', () => {
    console.log('Connection closed');
});