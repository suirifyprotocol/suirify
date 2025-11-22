#!/bin/sh
set -e


echo "--- Listing /app directory ---"
ls -la /app
echo "-------------------------------------"

echo "--- Enclave Startup ---"
echo "Starting Node.js app..."
node /app/enclave.js &
NODE_PID=$!

sleep 2
if ! kill -0 $NODE_PID > /dev/null 2>&1; then
    echo "❌ Node.js process crashed immediately. Check logs for ENCLAVE_PRIVATE_KEY errors."
    exit 1
fi

echo "✅ Node.js is running (PID: $NODE_PID)."

echo "Starting Socat..."

exec socat VSOCK-LISTEN:5000,fork,reuseaddr TCP:127.0.0.1:3000