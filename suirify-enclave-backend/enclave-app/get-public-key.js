// get-public-key.js
require('dotenv').config();
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { decodeSuiPrivateKey } = require('@mysten/sui/cryptography');

const PRIVATE_KEY = process.env.ENCLAVE_PRIVATE_KEY;

if (!PRIVATE_KEY) {
    console.error("❌ Error: ENCLAVE_PRIVATE_KEY is missing from .env file.");
    process.exit(1);
}

console.log("🔑 Processing Key...\n");

let keypair;
try {
    if (PRIVATE_KEY.startsWith('suiprivkey')) {
        // Decode Bech32
        const { secretKey } = decodeSuiPrivateKey(PRIVATE_KEY);
        keypair = Ed25519Keypair.fromSecretKey(secretKey);
    } else {
        // Decode Base64
        keypair = Ed25519Keypair.fromSecretKey(Buffer.from(PRIVATE_KEY, 'base64'));
    }
} catch (e) {
    console.error("❌ Invalid Key Format:", e.message);
    process.exit(1);
}

// Get the Raw Public Key Bytes
const pubKeyBytes = keypair.getPublicKey().toRawBytes();
const pubKeyHex = Buffer.from(pubKeyBytes).toString('hex');
const pubKeyArray = JSON.stringify(Array.from(pubKeyBytes));
const suiAddress = keypair.getPublicKey().toSuiAddress();

console.log("---------------------------------------------------------");
console.log("✅ PUBLIC KEY DETAILS");
console.log("---------------------------------------------------------");
console.log("1. SUI ADDRESS (For funding/explorer):");
console.log(`   ${suiAddress}`);
console.log("\n2. RAW PUBLIC KEY (Hex) - Use this for scripts:");
console.log(`   ${pubKeyHex}`);
console.log("\n3. RAW PUBLIC KEY (Vector) - Use this for CLI/Move:");
console.log(`   ${pubKeyArray}`);
console.log("---------------------------------------------------------");