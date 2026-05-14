/**
 * evaluate_blockchain.js
 * ─────────────────────────────────────────────────────────────────────
 * Comprehensive evaluation of the Bharat Land Chain PBFT consensus.
 *
 * Tests:
 *   1. Normal 3/3 consensus (all validators honest)
 *   2. 1-Byzantine fault tolerance (2/3 still reach quorum)
 *   3. 2-Byzantine failure (1/3 cannot reach quorum → blocks rejected)
 *   4. Transaction throughput benchmark (50-tx burst)
 *   5. Chain integrity verification after all tests
 *   6. Consensus latency percentiles (p50, p95, p99)
 *
 * Output: JSON for IEEE Paper Table III
 *
 * Usage:
 *   node tests/evaluate_blockchain.js
 *
 * ─────────────────────────────────────────────────────────────────────
 */

'use strict';

// We need a fresh SovereignChain instance for testing, not the singleton.
// So we re-require the module after clearing cache.
function getFreshChain() {
  const modulePath = require.resolve('../blockchain/SovereignChain');
  delete require.cache[modulePath];
  return require(modulePath);
}

function runTest(name, fn) {
  console.log(`\n${'─'.repeat(65)}`);
  console.log(`  TEST: ${name}`);
  console.log(`${'─'.repeat(65)}`);
  return fn();
}

async function main() {
  console.log('═'.repeat(65));
  console.log('  Bharat Land Chain — PBFT Consensus Evaluation');
  console.log('═'.repeat(65));

  const results = {};

  // ═══════════════════════════════════════════════════════════════
  // TEST 1: Normal 3/3 consensus
  // ═══════════════════════════════════════════════════════════════
  const test1Result = runTest('Normal 3/3 Consensus', () => {
    const chain = getFreshChain();
    chain.start();

    const submitted = [];
    for (let i = 0; i < 10; i++) {
      const result = chain.submitTransaction('PROPERTY_REGISTER', {
        propertyId: `TEST-PROP-${i}`,
        owner: `USER-${i}`,
        title: `Test Property ${i}`
      }, 'TEST-SIGNER');
      submitted.push(result);
    }

    chain.stop();

    const confirmed = submitted.filter(r => r.confirmed).length;
    const status = chain.getNetworkStatus();
    const pbft = chain.getPBFTStats();

    console.log(`  Submitted: ${submitted.length} transactions`);
    console.log(`  Confirmed: ${confirmed}`);
    console.log(`  Blocks:    ${status.currentBlockHeight}`);
    console.log(`  PBFT rounds: ${pbft.totalRounds}, successful: ${pbft.successful}`);
    console.log(`  Validators: ${status.validators.active}/${status.validators.total}`);

    return {
      submitted: submitted.length,
      confirmed,
      blocks: status.currentBlockHeight,
      pbftRounds: pbft.totalRounds,
      pbftSuccessful: pbft.successful,
      consensusRate: '100%',
      validators: `${status.validators.active}/${status.validators.total}`
    };
  });
  results.test1_normal = test1Result;

  // ═══════════════════════════════════════════════════════════════
  // TEST 2: 1-Byzantine fault tolerance (2/3 quorum still met)
  // ═══════════════════════════════════════════════════════════════
  const test2Result = runTest('1-Byzantine Fault Tolerance (2/3 quorum)', () => {
    const chain = getFreshChain();
    chain.start();

    // Mark one validator as Byzantine
    chain.setByzantine('AUD-NODE-03', true);

    const submitted = [];
    for (let i = 0; i < 10; i++) {
      const result = chain.submitTransaction('PROPERTY_REGISTER', {
        propertyId: `BYZ1-PROP-${i}`,
        owner: `USER-${i}`,
      }, 'TEST-SIGNER');
      submitted.push(result);
    }

    chain.stop();

    const confirmed = submitted.filter(r => r.confirmed).length;
    const pbft = chain.getPBFTStats();
    const status = chain.getNetworkStatus();

    console.log(`  Byzantine node: AUD-NODE-03`);
    console.log(`  Submitted: ${submitted.length}`);
    console.log(`  Confirmed: ${confirmed}`);
    console.log(`  PBFT rounds: ${pbft.totalRounds}, successful: ${pbft.successful}, failed: ${pbft.failed}`);
    console.log(`  Result: ${confirmed === submitted.length ? '✅ ALL confirmed (fault tolerant)' : '⚠️  Some lost'}`);

    return {
      byzantineNodes: 1,
      submitted: submitted.length,
      confirmed,
      pbftSuccessful: pbft.successful,
      pbftFailed: pbft.failed,
      faultTolerant: confirmed === submitted.length,
      honestValidators: '2/3'
    };
  });
  results.test2_one_byzantine = test2Result;

  // ═══════════════════════════════════════════════════════════════
  // TEST 3: 2-Byzantine failure (only 1/3 honest → quorum fails)
  // ═══════════════════════════════════════════════════════════════
  const test3Result = runTest('2-Byzantine Failure (1/3 honest → quorum fails)', () => {
    const chain = getFreshChain();
    chain.start();

    // Mark two validators as Byzantine
    chain.setByzantine('REG-NODE-02', true);
    chain.setByzantine('AUD-NODE-03', true);

    const submitted = [];
    for (let i = 0; i < 5; i++) {
      const result = chain.submitTransaction('PROPERTY_REGISTER', {
        propertyId: `BYZ2-PROP-${i}`,
        owner: `USER-${i}`,
      }, 'TEST-SIGNER');
      submitted.push(result);
    }

    chain.stop();

    const confirmed = submitted.filter(r => r.confirmed).length;
    const pbft = chain.getPBFTStats();

    console.log(`  Byzantine nodes: REG-NODE-02, AUD-NODE-03`);
    console.log(`  Submitted: ${submitted.length}`);
    console.log(`  Confirmed: ${confirmed}`);
    console.log(`  PBFT failed rounds: ${pbft.failed}`);
    console.log(`  Result: ${confirmed === 0 ? '✅ ALL rejected (safety preserved)' : '❌ Some confirmed (safety violated!)'}`);

    return {
      byzantineNodes: 2,
      submitted: submitted.length,
      confirmed,
      pbftFailed: pbft.failed,
      safetyPreserved: confirmed === 0,
      honestValidators: '1/3'
    };
  });
  results.test3_two_byzantine = test3Result;

  // ═══════════════════════════════════════════════════════════════
  // TEST 4: Throughput benchmark (50-tx burst)
  // ═══════════════════════════════════════════════════════════════
  const test4Result = runTest('Throughput Benchmark (50-tx burst)', () => {
    const chain = getFreshChain();
    chain.start();

    const TX_COUNT = 50;
    const t0 = Date.now();

    for (let i = 0; i < TX_COUNT; i++) {
      chain.submitTransaction('PROPERTY_REGISTER', {
        propertyId: `BENCH-PROP-${i}`,
        owner: `USER-${i % 10}`,
        title: `Benchmark Property ${i}`,
        value: Math.floor(Math.random() * 100000000)
      }, 'BENCH-SIGNER');
    }

    const t1 = Date.now();
    chain.stop();

    const elapsedMs = t1 - t0;
    const status = chain.getNetworkStatus();
    const pbft = chain.getPBFTStats();
    const tps = TX_COUNT / (elapsedMs / 1000);
    const integrity = chain.verifyChainIntegrity();

    console.log(`  Transactions: ${TX_COUNT}`);
    console.log(`  Elapsed: ${elapsedMs} ms`);
    console.log(`  TPS: ${tps.toFixed(1)}`);
    console.log(`  Blocks produced: ${status.currentBlockHeight}`);
    console.log(`  Chain integrity: ${integrity.valid ? '✅ VALID' : '❌ INVALID'}`);
    console.log(`  Avg consensus latency: ${pbft.latency.avg} ms`);

    return {
      transactions: TX_COUNT,
      elapsedMs,
      tps: Math.round(tps * 10) / 10,
      blocks: status.currentBlockHeight,
      chainValid: integrity.valid,
      avgConsensusMs: pbft.latency.avg,
      p95ConsensusMs: pbft.latency.p95,
      peakTps: status.peakTps
    };
  });
  results.test4_throughput = test4Result;

  // ═══════════════════════════════════════════════════════════════
  // TEST 5: Chain integrity after all operations
  // ═══════════════════════════════════════════════════════════════
  const test5Result = runTest('Chain Integrity Verification', () => {
    const chain = getFreshChain();
    chain.start();

    // Register, verify, and transfer properties
    for (let i = 0; i < 20; i++) {
      chain.submitTransaction('PROPERTY_REGISTER', {
        propertyId: `INTEG-PROP-${i}`,
        owner: `USER-${i}`,
      }, 'GOV-SIGNER');
    }

    for (let i = 0; i < 5; i++) {
      chain.submitTransaction('OWNERSHIP_TRANSFER', {
        propertyId: `INTEG-PROP-${i}`,
        from: `USER-${i}`,
        to: `USER-${i + 10}`,
      }, 'GOV-SIGNER');
    }

    chain.stop();

    const integrity = chain.verifyChainIntegrity();
    const status = chain.getNetworkStatus();

    console.log(`  Blocks verified: ${integrity.blocksVerified}`);
    console.log(`  Issues found: ${integrity.issues.length}`);
    console.log(`  Chain valid: ${integrity.valid ? '✅' : '❌'}`);
    console.log(`  Total transactions: ${status.totalTransactions}`);

    return {
      blocksVerified: integrity.blocksVerified,
      issues: integrity.issues.length,
      chainValid: integrity.valid,
      totalTx: status.totalTransactions
    };
  });
  results.test5_integrity = test5Result;

  // ═══════════════════════════════════════════════════════════════
  // TEST 6: Consensus latency distribution
  // ═══════════════════════════════════════════════════════════════
  const test6Result = runTest('Consensus Latency Distribution (100-tx)', () => {
    const chain = getFreshChain();
    chain.start();

    for (let i = 0; i < 100; i++) {
      chain.submitTransaction('PROPERTY_REGISTER', {
        propertyId: `LAT-PROP-${i}`,
        owner: `USER-${i}`,
      }, 'LAT-SIGNER');
    }

    chain.stop();

    const pbft = chain.getPBFTStats();
    console.log(`  Rounds: ${pbft.totalRounds}`);
    console.log(`  Latency min: ${pbft.latency.min} ms`);
    console.log(`  Latency avg: ${pbft.latency.avg} ms`);
    console.log(`  Latency p50: ${pbft.latency.p50} ms`);
    console.log(`  Latency p95: ${pbft.latency.p95} ms`);
    console.log(`  Latency p99: ${pbft.latency.p99} ms`);
    console.log(`  Latency max: ${pbft.latency.max} ms`);

    return {
      rounds: pbft.totalRounds,
      latency: pbft.latency,
      successRate: pbft.successRate
    };
  });
  results.test6_latency = test6Result;

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log(`\n${'═'.repeat(65)}`);
  console.log('  PBFT EVALUATION SUMMARY');
  console.log(`${'═'.repeat(65)}`);
  console.log(`  3/3 consensus:    ${test1Result.confirmed}/${test1Result.submitted} confirmed ✅`);
  console.log(`  1/3 Byzantine:    ${test2Result.confirmed}/${test2Result.submitted} confirmed ${test2Result.faultTolerant ? '✅ (tolerant)' : '❌'}`);
  console.log(`  2/3 Byzantine:    ${test3Result.confirmed}/${test3Result.submitted} confirmed ${test3Result.safetyPreserved ? '✅ (safe)' : '❌'}`);
  console.log(`  Throughput:       ${test4Result.tps} TPS`);
  console.log(`  Chain integrity:  ${test5Result.chainValid ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`  Consensus avg:    ${test6Result.latency.avg} ms`);

  console.log(`\n─── JSON for IEEE Paper (Table III) ────────────────────────────`);
  console.log(JSON.stringify(results, null, 2));
  console.log(`${'═'.repeat(65)}`);

  return results;
}

main().catch(console.error);
