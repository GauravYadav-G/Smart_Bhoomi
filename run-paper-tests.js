#!/usr/bin/env node
/**
 * SmartBhoomi — Comprehensive System Evaluation Suite
 * Runs all tests and collects data for research paper
 */
'use strict';

const crypto = require('crypto');

// ─── 1. BLOCKCHAIN PERFORMANCE BENCHMARK ───
function benchmarkBlockchain() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  TEST 1: BLOCKCHAIN PERFORMANCE BENCHMARK');
  console.log('═══════════════════════════════════════════════════');

  const chain = require('./blockchain/SovereignChain');

  // Reset stats for clean measurement
  const initialBlocks = chain.chain.length;
  const initialTx = chain.stats.totalTransactions;

  // Submit 50 transactions of various types
  const txTypes = ['PROPERTY_REGISTER', 'OWNERSHIP_TRANSFER', 'PROPERTY_VERIFY', 'IDENTITY_CREATE', 'DOCUMENT_UPLOAD'];
  const results = [];

  for (let i = 0; i < 50; i++) {
    const type = txTypes[i % txTypes.length];
    const start = performance.now();
    const result = chain.submitTransaction(type, {
      propertyId: `TEST-PROP-${i}`,
      testData: crypto.randomBytes(64).toString('hex'),
      timestamp: Date.now()
    }, `TEST-SIGNER-${i % 5}`);
    const elapsed = performance.now() - start;
    results.push({ type, elapsed, confirmed: result.confirmed, blockNumber: result.transaction.blockNumber });
  }

  const avgLatency = results.reduce((s, r) => s + r.elapsed, 0) / results.length;
  const confirmedCount = results.filter(r => r.confirmed).length;
  const blocksProduced = chain.chain.length - initialBlocks;
  const txProcessed = chain.stats.totalTransactions - initialTx;

  // PBFT Stats
  const pbft = chain.getPBFTStats();

  console.log(`\n  Transactions submitted:   ${results.length}`);
  console.log(`  Transactions confirmed:   ${confirmedCount} (${(confirmedCount/results.length*100).toFixed(1)}%)`);
  console.log(`  Blocks produced:          ${blocksProduced}`);
  console.log(`  Avg TX latency:           ${avgLatency.toFixed(3)} ms`);
  console.log(`  Min TX latency:           ${Math.min(...results.map(r=>r.elapsed)).toFixed(3)} ms`);
  console.log(`  Max TX latency:           ${Math.max(...results.map(r=>r.elapsed)).toFixed(3)} ms`);
  console.log(`  Throughput:               ${(txProcessed / (avgLatency * results.length / 1000)).toFixed(1)} TPS`);
  console.log(`\n  PBFT Rounds:              ${pbft.totalRounds}`);
  console.log(`  PBFT Success Rate:        ${pbft.successRate}`);
  console.log(`  PBFT Avg Latency:         ${pbft.latency.avg} ms`);
  console.log(`  PBFT P50 Latency:         ${pbft.latency.p50} ms`);
  console.log(`  PBFT P95 Latency:         ${pbft.latency.p95} ms`);
  console.log(`  PBFT P99 Latency:         ${pbft.latency.p99} ms`);
  console.log(`  Validators Active:        ${pbft.validators.filter(v=>v.isActive).length}/${pbft.validators.length}`);

  return { avgLatency, confirmedCount, blocksProduced, txProcessed, pbft, results };
}

// ─── 2. CHAIN INTEGRITY VERIFICATION ───
function testChainIntegrity() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  TEST 2: CHAIN INTEGRITY VERIFICATION');
  console.log('═══════════════════════════════════════════════════');

  const chain = require('./blockchain/SovereignChain');
  const integrity = chain.verifyChainIntegrity();

  console.log(`\n  Chain Valid:              ${integrity.valid ? '✅ YES' : '❌ NO'}`);
  console.log(`  Blocks Verified:          ${integrity.blocksVerified}`);
  console.log(`  Issues Found:             ${integrity.issues.length}`);

  return integrity;
}

// ─── 3. PBFT BYZANTINE FAULT TOLERANCE TEST ───
function testByzantineFaultTolerance() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  TEST 3: BYZANTINE FAULT TOLERANCE (PBFT)');
  console.log('═══════════════════════════════════════════════════');

  const chain = require('./blockchain/SovereignChain');
  const results = {};

  // Test 1: All honest (3/3)
  const beforeBlocks1 = chain.chain.length;
  chain.submitTransaction('PROPERTY_REGISTER', { propertyId: 'BFT-TEST-1', test: true }, 'BFT-TESTER');
  results.allHonest = { blocksAdded: chain.chain.length - beforeBlocks1, passed: chain.chain.length > beforeBlocks1 };
  console.log(`\n  3/3 Honest Validators:    ${results.allHonest.passed ? '✅ Block produced' : '❌ Failed'}`);

  // Test 2: 1 Byzantine (2/3 honest — should still work, quorum = 2)
  chain.setByzantine('AUD-NODE-03', true);
  const beforeBlocks2 = chain.chain.length;
  chain.submitTransaction('PROPERTY_REGISTER', { propertyId: 'BFT-TEST-2', test: true }, 'BFT-TESTER');
  results.oneByzantine = { blocksAdded: chain.chain.length - beforeBlocks2, passed: chain.chain.length > beforeBlocks2 };
  console.log(`  1/3 Byzantine (2 honest): ${results.oneByzantine.passed ? '✅ Block produced (quorum met)' : '❌ Failed'}`);

  // Test 3: 2 Byzantine (1/3 honest — should FAIL, quorum not met)
  chain.setByzantine('REG-NODE-02', true);
  const pbftFailsBefore = chain.stats.pbftFailed;
  const beforeBlocks3 = chain.chain.length;
  chain.submitTransaction('PROPERTY_REGISTER', { propertyId: 'BFT-TEST-3', test: true }, 'BFT-TESTER');
  // Force block production since tx is pending
  chain._produceBlock();
  results.twoByzantine = { blocksAdded: chain.chain.length - beforeBlocks3, passed: chain.chain.length === beforeBlocks3 };
  const pbftFailsAfter = chain.stats.pbftFailed;
  console.log(`  2/3 Byzantine (1 honest): ${results.twoByzantine.passed ? '✅ Block rejected (BFT safe)' : '❌ Block was produced (BFT broken!)'}`);
  console.log(`  PBFT Failures detected:   ${pbftFailsAfter - pbftFailsBefore}`);

  // Restore honest validators
  chain.setByzantine('AUD-NODE-03', false);
  chain.setByzantine('REG-NODE-02', false);
  // Process pending tx from failed round
  chain._produceBlock();

  results.summary = `f=${results.twoByzantine.passed ? 1 : 0} Byzantine nodes tolerated out of n=3 (f < n/3)`;
  console.log(`\n  BFT Summary:              ${results.summary}`);

  return results;
}

// ─── 4. ENCRYPTION PERFORMANCE ───
function testEncryption() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  TEST 4: AES-256-GCM ENCRYPTION PERFORMANCE');
  console.log('═══════════════════════════════════════════════════');

  const IPFSService = require('./services/ipfsService');
  const sizes = [1024, 10240, 102400, 1048576, 5242880]; // 1KB, 10KB, 100KB, 1MB, 5MB
  const labels = ['1 KB', '10 KB', '100 KB', '1 MB', '5 MB'];
  const results = [];

  for (let i = 0; i < sizes.length; i++) {
    const fileBuffer = crypto.randomBytes(sizes[i]);
    const key = IPFSService.deriveEncryptionKey('TEST-PROP-001', 'TEST-OWNER-001');

    // Encrypt benchmark
    const encStart = performance.now();
    const { encryptedBuffer } = IPFSService.encryptDocument(fileBuffer, key);
    const encTime = performance.now() - encStart;

    // Decrypt benchmark
    const decStart = performance.now();
    const decrypted = IPFSService.decryptDocument(encryptedBuffer, key);
    const decTime = performance.now() - decStart;

    // Verify correctness
    const match = Buffer.compare(fileBuffer, decrypted) === 0;

    results.push({
      label: labels[i],
      size: sizes[i],
      encryptMs: parseFloat(encTime.toFixed(3)),
      decryptMs: parseFloat(decTime.toFixed(3)),
      overhead: encryptedBuffer.length - fileBuffer.length,
      correct: match
    });

    console.log(`\n  ${labels[i]}:`);
    console.log(`    Encrypt:   ${encTime.toFixed(3)} ms`);
    console.log(`    Decrypt:   ${decTime.toFixed(3)} ms`);
    console.log(`    Overhead:  ${encryptedBuffer.length - fileBuffer.length} bytes (IV + AuthTag)`);
    console.log(`    Correct:   ${match ? '✅' : '❌'}`);
  }

  return results;
}

// ─── 5. HKDF KEY DERIVATION TEST ───
function testKeyDerivation() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  TEST 5: HKDF KEY DERIVATION (RFC 5869)');
  console.log('═══════════════════════════════════════════════════');

  const IPFSService = require('./services/ipfsService');

  // Determinism: same inputs → same key
  const key1 = IPFSService.deriveEncryptionKey('PROP-001', 'OWNER-001');
  const key2 = IPFSService.deriveEncryptionKey('PROP-001', 'OWNER-001');
  const deterministic = Buffer.compare(key1, key2) === 0;

  // Uniqueness: different inputs → different keys
  const key3 = IPFSService.deriveEncryptionKey('PROP-002', 'OWNER-001');
  const key4 = IPFSService.deriveEncryptionKey('PROP-001', 'OWNER-002');
  const unique1 = Buffer.compare(key1, key3) !== 0;
  const unique2 = Buffer.compare(key1, key4) !== 0;
  const unique3 = Buffer.compare(key3, key4) !== 0;

  // Key length
  const correctLength = key1.length === 32;

  // Benchmark 1000 derivations
  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    IPFSService.deriveEncryptionKey(`PROP-${i}`, `OWNER-${i}`);
  }
  const elapsed = performance.now() - start;

  console.log(`\n  Deterministic:            ${deterministic ? '✅' : '❌'}`);
  console.log(`  Unique (diff property):   ${unique1 ? '✅' : '❌'}`);
  console.log(`  Unique (diff owner):      ${unique2 ? '✅' : '❌'}`);
  console.log(`  Unique (both differ):     ${unique3 ? '✅' : '❌'}`);
  console.log(`  Key length:               ${key1.length} bytes (${correctLength ? '✅ 256-bit' : '❌'})`);
  console.log(`  1000 derivations:         ${elapsed.toFixed(2)} ms (${(elapsed/1000).toFixed(4)} ms/key)`);

  return { deterministic, unique1, unique2, unique3, correctLength, derivationTimeMs: elapsed };
}

// ─── 6. HAVERSINE GEODESIC ACCURACY ───
function testHaversine() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  TEST 6: HAVERSINE GEODESIC DISTANCE ACCURACY');
  console.log('═══════════════════════════════════════════════════');

  const { haversineDistance } = require('./utils/haversineDistance');

  // Known reference distances (verified with Google Maps)
  const testCases = [
    { name: 'India Gate → Qutub Minar (Delhi)', lat1: 28.6129, lng1: 77.2295, lat2: 28.5245, lng2: 77.1855, expected: 10331, tolerance: 100 },
    { name: 'Gateway of India → Juhu Beach (Mumbai)', lat1: 18.9220, lng1: 72.8347, lat2: 19.0988, lng2: 72.8267, expected: 19665, tolerance: 200 },
    { name: 'Red Fort → Lotus Temple (Delhi)', lat1: 28.6562, lng1: 77.2410, lat2: 28.5535, lng2: 77.2588, expected: 11490, tolerance: 150 },
    { name: 'Same point (zero distance)', lat1: 28.6129, lng1: 77.2295, lat2: 28.6129, lng2: 77.2295, expected: 0, tolerance: 0.001 },
    { name: '100m adjacent parcels', lat1: 19.0760, lng1: 72.8777, lat2: 19.0769, lng2: 72.8777, expected: 100, tolerance: 5 },
    { name: '50m adjacent parcels', lat1: 19.0760, lng1: 72.8777, lat2: 19.07645, lng2: 72.8777, expected: 50, tolerance: 3 },
  ];

  const results = [];
  for (const tc of testCases) {
    const computed = haversineDistance(tc.lat1, tc.lng1, tc.lat2, tc.lng2);
    const error = Math.abs(computed - tc.expected);
    const pass = error <= tc.tolerance;
    results.push({ ...tc, computed: Math.round(computed * 100) / 100, error: Math.round(error * 100) / 100, pass });
    console.log(`\n  ${tc.name}:`);
    console.log(`    Expected: ${tc.expected} m | Computed: ${computed.toFixed(2)} m | Error: ${error.toFixed(2)} m | ${pass ? '✅' : '❌'}`);
  }

  // Benchmark
  const start = performance.now();
  for (let i = 0; i < 10000; i++) {
    haversineDistance(28.6129 + Math.random()*0.01, 77.2295 + Math.random()*0.01, 28.5245, 77.1855);
  }
  const benchMs = performance.now() - start;
  console.log(`\n  10,000 computations:      ${benchMs.toFixed(2)} ms (${(benchMs/10000*1000).toFixed(3)} µs/call)`);

  return { testCases: results, benchmarkMs: benchMs };
}

// ─── 7. DATA INTEGRITY HASH VERIFICATION ───
function testDataIntegrity() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  TEST 7: DATA INTEGRITY HASH (SHA-256)');
  console.log('═══════════════════════════════════════════════════');

  const { generateIntegrityHash } = require('./utils/encryption');

  const data1 = { propertyId: 'PROP-001', owner: 'USER-001', title: 'Test Property' };
  const data2 = { propertyId: 'PROP-001', owner: 'USER-001', title: 'Test Property' };
  const data3 = { propertyId: 'PROP-001', owner: 'USER-001', title: 'Test Property Modified' };

  const hash1 = generateIntegrityHash(data1);
  const hash2 = generateIntegrityHash(data2);
  const hash3 = generateIntegrityHash(data3);

  const deterministic = hash1 === hash2;
  const tamperDetect = hash1 !== hash3;
  const hashLength = hash1.length === 64; // SHA-256 = 64 hex chars

  console.log(`\n  Deterministic:            ${deterministic ? '✅' : '❌'}`);
  console.log(`  Tamper detection:         ${tamperDetect ? '✅' : '❌'}`);
  console.log(`  Hash length:              ${hash1.length} chars (${hashLength ? '✅ SHA-256' : '❌'})`);
  console.log(`  Hash sample:              ${hash1.substring(0, 32)}...`);

  // Benchmark
  const start = performance.now();
  for (let i = 0; i < 10000; i++) {
    generateIntegrityHash({ propertyId: `PROP-${i}`, owner: `USER-${i}`, title: `Property ${i}` });
  }
  const benchMs = performance.now() - start;
  console.log(`  10,000 hashes:            ${benchMs.toFixed(2)} ms (${(benchMs/10000*1000).toFixed(3)} µs/hash)`);

  return { deterministic, tamperDetect, hashLength, benchmarkMs: benchMs };
}

// ─── 8. MERKLE ROOT COMPUTATION ───
function testMerkleRoot() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  TEST 8: MERKLE ROOT COMPUTATION');
  console.log('═══════════════════════════════════════════════════');

  const chain = require('./blockchain/SovereignChain');
  const latestBlock = chain.getLatestBlock();

  // Verify merkle root of latest block
  const recomputed = latestBlock.calculateMerkleRoot();
  const match = recomputed === latestBlock.merkleRoot;

  console.log(`\n  Block #${latestBlock.index}:`);
  console.log(`    TX count:               ${latestBlock.transactions.length}`);
  console.log(`    Merkle root:            ${latestBlock.merkleRoot.substring(0, 32)}...`);
  console.log(`    Recomputed:             ${recomputed.substring(0, 32)}...`);
  console.log(`    Match:                  ${match ? '✅' : '❌'}`);

  // Test with varying tx counts
  const sizes = [1, 2, 4, 8, 16, 32];
  const benchResults = [];
  for (const size of sizes) {
    const txs = [];
    for (let i = 0; i < size; i++) {
      txs.push({ hash: crypto.createHash('sha256').update(`tx-${i}`).digest('hex') });
    }
    const mockBlock = { transactions: txs, calculateMerkleRoot: latestBlock.calculateMerkleRoot.bind({ transactions: txs }) };
    const start = performance.now();
    for (let iter = 0; iter < 1000; iter++) {
      mockBlock.calculateMerkleRoot();
    }
    const elapsed = performance.now() - start;
    benchResults.push({ txCount: size, timeMs: elapsed / 1000 });
    console.log(`    ${size} TXs → Merkle: ${(elapsed/1000).toFixed(4)} ms`);
  }

  return { merkleMatch: match, benchmarks: benchResults };
}

// ─── 9. FIELD-LEVEL ENCRYPTION (AES-256-GCM) ───
function testFieldEncryption() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  TEST 9: FIELD-LEVEL ENCRYPTION (User Data)');
  console.log('═══════════════════════════════════════════════════');

  const { encrypt, decrypt, maskData } = require('./utils/encryption');

  const testData = [
    'ABCD1234EFGH',        // Aadhaar
    'BXYPK5678L',          // PAN
    '+91-9876543210',      // Phone
    'john.doe@example.com' // Email
  ];

  const results = [];
  for (const data of testData) {
    const encrypted = encrypt(data);
    const decrypted = decrypt(encrypted);
    const masked = maskData(data);
    const isEncrypted = encrypted.startsWith('ENC:');
    const isCorrect = decrypted === data;
    results.push({ original: data, encrypted: encrypted.substring(0, 40) + '...', masked, isEncrypted, isCorrect });
    console.log(`\n  Original:   ${data}`);
    console.log(`  Encrypted:  ${encrypted.substring(0, 40)}...`);
    console.log(`  Decrypted:  ${decrypted}`);
    console.log(`  Masked:     ${masked}`);
    console.log(`  Correct:    ${isCorrect ? '✅' : '❌'}`);
  }

  // Benchmark
  const start = performance.now();
  for (let i = 0; i < 5000; i++) {
    const enc = encrypt('SensitiveData_' + i);
    decrypt(enc);
  }
  const benchMs = performance.now() - start;
  console.log(`\n  5,000 encrypt+decrypt:    ${benchMs.toFixed(2)} ms (${(benchMs/5000).toFixed(4)} ms/pair)`);

  return { results, benchmarkMs: benchMs };
}

// ─── 10. NETWORK STATUS SNAPSHOT ───
function testNetworkStatus() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  TEST 10: NETWORK STATUS SNAPSHOT');
  console.log('═══════════════════════════════════════════════════');

  const blockchainService = require('./blockchain/BlockchainService');
  const status = blockchainService.getNetworkStatus();

  console.log(`\n  Chain ID:                 ${status.chainId}`);
  console.log(`  Network:                  ${status.networkName}`);
  console.log(`  Consensus:                ${status.consensus}`);
  console.log(`  Block Height:             ${status.currentBlockHeight}`);
  console.log(`  Total Transactions:       ${status.totalTransactions}`);
  console.log(`  Total Blocks:             ${status.totalBlocks}`);
  console.log(`  Avg Block Time:           ${status.avgBlockTime}s`);
  console.log(`  Peak TPS:                 ${status.peakTps}`);
  console.log(`  Validators:               ${status.validators.active}/${status.validators.total}`);
  console.log(`  PBFT Success Rate:        ${status.pbft.successRate}%`);
  console.log(`  PBFT Avg Consensus:       ${status.pbft.avgConsensusLatencyMs} ms`);
  console.log(`  Uptime:                   ${status.uptime.formatted}`);

  return status;
}

// ─── 11. SCALABILITY TEST (STRESS) ───
function testScalability() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  TEST 11: SCALABILITY STRESS TEST');
  console.log('═══════════════════════════════════════════════════');

  const chain = require('./blockchain/SovereignChain');
  const batchSizes = [10, 50, 100, 200, 500];
  const results = [];

  for (const batchSize of batchSizes) {
    const before = chain.chain.length;
    const txBefore = chain.stats.totalTransactions;
    const start = performance.now();

    for (let i = 0; i < batchSize; i++) {
      chain.submitTransaction('PROPERTY_REGISTER', {
        propertyId: `SCALE-${batchSize}-${i}`,
        data: crypto.randomBytes(128).toString('hex')
      }, 'STRESS-TESTER');
    }

    const elapsed = performance.now() - start;
    const blocksCreated = chain.chain.length - before;
    const txCreated = chain.stats.totalTransactions - txBefore;
    const tps = txCreated / (elapsed / 1000);

    results.push({ batchSize, elapsedMs: parseFloat(elapsed.toFixed(2)), blocksCreated, txCreated, tps: parseFloat(tps.toFixed(1)) });
    console.log(`\n  Batch ${batchSize}: ${elapsed.toFixed(2)} ms, ${blocksCreated} blocks, ${tps.toFixed(1)} TPS`);
  }

  return results;
}

// ═══════════════════════════════════════════════════════
// MAIN — Run All Tests
// ═══════════════════════════════════════════════════════
console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║  SMARTBHOOMI — COMPREHENSIVE SYSTEM EVALUATION SUITE    ║');
console.log('║  Blockchain + AI/ML + IPFS + Security Test Battery      ║');
console.log('╚═══════════════════════════════════════════════════════════╝');

const allResults = {};

allResults.blockchain = benchmarkBlockchain();
allResults.chainIntegrity = testChainIntegrity();
allResults.bft = testByzantineFaultTolerance();
allResults.encryption = testEncryption();
allResults.keyDerivation = testKeyDerivation();
allResults.haversine = testHaversine();
allResults.dataIntegrity = testDataIntegrity();
allResults.merkleRoot = testMerkleRoot();
allResults.fieldEncryption = testFieldEncryption();
allResults.networkStatus = testNetworkStatus();
allResults.scalability = testScalability();

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║  ALL TESTS COMPLETED — Summary                          ║');
console.log('╚═══════════════════════════════════════════════════════════╝');

console.log(`\n  Total Blocks on Chain:    ${allResults.networkStatus.totalBlocks}`);
console.log(`  Total Transactions:       ${allResults.networkStatus.totalTransactions}`);
console.log(`  Chain Integrity:          ${allResults.chainIntegrity.valid ? '✅ VALID' : '❌ BROKEN'}`);
console.log(`  BFT Tolerance:            ${allResults.bft.summary}`);
console.log(`  All Encryption Tests:     ${allResults.encryption.every(r => r.correct) ? '✅ PASS' : '❌ FAIL'}`);
console.log(`  Haversine Accuracy:       ${allResults.haversine.testCases.every(r => r.pass) ? '✅ PASS' : '❌ FAIL'}`);
console.log(`  Max Scalability TPS:      ${Math.max(...allResults.scalability.map(r => r.tps))} TPS`);

console.log('\n  ✅ Evaluation suite completed. Data ready for paper.\n');

// Exit cleanly
process.exit(0);
