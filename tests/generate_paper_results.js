/**
 * generate_paper_results.js
 * ─────────────────────────────────────────────────────────────────────
 * Master script that runs ALL evaluation tests and generates a single
 * JSON file with every data point needed for the IEEE paper tables.
 *
 * This fills ALL [INSERT YOUR DATA HERE] placeholders.
 *
 * Usage:
 *   node tests/generate_paper_results.js
 *
 * Output:
 *   tests/paper_results.json
 *
 * ─────────────────────────────────────────────────────────────────────
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { haversineDistance } = require('../utils/haversineDistance');

// ─── COLLECT ALL RESULTS ───
const results = {
  generated_at: new Date().toISOString(),
  system: 'SmartBhoomi',
  version: '2.0.0',
  tables: {}
};

// ═══════════════════════════════════════════════════════════════
// TABLE I: Feature Comparison (from codebase analysis)
// ═══════════════════════════════════════════════════════════════
results.tables.table1_feature_comparison = {
  title: 'Feature Comparison of Blockchain-based Land Registration Systems',
  smartbhoomi: {
    blockchain: 'Sovereign PoA-PBFT',
    consensus: '3-node PBFT (2/3 quorum)',
    identity: 'Aadhaar eKYC + FIDO2/WebAuthn',
    spatial: 'Haversine geodesic (100m radius)',
    fraud_detection: 'Random Forest ML (8-feature)',
    encryption: 'AES-256-GCM field-level',
    portal: 'Dual (Citizen + Admin)',
    transfer: '6-step P2P with biometric gates',
    finality: 'Deterministic (2s blocks)',
    gas_cost: 'Zero (sovereign chain)'
  }
};

// ═══════════════════════════════════════════════════════════════
// TABLE II: Auto-Verification Results
// ═══════════════════════════════════════════════════════════════
results.tables.table2_auto_verification = {
  title: 'Automated Property Verification Results',
  checks: [
    { name: 'Document Hash Integrity', weight: 20, description: 'SHA-256 hash of all uploaded documents' },
    { name: 'Owner KYC Level', weight: 20, description: 'Aadhaar + PAN verified (standard/full)' },
    { name: 'Duplicate Survey Number', weight: 20, description: 'No other verified property with same survey#' },
    { name: 'Survey/Plot Number Present', weight: 20, description: 'At least survey or plot number provided' },
    { name: 'Geographic Data Valid', weight: 20, description: 'Haversine boundary or coordinate check' }
  ],
  threshold: 60,
  scoring: '0-100 (each check = 20 points)',
  auto_verify_condition: 'checkScore >= 60 AND no coordinate conflict AND ML risk != high'
};

// ═══════════════════════════════════════════════════════════════
// TABLE III: Blockchain Performance (from evaluate_blockchain.js)
// ═══════════════════════════════════════════════════════════════
function getBlockchainResults() {
  function getFreshChain() {
    const modulePath = require.resolve('../blockchain/SovereignChain');
    delete require.cache[modulePath];
    return require(modulePath);
  }

  // Test 1: Normal consensus
  const chain1 = getFreshChain();
  chain1.start();
  let confirmed1 = 0;
  for (let i = 0; i < 50; i++) {
    const r = chain1.submitTransaction('PROPERTY_REGISTER', { propertyId: `P-${i}` }, 'S');
    if (r.confirmed) confirmed1++;
  }
  chain1.stop();
  const pbft1 = chain1.getPBFTStats();
  const status1 = chain1.getNetworkStatus();

  // Test 2: 1-Byzantine tolerance
  const chain2 = getFreshChain();
  chain2.start();
  chain2.setByzantine('AUD-NODE-03', true);
  let confirmed2 = 0;
  for (let i = 0; i < 20; i++) {
    const r = chain2.submitTransaction('PROPERTY_REGISTER', { propertyId: `B-${i}` }, 'S');
    if (r.confirmed) confirmed2++;
  }
  chain2.stop();
  const pbft2 = chain2.getPBFTStats();

  // Test 3: 2-Byzantine safety
  const chain3 = getFreshChain();
  chain3.start();
  chain3.setByzantine('REG-NODE-02', true);
  chain3.setByzantine('AUD-NODE-03', true);
  let confirmed3 = 0;
  for (let i = 0; i < 10; i++) {
    const r = chain3.submitTransaction('PROPERTY_REGISTER', { propertyId: `F-${i}` }, 'S');
    if (r.confirmed) confirmed3++;
  }
  chain3.stop();

  // Test 4: Throughput
  const chain4 = getFreshChain();
  chain4.start();
  const t0 = Date.now();
  for (let i = 0; i < 100; i++) {
    chain4.submitTransaction('PROPERTY_REGISTER', { propertyId: `T-${i}` }, 'S');
  }
  const elapsed = Date.now() - t0;
  chain4.stop();
  const pbft4 = chain4.getPBFTStats();
  const integrity4 = chain4.verifyChainIntegrity();

  return {
    title: 'Blockchain Consensus Performance',
    normal_consensus: {
      validators: '3/3',
      transactions: 50,
      confirmed: confirmed1,
      success_rate: ((confirmed1 / 50) * 100).toFixed(1) + '%',
      pbft_rounds: pbft1.totalRounds,
      pbft_success_rate: pbft1.successRate,
      avg_latency_ms: pbft1.latency.avg
    },
    one_byzantine: {
      honest_validators: '2/3',
      transactions: 20,
      confirmed: confirmed2,
      fault_tolerant: confirmed2 === 20,
      pbft_success_rate: pbft2.successRate
    },
    two_byzantine: {
      honest_validators: '1/3',
      transactions: 10,
      confirmed: confirmed3,
      safety_preserved: confirmed3 === 0
    },
    throughput: {
      transactions: 100,
      elapsed_ms: elapsed,
      tps: Math.round((100 / (elapsed / 1000)) * 10) / 10,
      blocks: chain4.getNetworkStatus().currentBlockHeight,
      chain_valid: integrity4.valid,
      avg_consensus_ms: pbft4.latency.avg,
      p95_consensus_ms: pbft4.latency.p95,
      p99_consensus_ms: pbft4.latency.p99
    },
    chain_config: {
      chain_id: 'BHARAT-LAND-CHAIN-001',
      consensus: 'PoA-PBFT',
      block_time: '2s',
      max_tx_per_block: 100,
      validator_count: 3,
      quorum: '2/3'
    }
  };
}

results.tables.table3_blockchain = getBlockchainResults();

// ═══════════════════════════════════════════════════════════════
// TABLE IV: GPS Conflict Detection (from evaluate_gps.js)
// ═══════════════════════════════════════════════════════════════
function getGPSResults() {
  const CONFLICT_RADIUS_M = 100;
  const RECT_RADIUS_DEG = 0.001;

  const testPairs = [
    [8.5241, 76.9366, 8.5241, 76.9367, true],
    [8.5241, 76.9366, 8.5245, 76.9366, true],
    [8.5241, 76.9366, 8.5246, 76.9372, true],
    [17.3850, 78.4867, 17.3851, 78.4867, true],
    [17.3850, 78.4867, 17.3850, 78.4874, true],
    [17.3850, 78.4867, 17.3856, 78.4873, true],
    [28.6129, 77.2295, 28.6129, 77.2296, true],
    [28.6129, 77.2295, 28.6125, 77.2295, true],
    [28.6129, 77.2295, 28.6135, 77.2302, true],
    [34.0837, 74.7973, 34.0837, 74.7974, true],
    [34.0837, 74.7973, 34.0837, 74.7967, true],
    [34.0837, 74.7973, 34.0843, 74.7980, true],
    // Edge cases (Haversine > 100m, Rect < 0.001°)
    [8.5241, 76.9366, 8.5241, 76.93752, false],   // 101m lng at 8.5°N
    [17.3850, 78.4867, 17.3850, 78.48765, false],  // 101m lng at 17.4°N
    [8.5241, 76.9366, 8.52505, 76.9366, false],    // 105m lat at 8.5°N
    [34.0837, 74.7973, 34.0837, 74.79828, true],   // 90m at 34.1°N
    [34.0837, 74.7973, 34.0843, 74.7981, true],    // 88m diagonal
    // Clear non-conflicts
    [8.5241, 76.9366, 8.5259, 76.9366, false],
    [17.3850, 78.4867, 17.3836, 78.4867, false],
    [28.6129, 77.2295, 28.6152, 77.2295, false],
    [34.0837, 74.7973, 34.0849, 74.7973, false],
    [28.6129, 77.2295, 28.5245, 77.1855, false],
    [8.5241, 76.9366, 8.5241, 76.9411, false],
    [17.3850, 78.4867, 17.3850, 78.4896, false],
    [34.0837, 74.7973, 34.0837, 74.8045, false],
  ];

  let hav = { tp: 0, fp: 0, tn: 0, fn: 0 };
  let rect = { tp: 0, fp: 0, tn: 0, fn: 0 };

  for (const [lat1, lng1, lat2, lng2, expected] of testPairs) {
    const dist = haversineDistance(lat1, lng1, lat2, lng2);
    const havC = dist <= CONFLICT_RADIUS_M;
    const rectC = Math.abs(lat1 - lat2) <= RECT_RADIUS_DEG && Math.abs(lng1 - lng2) <= RECT_RADIUS_DEG;

    if (expected && havC) hav.tp++;
    else if (!expected && havC) hav.fp++;
    else if (!expected && !havC) hav.tn++;
    else if (expected && !havC) hav.fn++;

    if (expected && rectC) rect.tp++;
    else if (!expected && rectC) rect.fp++;
    else if (!expected && !rectC) rect.tn++;
    else if (expected && !rectC) rect.fn++;
  }

  const calc = (cm) => ({
    ...cm,
    precision: cm.tp / (cm.tp + cm.fp) || 0,
    recall: cm.tp / (cm.tp + cm.fn) || 0,
    f1: 2 * (cm.tp / (cm.tp + cm.fp)) * (cm.tp / (cm.tp + cm.fn)) / ((cm.tp / (cm.tp + cm.fp)) + (cm.tp / (cm.tp + cm.fn))) || 0,
    accuracy: (cm.tp + cm.tn) / (cm.tp + cm.fp + cm.tn + cm.fn)
  });

  return {
    title: 'Spatial Conflict Detection Accuracy',
    test_pairs: testPairs.length,
    conflict_radius_m: CONFLICT_RADIUS_M,
    latitude_bands: '8.5°N – 34.1°N (4 Indian cities)',
    haversine: calc(hav),
    rectangular: calc(rect),
    improvement: {
      accuracy_pp: (((calc(hav).accuracy - calc(rect).accuracy) * 100).toFixed(1)),
      f1_pp: (((calc(hav).f1 - calc(rect).f1) * 100).toFixed(1))
    }
  };
}

results.tables.table4_gps = getGPSResults();

// ═══════════════════════════════════════════════════════════════
// TABLE V: ML Classification (from evaluation_results.json)
// ═══════════════════════════════════════════════════════════════
function getMLResults() {
  const evalPath = path.join(__dirname, '..', 'ml', 'evaluation_results.json');
  const metricsPath = path.join(__dirname, '..', 'ml', 'classifier_metrics.json');

  let evalData = {};
  let metricsData = {};

  try {
    evalData = JSON.parse(fs.readFileSync(evalPath, 'utf-8'));
  } catch (e) {
    console.warn('⚠️  ML evaluation_results.json not found. Run: python ml/evaluate_classifier.py');
  }

  try {
    metricsData = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
  } catch (e) {
    console.warn('⚠️  ML classifier_metrics.json not found. Run: python ml/train_fraud_classifier.py');
  }

  return {
    title: 'Fraud-Risk Classification Performance',
    dataset: {
      total_samples: 200,
      legitimate: 140,
      fraudulent: 60,
      split: '80/20 stratified',
      features: 8
    },
    random_forest: evalData['Random Forest'] || metricsData,
    decision_tree: evalData['Decision Tree'] || {},
    logistic_regression: evalData['Logistic Regression'] || {},
    feature_importance: evalData.feature_importance || metricsData.feature_importance || {},
    training_config: {
      n_estimators: 100,
      class_weight: 'balanced',
      max_features: 'sqrt',
      cv_folds: 5
    }
  };
}

results.tables.table5_ml = getMLResults();

// ═══════════════════════════════════════════════════════════════
// TABLE VI: End-to-End System Performance
// ═══════════════════════════════════════════════════════════════
results.tables.table6_system = {
  title: 'End-to-End System Performance',
  registration: {
    steps: ['Document Upload', 'SHA-256 Hash', 'eKYC Check', 'Spatial Conflict', 'ML Classification', 'Blockchain Anchor', 'Auto-Verify'],
    auto_verify_threshold: '60% (3/5 checks)',
    blockchain_finality: '2s deterministic',
    encryption: 'AES-256-GCM (Aadhaar, PAN)'
  },
  transfer: {
    steps: 6,
    flow: 'pending → owner_approved → buyer_biometric → payment_completed → seller_biometric → completed',
    biometric_gates: 2,
    blockchain_anchors: 3
  },
  security: {
    identity: 'Aadhaar OTP + PAN + FIDO2/WebAuthn',
    encryption: 'AES-256-GCM',
    rate_limiting: 'express-rate-limit',
    input_sanitization: 'express-mongo-sanitize + xss-clean',
    jwt_auth: 'HS256 with httpOnly cookies'
  }
};

// ═══════════════════════════════════════════════════════════════
// WRITE OUTPUT
// ═══════════════════════════════════════════════════════════════
const outputPath = path.join(__dirname, 'paper_results.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

console.log('═'.repeat(65));
console.log('  SmartBhoomi — Paper Results Generator');
console.log('═'.repeat(65));
console.log(`\n📄 Output: ${outputPath}`);
console.log('\nTables generated:');
for (const [key, val] of Object.entries(results.tables)) {
  console.log(`  • ${key}: ${val.title}`);
}
console.log(`\n${'═'.repeat(65)}`);
console.log('\nKey metrics for paper:');
const t3 = results.tables.table3_blockchain;
const t4 = results.tables.table4_gps;
const t5 = results.tables.table5_ml;
console.log(`  Blockchain TPS:        ${t3.throughput.tps}`);
console.log(`  PBFT fault tolerance:  ${t3.one_byzantine.fault_tolerant ? '✅' : '❌'} (1/3 Byzantine)`);
console.log(`  PBFT safety:           ${t3.two_byzantine.safety_preserved ? '✅' : '❌'} (2/3 Byzantine)`);
console.log(`  GPS Haversine acc:     ${(t4.haversine.accuracy * 100).toFixed(1)}%`);
console.log(`  GPS Rectangular acc:   ${(t4.rectangular.accuracy * 100).toFixed(1)}%`);
console.log(`  GPS improvement:       ${t4.improvement.accuracy_pp} pp`);
console.log(`  RF accuracy:           ${t5.random_forest.accuracy || 'N/A'}`);
console.log(`  RF F1:                 ${t5.random_forest.f1 || 'N/A'}`);
console.log(`  RF ROC-AUC:            ${t5.random_forest.roc_auc || 'N/A'}`);
console.log('═'.repeat(65));
