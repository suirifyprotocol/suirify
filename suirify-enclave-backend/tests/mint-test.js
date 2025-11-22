// mint-test.js
require('dotenv').config({ path: 'test.env' });
const axios = require('axios');
const { getFullnodeUrl, SuiClient } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { decodeSuiPrivateKey } = require('@mysten/sui/cryptography');
const { Transaction } = require('@mysten/sui/transactions');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const USER_PRIVATE_KEY = process.env.USER_PRIVATE_KEY;

if (!USER_PRIVATE_KEY) {
    console.error("❌ Missing USER_PRIVATE_KEY in test.env");
    process.exit(1);
}

// Setup Sui Client
const client = new SuiClient({ url: getFullnodeUrl('devnet') });

// Load keypair
let keypair;
try {
  if (USER_PRIVATE_KEY.startsWith('suiprivkey')) {
    const { secretKey } = decodeSuiPrivateKey(USER_PRIVATE_KEY);
    keypair = Ed25519Keypair.fromSecretKey(secretKey);
  } else {
    keypair = Ed25519Keypair.fromSecretKey(Buffer.from(USER_PRIVATE_KEY, 'base64'));
  }
} catch (e) {
  console.error("❌ Failed to load private key.", e.message);
  process.exit(1);
}

const userAddress = keypair.getPublicKey().toSuiAddress();

console.log("🧪 STARTING MINT TEST");
console.log(`👤 User Wallet: ${userAddress}`);
console.log(`🌍 Backend:     ${BACKEND_URL}`);

async function runTest() {
    try {
        // Step 1: Start Verification
        console.log("\n[1/5] Starting Verification Session...");
        const startRes = await axios.post(`${BACKEND_URL}/start-verification`, {
            country: 'Nigeria',
            idNumber: '' // Ensure this matches your mock DB logic
        });
        const { sessionId } = startRes.data;
        console.log(`   ✅ Session Created: ${sessionId}`);

        // Step 2: Complete Verification
        console.log("\n[2/5] Completing Biometric Check...");
        const mockPhoto = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
        
        await axios.post(`${BACKEND_URL}/complete-verification`, {
            sessionId,
            walletAddress: userAddress,
            livePhoto: mockPhoto 
        });
        console.log("   ✅ Verification Data Prepared");

        // Step 3: Get Mint Config
        console.log("\n[3/5] Fetching Mint Configuration...");
        const configRes = await axios.get(`${BACKEND_URL}/mint-config`);
        const { packageId, attestationRegistryId, mintFeeMist } = configRes.data;
        
        console.log(`   💰 Mint Fee: ${mintFeeMist} MIST`);

        // Step 4: Check for Existing Request OR Create New One
        console.log("\n[4/5] Checking for Mint Request...");

        let requestId;
        let requestTxDigest;

        // A. Check Backend for pending request
        try {
            const checkRes = await axios.get(`${BACKEND_URL}/mint-request/${userAddress}`);
            if (checkRes.data.hasRequest) {
                console.log(`   ⚠️ Found existing pending request! Reusing it.`);
                requestId = checkRes.data.requestId;
                requestTxDigest = checkRes.data.requestTxDigest;
                console.log(`   ✅ Reusing Request ID: ${requestId}`);
            }
        } catch (e) {
            console.warn("   ⚠️ Failed to check existing requests, proceeding to create new one.");
        }

        // B. If no existing request found, Create one on Blockchain
        if (!requestId) {
            console.log("   🆕 No pending request found. Submitting new Mint Request to Blockchain...");
            
            const tx = new Transaction();
            
            // 1. Split the fee from the User's gas
            const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(mintFeeMist)]);

            // 2. Call create_mint_request(registry, payment_coin)
            tx.moveCall({
                target: `${packageId}::protocol::create_mint_request`,
                arguments: [
                    tx.object(attestationRegistryId), // Arg 0: Registry
                    paymentCoin                       // Arg 1: Payment Coin
                ]
            });

            const result = await client.signAndExecuteTransaction({
                signer: keypair,
                transaction: tx,
                options: {
                    showEffects: true,
                    showEvents: true
                }
            });

            if (result.effects.status.status !== 'success') {
                throw new Error(`Mint Request Failed: ${result.effects.status.error}`);
            }

            // Extract Request ID
            const event = result.events.find(e => e.type.includes('MintRequestCreated'));
            if (!event) throw new Error("MintRequestCreated event not found");
            
            requestId = event.parsedJson.request_id || event.parsedJson.requestId;
            requestTxDigest = result.digest;
            
            console.log(`   ✅ Mint Request Created! ID: ${requestId}`);
        }

        // Step 5: Finalize Mint (Calls your Backend -> Enclave -> Chain)
        console.log("\n[5/5] Finalizing Mint via Enclave...");
        const finalizeRes = await axios.post(`${BACKEND_URL}/finalize-mint`, {
            sessionId,
            requestId,
            requestTxDigest
        });

        if (finalizeRes.data.success) {
            console.log(`   🎉 SUCCESS! Attestation ID: ${finalizeRes.data.attestationId}`);
            console.log(`   🔗 Digest: ${finalizeRes.data.digest}`);
        } else {
            console.error("   ❌ Finalize Failed:", finalizeRes.data.error);
            if (finalizeRes.data.details) console.error("   Details:", finalizeRes.data.details);
        }

    } catch (error) {
        console.error("\n❌ TEST FAILED");
        if (error.response) {
            console.error("   Server Error:", error.response.data);
        } else {
            console.error("   Error:", error.message);
        }
    }
}

runTest();