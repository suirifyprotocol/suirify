#!/bin/sh
# Debugging: Print what files are actually inside /app
echo "--- Listing /app directory ---"
ls -la /app
echo "-------------------------------------"
echo "Starting Node.js app..."
node /app/enclave.js &

# Start Socat in the foreground (keeps the container alive)
echo "Starting Socat..."
exec socat VSOCK-LISTEN:5000,fork,reuseaddr TCP:127.0.0.1:3000