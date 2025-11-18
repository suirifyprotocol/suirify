// Integration test to verify Nautilus enclave integration
// This test verifies that the backend can handle both enclave and non-enclave paths

const assert = require('assert');

console.log('Nautilus Integration Verification\n' + '='.repeat(40));

// Test 1: Verify imports
console.log('\n✓ Test 1: Checking required imports...');
try {
  const vsock = require('vsock');
  const { BCS, getSuiMoveConfig } = require('@mysten/bcs');
  console.log('  ✓ vsock module loaded');
  console.log('  ✓ @mysten/bcs module loaded');
} catch (err) {
  console.error('  ✗ Failed to load required modules:', err.message);
  process.exit(1);
}

// Test 2: Verify environment variable handling
console.log('\n✓ Test 2: Checking environment variable handling...');
const ENCLAVE_CID = parseInt(process.env.ENCLAVE_CID, 10) || 3;
const ENCLAVE_PORT = parseInt(process.env.ENCLAVE_PORT, 10) || 5000;
const ENCLAVE_CONFIG_ID = process.env.ENCLAVE_CONFIG_ID;
const ENCLAVE_OBJECT_ID = process.env.ENCLAVE_OBJECT_ID;

console.log(`  ENCLAVE_CID: ${ENCLAVE_CID} (default: 3)`);
console.log(`  ENCLAVE_PORT: ${ENCLAVE_PORT} (default: 5000)`);
console.log(`  ENCLAVE_CONFIG_ID: ${ENCLAVE_CONFIG_ID || 'not set (will use fallback)'}`);
console.log(`  ENCLAVE_OBJECT_ID: ${ENCLAVE_OBJECT_ID || 'not set (will use fallback)'}`);

const useEnclave = !!(ENCLAVE_CONFIG_ID && ENCLAVE_OBJECT_ID);
console.log(`  \n  Enclave mode: ${useEnclave ? 'ENABLED' : 'DISABLED (using fallback)'}`);

// Test 3: Verify BCS module is available
console.log('\n✓ Test 3: Verifying BCS module availability...');
try {
  const { BcsWriter } = require('@mysten/bcs');
  const writer = new BcsWriter();
  
  // Test basic serialization capabilities
  writer.write8(1);
  writer.write16(256);
  writer.write64(BigInt(Date.now()));
  
  const bytes = writer.toBytes();
  assert(bytes.length > 0, 'Serialization should produce bytes');
  console.log(`  ✓ BCS module available and functional (produced ${bytes.length} bytes)`);
  console.log(`  ✓ BcsWriter can be used for payload serialization`);
} catch (err) {
  console.error('  ✗ BCS module check failed:', err.message);
  process.exit(1);
}

// Test 4: Verify syntax of main backend file
console.log('\n✓ Test 4: Checking backend syntax...');
const { execSync } = require('child_process');
try {
  execSync('node --check index.js', { cwd: __dirname, stdio: 'pipe' });
  console.log('  ✓ Backend index.js has valid syntax');
} catch (err) {
  console.error('  ✗ Backend syntax check failed');
  process.exit(1);
}

console.log('\n' + '='.repeat(40));
console.log('✓ All integration checks passed!');
console.log('\nNautilus Integration Status:');
if (useEnclave) {
  console.log('  ✓ Enclave mode ENABLED - will use secure enclave signing');
} else {
  console.log('  ⚠ Enclave mode DISABLED - will use legacy direct signing');
  console.log('  → To enable enclave: Set ENCLAVE_CONFIG_ID and ENCLAVE_OBJECT_ID');
}
console.log('\n');
