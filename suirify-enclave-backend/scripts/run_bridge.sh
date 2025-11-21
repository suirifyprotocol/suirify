#!/bin/bash

# Configuration
EIF_PATH="/opt/suirify/suirify/suirify-enclave-backend/out/suirify-enclave.eif"
CPU_COUNT=2
MEMORY_MIB=3800
LOCAL_PORT=8000
ENCLAVE_PORT=5000

# Function to cleanup enclave on exit
cleanup() {
    echo "Stopping Proxy and Terminating Enclaves..."
    pkill -P $$ # Kill child processes (socat)
    nitro-cli terminate-enclave --all
    exit
}

# Trap termination signals (from systemd stop)
trap cleanup SIGINT SIGTERM

echo "--- 1. Cleaning up old enclaves ---"
nitro-cli terminate-enclave --all

echo "--- 2. Launching Nitro Enclave ---"
# Run enclave in background mode (default for nitro-cli)
START_OUTPUT=$(nitro-cli run-enclave --cpu-count $CPU_COUNT --memory $MEMORY_MIB --eif-path $EIF_PATH)
echo "$START_OUTPUT"

# Verify success
if [[ $? -ne 0 ]]; then
    echo "❌ Failed to start enclave."
    exit 1
fi

echo "--- 3. Detecting Enclave CID ---"
# Query nitro-cli to get the assigned CID
# We use jq to parse the JSON output. We take the first running enclave found.
ENCLAVE_CID=$(nitro-cli describe-enclaves | jq -r ".[0].EnclaveCID")

if [ -z "$ENCLAVE_CID" ] || [ "$ENCLAVE_CID" == "null" ]; then
    echo "❌ Could not determine Enclave CID."
    cleanup
fi

echo "✅ Enclave running on CID: $ENCLAVE_CID"

echo "--- 4. Starting Socat Bridge ---"
echo "Ref: TCP:$LOCAL_PORT -> VSOCK:$ENCLAVE_CID:$ENCLAVE_PORT"

# Start socat in foreground so this script stays alive
# Parent App connects to localhost:8000 -> Socat -> VSOCK CID:5000 -> Enclave
socat -d -d TCP-LISTEN:$LOCAL_PORT,fork,reuseaddr VSOCK-CONNECT:$ENCLAVE_CID:$ENCLAVE_PORT