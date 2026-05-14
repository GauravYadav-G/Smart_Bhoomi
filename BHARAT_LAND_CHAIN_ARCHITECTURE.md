# ═══════════════════════════════════════════════════════════════════════════════

# BHARAT LAND CHAIN — Sovereign Permissioned Blockchain Architecture

# National Digital Land Infrastructure — Complete Technical Blueprint

# ═══════════════════════════════════════════════════════════════════════════════

**Classification**: GOVERNMENT RESTRICTED — NIC INTERNAL USE ONLY  
**Version**: 2.0.0 — Production Architecture  
**Governing Authority**: Ministry of Electronics & Information Technology (MeitY)  
**Operating Framework**: Digital India Land Records Modernization Programme (DILRMP)  
**Date**: 14 February 2026  
**Chain ID**: `BHARAT-LAND-CHAIN-001`

---

> **Architectural Mandate**: This document defines the complete sovereign blockchain
> infrastructure that serves as the immutable truth layer beneath the Smart Bhoomi
> National Property Registry. Every component described herein has **zero dependency**
> on Ethereum, EVM, Solidity, or any public Web3 framework. The chain is
> purpose-built, government-controlled, and deterministically final.

---

## Table of Contents

1. [Blockchain Core Engine](#1-blockchain-core-engine)
2. [Validator Governance System](#2-validator-governance-system)
3. [Government ID Linkage](#3-government-id-linkage)
4. [Blockchain Management Dashboard](#4-blockchain-management-dashboard)
5. [Property Registry Integration Layer](#5-property-registry-integration-layer)
6. [High Availability & Disaster Recovery](#6-high-availability--disaster-recovery)
7. [Security Architecture](#7-security-architecture)
8. [Deployment Architecture](#8-deployment-architecture)
9. [5-Year Scalability Roadmap](#9-5-year-scalability-roadmap)

---

## 1. Blockchain Core Engine

### 1.1 Architecture Classification

Bharat Land Chain is a **custom permissioned deterministic state machine** — not a fork of any public chain. It implements a hybrid **Proof-of-Authority (PoA)** block production mechanism with **Practical Byzantine Fault Tolerance (PBFT)** finality, guaranteeing that every committed block is immediately and irreversibly final.

| Property           | Specification                                              |
| ------------------ | ---------------------------------------------------------- |
| **Chain Type**     | Sovereign Permissioned                                     |
| **Consensus**      | PoA Block Production + PBFT Finality                       |
| **Block Time**     | ~2 seconds (configurable: `CHAIN_CONFIG.blockTime = 2000`) |
| **Finality Model** | Deterministic — **zero fork probability**                  |
| **Max Block Size** | 1 MB (`maxBlockSize: 1048576`)                             |
| **Max TX/Block**   | 100 (`maxTransactionsPerBlock: 100`)                       |
| **Hash Algorithm** | SHA-256 (Node.js `crypto` module)                          |
| **Merkle Tree**    | Binary recursive SHA-256                                   |
| **EVM Dependency** | **None** — entirely custom                                 |
| **Mining**         | **None** — PoA validators produce blocks                   |

### 1.2 Core Components

```
┌───────────────────────────────────────────────────────────────────────────┐
│                    BHARAT LAND CHAIN — CORE ENGINE                       │
│                                                                           │
│  ┌─────────────┐   ┌──────────────────┐   ┌───────────────────────────┐ │
│  │  MEMPOOL     │──▶│  BLOCK BUILDER   │──▶│  PBFT CONSENSUS ENGINE    │ │
│  │              │   │  (Deterministic) │   │  (2/3 Validator Quorum)   │ │
│  │ Pending TXs  │   │                  │   │                           │ │
│  │ Priority Q   │   │  TX Selection    │   │  PRE-PREPARE ──▶ PREPARE  │ │
│  │ Gas Calc     │   │  Merkle Root     │   │  PREPARE ──▶ COMMIT       │ │
│  │ Dedup Index  │   │  Block Assembly  │   │  COMMIT ──▶ FINALIZE      │ │
│  └─────────────┘   └──────────────────┘   └───────────────────────────┘ │
│         │                    │                          │                 │
│         ▼                    ▼                          ▼                 │
│  ┌─────────────┐   ┌──────────────────┐   ┌───────────────────────────┐ │
│  │ TRANSACTION  │   │  STATE DATABASE  │   │  DIGITAL SIGNATURE        │ │
│  │ INDEX        │   │                  │   │  ENGINE                   │ │
│  │              │   │  Chain[] (RAM)   │   │                           │ │
│  │ hash → TX    │   │  MongoDB (Disk)  │   │  HMAC-SHA256 Validator    │ │
│  │ propId → TXs │   │  Block Index     │   │  TX Hash Computation      │ │
│  │ Gas Ledger   │   │  State Snapshot  │   │  Merkle Proof Gen         │ │
│  └─────────────┘   └──────────────────┘   └───────────────────────────┘ │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                    EVENT EMITTER BUS (Node.js EventEmitter)        │  │
│  │  block:committed | transaction:submitted | validator:added/removed │  │
│  │  network:started | network:stopped | chain:tamper_detected         │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Mempool (Transaction Pool)

The mempool is the **holding area** for unconfirmed transactions before they are included in a block.

**Current Implementation** (`SovereignChain.js`):

```
this.pendingTransactions = [];          // Ordered FIFO queue
this.transactionIndex = new Map();      // hash → Transaction (global lookup)
this.propertyIndex = new Map();         // propertyId → [tx hashes] (property-scoped)
```

**Production Mempool Specification**:

| Component           | Function                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| **Ingress Gate**    | Validates TX signature, checks gas, rejects duplicates                                          |
| **Priority Queue**  | Orders by: `PROPERTY_REGISTER > OWNERSHIP_TRANSFER > PROPERTY_VERIFY > IDENTITY_CREATE`         |
| **Deduplication**   | `transactionIndex.has(tx.hash)` prevents replay attacks                                         |
| **Gas Estimator**   | `baseGas(21000) + dataGas(payload.length × 16)` — no monetary cost, tracks computational weight |
| **Eviction Policy** | Transactions pending > 60 seconds are marked `failed` and evicted                               |
| **Capacity**        | Max 10,000 pending transactions (backpressure if exceeded)                                      |
| **Flush Trigger**   | Block production every 2 seconds consumes up to 100 TXs                                         |

### 1.4 Deterministic Block Builder

The block builder operates on a **strict deterministic schedule** — every 2 seconds, it consumes the mempool and produces a single canonical block.

**Block Production Algorithm** (from `_produceBlock()`):

```
1. CHECK pendingTransactions.length > 0        → Skip if empty (no empty blocks)
2. SELECT validator via round-robin:           → chain.length % activeValidators.length
3. SPLICE up to 100 TXs from mempool
4. CONSTRUCT Block(index, previousHash, txs, validator)
5. COMPUTE merkleRoot via binary SHA-256 tree
6. COMPUTE block hash: SHA-256(index + prevHash + timestamp + merkleRoot + validator + nonce)
7. VALIDATE block integrity:
   a. index === previousBlock.index + 1
   b. previousHash === previousBlock.hash
   c. hash === recalculatedHash
   d. timestamp > previousBlock.timestamp
8. COMMIT block to chain[]
9. CONFIRM all TXs: set status='confirmed', blockNumber, blockHash
10. INCREMENT confirmations on last 6 blocks
11. EMIT 'block:committed' event → WebSocket broadcast
```

### 1.5 Block Structure

Every block in the chain is an instance of the `Block` class:

```
┌─────────────────────────────────────────────────────────────┐
│                        BLOCK #N                              │
├──────────────────┬──────────────────────────────────────────┤
│  index           │  Sequential integer (0, 1, 2, ...)       │
│  timestamp       │  Unix milliseconds (Date.now())          │
│  previousHash    │  SHA-256 hash of Block #N-1              │
│  hash            │  SHA-256(index+prevHash+ts+merkle+val)   │
│  merkleRoot      │  Binary SHA-256 tree of TX hashes        │
│  validator       │  ID of the PoA validator who produced    │
│  transactions[]  │  Array of Transaction objects            │
│  nonce           │  Reserved (always 0 in PoA)              │
│  confirmations   │  Incremented by subsequent blocks        │
│  size            │  JSON.stringify(transactions).length     │
└──────────────────┴──────────────────────────────────────────┘
```

### 1.6 Transaction Structure

```
┌─────────────────────────────────────────────────────────────┐
│                      TRANSACTION                             │
├──────────────────┬──────────────────────────────────────────┤
│  id              │  TX-{timestamp}-{random_hex}              │
│  type            │  PROPERTY_REGISTER | PROPERTY_VERIFY |   │
│                  │  OWNERSHIP_TRANSFER | IDENTITY_CREATE |  │
│                  │  GENESIS                                  │
│  data            │  Arbitrary payload (property details)    │
│  signer          │  Blockchain ID of the submitting party   │
│  timestamp       │  Unix milliseconds                       │
│  hash            │  SHA-256(id+type+data+signer+timestamp)  │
│  status          │  pending → confirmed | failed            │
│  blockNumber     │  Set upon confirmation                   │
│  blockHash       │  Set upon confirmation                   │
│  gasUsed         │  21000 + (payload_bytes × 16)            │
└──────────────────┴──────────────────────────────────────────┘
```

### 1.7 Merkle Tree Builder

The Merkle root provides **O(log n)** proof of transaction inclusion without downloading the full block:

```
                         ROOT HASH
                        /          \
                    H(AB)          H(CD)
                   /    \         /    \
                H(A)   H(B)   H(C)   H(D)
                 |       |       |       |
               TX_0    TX_1    TX_2    TX_3
```

**Algorithm** (from `calculateMerkleRoot()`):

- If transactions is empty → SHA-256('empty')
- Extract `tx.hash` from each transaction
- While `hashes.length > 1`: pair and hash (`SHA-256(left + right)`), duplicate last if odd
- Final single hash = `merkleRoot`

### 1.8 Tamper Detection

Chain integrity verification (`verifyChainIntegrity()`) performs a **full sequential audit**:

| Check               | Rule                                         | Failure Type  |
| ------------------- | -------------------------------------------- | ------------- |
| **Hash Linkage**    | `block[i].previousHash === block[i-1].hash`  | `broken_link` |
| **Hash Integrity**  | `block[i].hash === block[i].calculateHash()` | `tampered`    |
| **Timestamp Order** | `block[i].timestamp > block[i-1].timestamp`  | `timestamp`   |

Returns: `{ valid: boolean, blocksVerified: number, issues: [], lastVerified: timestamp }`

**Real-time tamper detection**: Every block committed triggers a backward-window integrity check (last 7 blocks). Any corruption immediately emits `chain:tamper_detected` via the Event Bus → WebSocket → Dashboard alert.

---

## 2. Validator Governance System

### 2.1 Validator Node Architecture

Every validator is an instance of the `ValidatorNode` class — a government-authorized entity permitted to produce blocks and participate in PBFT consensus.

```
┌─────────────────────────────────────────────────────────────┐
│                    VALIDATOR NODE                            │
├──────────────────┬──────────────────────────────────────────┤
│  id              │  Unique identifier (e.g., GOV-NODE-DEL) │
│  name            │  Human-readable (e.g., "Delhi Revenue   │
│                  │  Dept Primary Node")                     │
│  role            │  government | registry_office | audit    │
│  publicKey       │  256-bit key (crypto.randomBytes(32))   │
│  isActive        │  Boolean — participates in consensus    │
│  blocksProduced  │  Counter — total blocks produced        │
│  lastBlockTs     │  Timestamp of last produced block       │
│  uptime          │  Percentage (calculated)                │
│  joinedAt        │  Registration timestamp                 │
└──────────────────┴──────────────────────────────────────────┘
```

### 2.2 Validator Lifecycle Management

```
┌───────────┐     ┌──────────────┐     ┌───────────┐     ┌─────────────┐
│ APPLICATION│────▶│ GOVERNMENT   │────▶│ KEY       │────▶│ ACTIVE      │
│ SUBMITTED  │     │ APPROVAL     │     │ CEREMONY  │     │ VALIDATOR   │
│            │     │ (Multi-Sig)  │     │ (HSM Gen) │     │             │
└───────────┘     └──────────────┘     └───────────┘     └──────┬──────┘
                                                                 │
                                          ┌──────────────────────┤
                                          ▼                      ▼
                                   ┌─────────────┐      ┌──────────────┐
                                   │ SUSPENDED    │      │ KEY ROTATION │
                                   │ (Slashing)   │      │ (Epoch-based)│
                                   └──────┬──────┘      └──────────────┘
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │ DECOMMISSION │
                                   │ (Permanent)  │
                                   └─────────────┘
```

### 2.3 Registration Protocol

| Phase                        | Process                                                                                    | Authority         |
| ---------------------------- | ------------------------------------------------------------------------------------------ | ----------------- |
| **1. Application**           | State Revenue Department submits node registration request with hardware audit certificate | Applying State    |
| **2. Identity Verification** | Cross-reference with NIC officer database, verify Aadhaar-linked government identity       | MeitY / NIC       |
| **3. Hardware Audit**        | Verify server meets minimum specs (8 cores, 16GB RAM, 500GB NVMe SSD, 1Gbps dedicated)     | CERT-In           |
| **4. Network Clearance**     | Firewall rules reviewed, dedicated MPLS/VPN circuit provisioned                            | NIC Network Team  |
| **5. Multi-Sig Approval**    | 3-of-5 existing validators must approve (`addValidator()` requires quorum)                 | Validator Council |
| **6. Key Ceremony**          | HSM-generated 256-bit key pair, public key registered on-chain                             | CERT-In + NIC     |
| **7. Genesis Sync**          | New node syncs full chain state from existing peers, catches up to head                    | Automatic         |
| **8. Activation**            | `isActive = true`, node enters round-robin rotation                                        | Automatic         |

**Current Implementation**:

```javascript
addValidator(id, name, role) {
  const node = new ValidatorNode(id, name, role);
  this.validators.set(id, node);
  this.emit('validator:added', { id, name, role });
  return node;
}
```

### 2.4 Epoch-Based Key Rotation

| Parameter           | Value                                               |
| ------------------- | --------------------------------------------------- |
| **Epoch Duration**  | 43,200 blocks (~24 hours at 2s/block)               |
| **Rotation Window** | Last 100 blocks of epoch                            |
| **Key Generation**  | HSM-backed ECDSA-P256 or Ed25519                    |
| **Transition**      | Old key signs handoff message, new key countersigns |
| **Grace Period**    | 50 blocks overlap (both keys valid)                 |

**Rotation Algorithm**:

```
1. At block (epoch_end - 100): HSM generates new keypair
2. Validator signs KEY_ROTATE transaction with old key
3. New public key recorded on-chain
4. For blocks (epoch_end - 50) to epoch_end: both keys accepted
5. At epoch_end + 1: old key invalidated
6. Audit log entry created with rotation timestamp
```

### 2.5 Uptime Tracking

```
Uptime% = (blocks_produced / blocks_expected) × 100

blocks_expected = total_blocks_since_join / total_active_validators

Measurement Window: Rolling 43,200 blocks (1 epoch)
```

**Uptime Tiers**:

| Tier          | Uptime   | Status    | Consequence              |
| ------------- | -------- | --------- | ------------------------ |
| **Platinum**  | ≥ 99.9%  | Optimal   | Priority in round-robin  |
| **Gold**      | 95–99.9% | Nominal   | Standard rotation        |
| **Warning**   | 90–95%   | Degraded  | Automated alert to admin |
| **Critical**  | 80–90%   | At-Risk   | Manual review triggered  |
| **Violation** | < 80%    | Suspended | Automatic suspension     |

### 2.6 Misbehavior Detection & Slashing

**Detectable Offenses**:

| Offense                    | Detection Method                                    | Penalty                |
| -------------------------- | --------------------------------------------------- | ---------------------- |
| **Double Signing**         | Two blocks signed for same height                   | Immediate suspension   |
| **Equivocation**           | Conflicting votes in PBFT round                     | 30-day suspension      |
| **Downtime**               | `uptime < 80%` for 3 consecutive epochs             | Temporary deactivation |
| **Invalid Block**          | `_validateBlock()` returns false for produced block | Warning + audit        |
| **Timestamp Manipulation** | Block timestamp ≤ previous block timestamp          | Block rejected + flag  |
| **TX Censorship**          | Validator consistently excludes specific TX types   | Governance review      |

**Slashing Mathematical Proof**:

For a validator $V_i$ with stake equivalent reputation score $R_i$:

$$S_{penalty} = R_i \times \alpha \times \left(\frac{t_{downtime}}{t_{epoch}}\right)^2$$

Where:

- $S_{penalty}$ = Reputation reduction applied
- $\alpha$ = Severity coefficient (0.1 for downtime, 0.5 for equivocation, 1.0 for double-signing)
- $t_{downtime}$ = Duration of misbehavior (in blocks)
- $t_{epoch}$ = Epoch length (43,200 blocks)

The quadratic exponent ensures small violations incur minimal penalty while sustained misbehavior is penalized exponentially.

### 2.7 Multi-Signature Governance Voting

Critical governance actions require **M-of-N validator approval**:

| Action                    | Threshold | Quorum                     |
| ------------------------- | --------- | -------------------------- |
| Add New Validator         | 3-of-5    | 60%                        |
| Remove Validator          | 4-of-5    | 80%                        |
| Emergency Chain Halt      | 1-of-5    | 20% (any single validator) |
| Chain Resume              | 3-of-5    | 60%                        |
| Protocol Parameter Change | 4-of-5    | 80%                        |
| Key Rotation Override     | 3-of-5    | 60%                        |
| Epoch Duration Change     | 5-of-5    | 100% (unanimous)           |

**Voting Algorithm**:

```
1. PROPOSER submits governance TX with action + parameters
2. Proposal enters 100-block voting window
3. Each validator signs vote (approve/reject) with their key
4. At window close: count approvals
5. If approvals ≥ threshold → execute action
6. If approvals < threshold → proposal rejected, logged to audit trail
7. Proposal + all votes recorded permanently on-chain
```

---

## 3. Government ID Linkage

### 3.1 Sovereign Digital Identity System

Every action on Bharat Land Chain is bound to a **verified government officer identity**. This is not a self-sovereign identity system — it is a **government-sovereign** identity anchored to the existing civil service infrastructure.

```
┌──────────────────────────────────────────────────────────────────┐
│              GOVERNMENT IDENTITY BINDING ARCHITECTURE             │
│                                                                    │
│  ┌────────────────┐                                               │
│  │  OFFICER        │                                               │
│  │  (Human Actor)  │                                               │
│  │                 │                                               │
│  │  • Aadhaar ID   │──┐                                           │
│  │  • Govt ID Card │  │   ┌──────────────────────────────────┐   │
│  │  • Biometric    │  ├──▶│  IDENTITY VERIFICATION ENGINE     │   │
│  │  • OTP (Phone)  │  │   │                                    │   │
│  └────────────────┘  │   │  1. Aadhaar eKYC Verification     │   │
│                       │   │  2. Government DB Cross-Reference │   │
│  ┌────────────────┐  │   │  3. Biometric Match (Fingerprint) │   │
│  │  MFA ENGINE     │──┘   │  4. Role Assignment               │   │
│  │                 │       │  5. BlockchainID Generation       │   │
│  │  Factor 1: PWD  │       └──────────────┬───────────────────┘   │
│  │  Factor 2: OTP  │                      │                        │
│  │  Factor 3: BIO  │                      ▼                        │
│  └────────────────┘       ┌──────────────────────────────────┐   │
│                            │  BLOCKCHAIN IDENTITY RECORD       │   │
│                            │                                    │   │
│                            │  BID-{SHA256(email+govId+ts)[32]} │   │
│                            │  Anchored on-chain as TX type:    │   │
│                            │  IDENTITY_CREATE                  │   │
│                            │                                    │   │
│                            │  QR Code: BID + ChainID + Node    │   │
│                            │  + IssuedAt + TX Hash             │   │
│                            └──────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Blockchain Identity Generation

**Current Implementation** (from `BlockchainService.createBlockchainIdentity()`):

```
Input:  { email, governmentId, name }
Step 1: uniqueSeed = email + governmentId + timestamp
Step 2: identityHash = SHA-256(uniqueSeed)
Step 3: blockchainId = "BID-" + identityHash[0:32].toUpperCase()
Step 4: verificationHash = SHA-256(blockchainId + nodeId + timestamp)
Step 5: Submit IDENTITY_CREATE transaction to chain
Step 6: Generate QR code containing { blockchainId, name, chainId, nodeId, issuedAt, txHash }
Output: { blockchainId, nodeId, verificationHash, qrCode, transactionHash, blockNumber }
```

**Validation**: `BID-` prefix + exactly 32 uppercase hex characters = 36 characters total.

### 3.3 Role-Based Access Control (RBAC)

The RBAC model enforces **principle of least privilege** across every API endpoint and blockchain operation:

| Role                     | Blockchain Permissions                           | Dashboard Access     | API Scope            |
| ------------------------ | ------------------------------------------------ | -------------------- | -------------------- |
| **`property_owner`**     | Submit PROPERTY_REGISTER, view own TX history    | Property status only | Read own properties  |
| **`buyer` / `seller`**   | Initiate OWNERSHIP_TRANSFER                      | Transfer tracking    | Read/write transfers |
| **`inspector`**          | Submit PROPERTY_VERIFY, view chain integrity     | Integrity reports    | Read chain + verify  |
| **`government_officer`** | **ALL** — validator management, chain ops, audit | **FULL DASHBOARD**   | Full API access      |

**Enforcement Points**:

1. **JWT Token** (from `middleware/auth.js`): Every request requires `Bearer` token, decoded to `req.user`
2. **Role Check** (from `authorize(...roles)`): Middleware rejects unauthorized roles with HTTP 403
3. **Route-Level**: Blockchain routes split into public (authenticated) vs officer-only sections
4. **On-Chain**: Transaction `signer` field permanently records who initiated each action

### 3.4 Multi-Factor Authentication

| Factor         | Implementation                                             | When Required          |
| -------------- | ---------------------------------------------------------- | ---------------------- |
| **Knowledge**  | Password (bcrypt, 10 salt rounds, min 8 chars)             | Every login            |
| **Possession** | OTP via SMS/Email (`twoFactorEnabled`, TOTP secret stored) | Chain operations       |
| **Biometric**  | Aadhaar-linked fingerprint (UIDAI API integration)         | Validator key ceremony |

### 3.5 Cryptographic Audit Trail

Every governance action produces an **immutable chain record**:

```
AUDIT_RECORD = {
  actor:      req.user.blockchainId,     // WHO performed the action
  action:     tx.type,                   // WHAT was done
  target:     tx.data.propertyId,        // ON WHAT entity
  timestamp:  tx.timestamp,              // WHEN (millisecond precision)
  blockHash:  tx.blockHash,              // IN WHICH block (immutable proof)
  txHash:     tx.hash,                   // UNIQUE transaction fingerprint
  ipAddress:  req.ip,                    // FROM WHERE (logged in middleware)
  signature:  validator.sign(tx.hash)    // SIGNED BY which validator
}
```

**Audit Guarantee**: Because these records are embedded in blockchain transactions, they cannot be deleted, modified, or backdated. The chain integrity check (`verifyChainIntegrity()`) will detect any tampering.

---

## 4. Blockchain Management Dashboard

### 4.1 Architecture Overview

The Management Dashboard is a **government-officer-only secure control plane** built with React.js, rendering real-time blockchain telemetry via WebSocket and REST API.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   BLOCKCHAIN MANAGEMENT DASHBOARD                        │
│                   (Government Officer Access Only)                       │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  HEADER BAR — System Metrics (Real-Time from networkStatus)       │ │
│  │  ┌──────────┐ ┌──────────────┐ ┌────────────┐ ┌───────────────┐ │ │
│  │  │ TOTAL    │ │ TOTAL        │ │ ACTIVE     │ │ NETWORK       │ │ │
│  │  │ BLOCKS   │ │ TRANSACTIONS │ │ VALIDATORS │ │ HEALTH        │ │ │
│  │  │ (live)   │ │ (cumulative) │ │ (real-time)│ │ (healthy/down)│ │ │
│  │  └──────────┘ └──────────────┘ └────────────┘ └───────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────┐ ┌──────────────┐ ┌───────────┐ ┌────────────┐ ┌─────────┐ │
│  │NETWORK │ │BLOCK         │ │VALIDATOR  │ │CONSENSUS   │ │SECURITY │ │
│  │OVERVIEW│ │EXPLORER      │ │CONTROL    │ │MONITOR     │ │CENTER   │ │
│  └────┬───┘ └──────┬───────┘ └─────┬─────┘ └──────┬─────┘ └────┬────┘ │
│       │             │               │              │             │      │
│       ▼             ▼               ▼              ▼             ▼      │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                        CONTENT PANEL                                ││
│  │  (Detailed view for selected tab — see sections below)             ││
│  └─────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Module: Network Overview

**Purpose**: Single-glance operational picture of the entire blockchain network.

| Data Point          | Source                              | Update Frequency      |
| ------------------- | ----------------------------------- | --------------------- |
| Chain ID            | `networkStatus.chainId`             | Static                |
| Network Name        | `networkStatus.networkName`         | Static                |
| Consensus Algorithm | `networkStatus.consensus`           | Static                |
| Running Status      | `networkStatus.isRunning`           | Real-time (WebSocket) |
| Block Height        | `networkStatus.currentBlockHeight`  | Every new block (~2s) |
| Pending TX Count    | `networkStatus.pendingTransactions` | Real-time             |
| Average Block Time  | `networkStatus.avgBlockTime`        | Calculated per block  |
| Peak TPS            | `networkStatus.peakTps`             | Updated on new peak   |
| Network Uptime      | `networkStatus.uptime.formatted`    | Every heartbeat (10s) |
| Genesis Block Hash  | `networkStatus.genesisBlock`        | Static                |
| Active Validators   | `networkStatus.validators.active`   | On validator change   |

**Features**:

- **Live Block Feed**: Scrolling list of latest blocks with hash, validator, TX count, timestamp
- **Network Topology Map**: Visual representation of connected validator nodes across India
- **Throughput Graph**: Rolling 5-minute window of blocks/second and TX/second
- **Alert Banner**: Immediate notification if `isRunning === false` or integrity check fails

### 4.3 Module: Internal Block Explorer

**Purpose**: Deep inspection of any block or transaction on the chain.

**Block View**:
| Field | Display | Interaction |
|---|---|---|
| Block Number | `block.index` | Click to inspect |
| Block Hash | `block.hash` (truncated, copy-to-clipboard) | Full hash on hover |
| Previous Hash | `block.previousHash` | Click to navigate to parent |
| Timestamp | Formatted IST datetime | — |
| Validator | Validator name + role badge | Click to see validator profile |
| TX Count | `block.transactionCount` | Click to expand TX list |
| Merkle Root | `block.merkleRoot` (truncated) | Full hash on hover |
| Block Size | `block.size` bytes | — |
| Confirmations | `block.confirmations` | Auto-increments |
| Status | Confirmed (always, due to PBFT finality) | Green badge |

**Transaction View**:
| Field | Display |
|---|---|
| TX ID | `TX-{timestamp}-{hex}` |
| Type | Color-coded badge (REGISTER=blue, VERIFY=green, TRANSFER=orange) |
| Signer | Blockchain ID of officer |
| Hash | SHA-256 (copy-to-clipboard) |
| Block Number | Link to parent block |
| Block Hash | Link to parent block |
| Gas Used | Computational weight units |
| Status | pending / confirmed / failed |
| Timestamp | IST datetime |

**Search**: By block number, block hash, TX hash, TX ID, or property ID.

**Pagination**: Server-side via `getExplorerData(page, limit)` — returns `{ blocks, totalBlocks, totalTransactions, currentPage, totalPages }`.

### 4.4 Module: Validator Control Panel

**Purpose**: Manage validator lifecycle and monitor individual node health.

**Validator List Table**:

| Column          | Source                                                  |
| --------------- | ------------------------------------------------------- |
| Name            | `validator.name`                                        |
| ID              | `validator.id`                                          |
| Role            | `validator.role` (government / registry_office / audit) |
| Status          | `validator.isActive` → Active (green) / Inactive (red)  |
| Blocks Produced | `validator.blocksProduced`                              |
| Uptime          | `validator.uptime` %                                    |
| Last Block      | `validator.lastBlockTimestamp` (formatted)              |
| Joined          | `validator.joinedAt` (formatted)                        |

**Actions** (Officer-Only):

- **Add Validator**: Form → triggers `chain.addValidator(id, name, role)` → WebSocket broadcasts `validator:added`
- **Suspend Validator**: Sets `isActive = false` → WebSocket broadcasts `validator:removed`
- **View Details**: Expanded panel with block production history, uptime graph, key rotation schedule

### 4.5 Module: Consensus Monitoring (PBFT Stages)

**Purpose**: Real-time visualization of the PBFT consensus process.

```
┌───────────────────────────────────────────────────────────────┐
│                    PBFT CONSENSUS FLOW                        │
│                                                               │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│  │ REQUEST  │──▶│ PRE-     │──▶│ PREPARE  │──▶│ COMMIT   │ │
│  │          │   │ PREPARE  │   │          │   │          │ │
│  │ TX in    │   │ Leader   │   │ 2/3 vote │   │ 2/3 vote │ │
│  │ mempool  │   │ proposes │   │ received │   │ received │ │
│  └──────────┘   └──────────┘   └──────────┘   └────┬─────┘ │
│                                                      │       │
│                                                      ▼       │
│                                               ┌──────────┐  │
│                                               │ FINALIZE │  │
│                                               │          │  │
│                                               │ Block    │  │
│                                               │ committed│  │
│                                               │ to chain │  │
│                                               └──────────┘  │
└───────────────────────────────────────────────────────────────┘
```

**Monitored Metrics**:
| Metric | Description |
|---|---|
| **Current Leader** | Which validator is proposing the current block (round-robin) |
| **Consensus Round** | Which PBFT phase is currently active |
| **Prepare Votes** | How many validators sent PREPARE messages |
| **Commit Votes** | How many validators sent COMMIT messages |
| **Finality Time** | Time from TX submission to block commit (target: < 2s) |
| **Consensus Failures** | Count of rounds that failed to reach 2/3 quorum |
| **View Changes** | Count of leader replacements due to timeout |

### 4.6 Module: Security Center

**Purpose**: Threat detection, integrity monitoring, and forensic audit access.

**Panels**:

| Panel                   | Data                                                  | Alert Condition             |
| ----------------------- | ----------------------------------------------------- | --------------------------- |
| **Chain Integrity**     | `verifyChainIntegrity()` result                       | Any `issues[]` entry        |
| **Tamper Alerts**       | Real-time detection of hash mismatches                | Immediate red alert         |
| **Failed Validations**  | Blocks that failed `_validateBlock()`                 | Count > 0 in last hour      |
| **Access Logs**         | All API requests with officer identity                | Unauthorized access attempt |
| **Rate Limit Status**   | Current request counts per IP                         | Approaching threshold       |
| **Certificate Status**  | TLS cert expiration, HSM key status                   | < 30 days to expiry         |
| **Suspicious Activity** | Pattern analysis: unusual TX volume, off-hours access | ML-based anomaly detection  |

**Integrity Score Calculation**:

$$I_{score} = \left(1 - \frac{n_{issues}}{n_{blocks}}\right) \times 100$$

Where $n_{issues}$ = number of integrity violations detected, $n_{blocks}$ = total blocks verified. A perfect chain yields $I_{score} = 100.0$.

---

## 5. Property Registry Integration Layer

### 5.1 Separation of Concerns

```
┌──────────────────────────────────────────────────────────────────────┐
│                        PUBLIC-FACING LAYER                           │
│                     (Citizens / Property Owners)                     │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Smart Bhoomi Web Application (React.js)                          │ │
│  │                                                                │ │
│  │  • Register Property    • View My Properties                  │ │
│  │  • Request Transfer     • Track Verification                  │ │
│  │  • Upload Documents     • Download QR Certificate             │ │
│  │                                                                │ │
│  │  ⚠️  ZERO BLOCKCHAIN AWARENESS — users see "Verified" status  │ │
│  │     They NEVER interact with the chain directly                │ │
│  └────────────────────────────┬───────────────────────────────────┘ │
└───────────────────────────────┼──────────────────────────────────────┘
                                │ REST API (HTTPS)
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        SERVICE LAYER                                 │
│                  (Property Registry Application)                     │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Express.js API Server (server.js, port 5001)               │   │
│  │                                                              │   │
│  │  Routes:                                                     │   │
│  │    /api/auth/*          → User management + JWT             │   │
│  │    /api/properties/*    → CRUD + verification workflow      │   │
│  │    /api/transfers/*     → Ownership transfer lifecycle      │   │
│  │    /api/notifications/* → Alert system                      │   │
│  │    /api/blockchain/*    → Chain data (officer-only)         │   │
│  │                                                              │   │
│  │  Middleware:                                                 │   │
│  │    auth.js       → JWT verify + RBAC                        │   │
│  │    security.js   → Rate limiting + validation               │   │
│  │                                                              │   │
│  │  Models (MongoDB):                                           │   │
│  │    User.js       → Officers + citizens                      │   │
│  │    Property.js   → Registry records (with blockchainHash)   │   │
│  │    Transfer.js   → Ownership change requests                │   │
│  │    Notification  → Alert records                            │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
└─────────────────────────────┼──────────────────────────────────────┘
                              │ Internal API (in-process)
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                               │
│                (Bharat Land Chain — Sovereign Blockchain)             │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  BlockchainService.js (Application Wrapper)                 │   │
│  │    • registerProperty()    → Submit PROPERTY_REGISTER TX    │   │
│  │    • verifyProperty()      → Submit PROPERTY_VERIFY TX      │   │
│  │    • transferOwnership()   → Submit OWNERSHIP_TRANSFER TX   │   │
│  │    • createBlockchainIdentity() → Submit IDENTITY_CREATE TX │   │
│  │    • generatePropertyHash()     → SHA-256 of property data  │   │
│  │    • getNetworkStatus()         → Chain telemetry           │   │
│  │    • verifyChainIntegrity()     → Full chain audit          │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                              │                                       │
│  ┌──────────────────────────▼──────────────────────────────────┐   │
│  │  SovereignChain.js (Blockchain Core)                        │   │
│  │    • Block production (2s intervals)                        │   │
│  │    • Merkle tree computation                                │   │
│  │    • Chain integrity verification                           │   │
│  │    • Validator management                                   │   │
│  │    • Transaction indexing                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.2 Secure API Flow: Property Registration

**Sequence — from citizen form submission to blockchain finality**:

```
Step 1: SUBMISSION
  ├── Citizen fills property form in React UI
  ├── Documents uploaded to /uploads/ directory
  ├── POST /api/properties with JWT token
  └── propertyController receives request

Step 2: HASHING
  ├── BlockchainService.generatePropertyHash(propertyData)
  ├── Hash = SHA-256(JSON.stringify(propertyData))
  ├── Document hashes computed individually
  └── Property saved to MongoDB with hash

Step 3: CHAIN SUBMISSION
  ├── BlockchainService.registerProperty(propertyData)
  ├── chain.submitTransaction('PROPERTY_REGISTER', {
  │     propertyId, propertyHash, ownerBlockchainId,
  │     title, type, timestamp
  │   }, signer)
  └── Transaction enters mempool

Step 4: BLOCK PRODUCTION
  ├── Next 2-second interval triggers _produceBlock()
  ├── TX included in block, Merkle root computed
  ├── Block validated, committed to chain[]
  ├── TX status → 'confirmed'
  └── TX.blockNumber and TX.blockHash assigned

Step 5: CALLBACK CONFIRMATION
  ├── EventEmitter fires 'block:committed'
  ├── WebSocket broadcasts to all connected clients
  ├── MongoDB property record updated with:
  │     blockchainHash, blockchainTransactionId
  └── Notification sent to citizen: "Property Registered"

Step 6: MERKLE PROOF GENERATION
  ├── For any future verification request:
  ├── Extract TX hash from block
  ├── Reconstruct Merkle path from TX position to root
  ├── Proof = [ sibling_hash_1, sibling_hash_2, ... , root ]
  └── Verifier can confirm TX inclusion in O(log n) time
```

### 5.3 Merkle Proof Verification

A Merkle proof allows any party to verify that a specific transaction is included in a block **without downloading the entire block**:

```
Given: tx_hash, merkle_proof[], merkle_root

Verification:
  current = tx_hash
  for each sibling in merkle_proof:
    if position == 'left':
      current = SHA-256(sibling + current)
    else:
      current = SHA-256(current + sibling)

  VERIFIED = (current === merkle_root)
```

### 5.4 Property-Specific Chain Verification

**Current Implementation** (`verifyPropertyOnChain(propertyId, expectedHash)`):

```
1. Retrieve all TXs for propertyId from propertyIndex
2. Find TX with type === 'PROPERTY_REGISTER'
3. Compare registrationTx.data.propertyHash === expectedHash
4. Return:
   - verified: boolean
   - registrationTx: full TX record
   - totalTransactions: count of all TXs for this property
   - transactionHistory: complete TX timeline
   - blockConfirmations: chain.length - tx.blockNumber
```

This provides a **complete provenance chain** — every action ever performed on a property, who did it, when, and in which block.

---

## 6. High Availability & Disaster Recovery

### 6.1 Network Topology

```
┌──────────────────────────────────────────────────────────────────────┐
│                    NATIONAL VALIDATOR NETWORK                        │
│                                                                      │
│  ZONE NORTH                    ZONE SOUTH                            │
│  ┌───────────────┐            ┌───────────────┐                     │
│  │ NIC Delhi     │◄──────────▶│ NIC Hyderabad │                     │
│  │ (Primary)     │            │ (Primary)     │                     │
│  │               │            │               │                     │
│  │ GOV-NODE-DEL  │            │ GOV-NODE-HYD  │                     │
│  │ validator:gov │            │ validator:gov │                     │
│  └───────┬───────┘            └───────┬───────┘                     │
│          │                            │                              │
│          │     ┌───────────────┐      │                              │
│          │     │ NIC Pune      │      │                              │
│          ├────▶│ (Audit)       │◄─────┤                              │
│          │     │               │      │                              │
│          │     │ GOV-NODE-PUN  │      │                              │
│          │     │ validator:aud │      │                              │
│          │     └───────────────┘      │                              │
│          │                            │                              │
│  ZONE EAST                     ZONE WEST                             │
│  ┌───────────────┐            ┌───────────────┐                     │
│  │ NIC Kolkata   │◄──────────▶│ NIC Mumbai    │                     │
│  │ (Registry)    │            │ (Registry)    │                     │
│  │               │            │               │                     │
│  │ GOV-NODE-KOL  │            │ GOV-NODE-MUM  │                     │
│  │ validator:reg │            │ validator:reg │                     │
│  └───────────────┘            └───────────────┘                     │
│                                                                      │
│  ─────── Full mesh peer connectivity (mTLS over MPLS)               │
│  ─────── All nodes maintain full chain replica                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.2 Multi-Region Deployment

| Region      | Datacenter    | Node ID      | Role       | Function                  |
| ----------- | ------------- | ------------ | ---------- | ------------------------- |
| **North**   | NIC Delhi     | GOV-NODE-DEL | Government | Primary consensus leader  |
| **South**   | NIC Hyderabad | GOV-NODE-HYD | Government | Secondary leader          |
| **West**    | NIC Mumbai    | GOV-NODE-MUM | Registry   | State registry operations |
| **East**    | NIC Kolkata   | GOV-NODE-KOL | Registry   | State registry operations |
| **Central** | NIC Pune      | GOV-NODE-PUN | Audit      | Chain integrity auditor   |

### 6.3 BFT Threshold Analysis

For PBFT with $n$ total validators and $f$ maximum faulty nodes:

$$n \geq 3f + 1$$

| Validators ($n$) | Max Faulty ($f$) | Quorum Required | Fault Tolerance |
| ---------------- | ---------------- | --------------- | --------------- |
| 4                | 1                | 3               | 25%             |
| 5                | 1                | 4               | 20%             |
| 7                | 2                | 5               | 28.6%           |
| 10               | 3                | 7               | 30%             |
| 13               | 4                | 9               | 30.8%           |

**Current Configuration**: `requiredValidators: 1` (single-node mode for development).  
**Production Target**: $n = 5, f = 1$ → requires 4-of-5 agreement for finality.

### 6.4 Automatic Failover

| Scenario                | Detection                     | Response                                               | Recovery Time       |
| ----------------------- | ----------------------------- | ------------------------------------------------------ | ------------------- |
| **Single Node Down**    | Heartbeat timeout (30s)       | Round-robin skips node, consensus continues with $n-1$ | 0s (next block)     |
| **Network Partition**   | Quorum check fails            | Larger partition continues; smaller halts              | Partition heal time |
| **Leader Failure**      | 3× missed block slots         | PBFT View Change: next validator becomes leader        | ~6 seconds          |
| **Database Corruption** | Chain integrity check         | Node enters sync mode, downloads chain from peers      | Minutes             |
| **Full Zone Outage**    | All nodes in zone unreachable | Remaining zones maintain consensus (if quorum exists)  | 0s if quorum met    |

### 6.5 Black-Start Disaster Recovery

A **black-start** is the process of bringing the entire network back from a complete shutdown.

**State Snapshot Strategy**:

```
SNAPSHOT SCHEDULE:
  • Automatic: Every 21,600 blocks (~12 hours)
  • Content: Full chain state + transaction index + property index + validator registry
  • Format: mongodump + chain JSON serialization
  • Storage:
    - Primary: Local encrypted volume
    - Secondary: Government cloud cold storage (MeitY S3-compatible)
    - Tertiary: Air-gapped tape archive (quarterly)

BLACK-START PROCEDURE:
  1. RESTORE latest verified snapshot to all validator nodes
  2. VERIFY chain integrity on restored state
  3. REGENERATE transaction and property indexes from chain data
  4. BOOTSTRAP validators with last-known good keys
  5. ELECT genesis leader (highest-uptime node)
  6. RESUME block production from snapshot height + 1
  7. RECONCILE any pending transactions from application layer
  8. EMIT 'network:started' event → Dashboard reconnects
```

**Recovery Time Objective (RTO)**: < 30 minutes  
**Recovery Point Objective (RPO)**: < 12 hours (snapshot interval)

### 6.6 Data Persistence Strategy

| Layer                  | Storage                | Persistence                | Backup             |
| ---------------------- | ---------------------- | -------------------------- | ------------------ |
| **Chain State**        | In-memory `chain[]`    | Volatile (lost on restart) | Snapshot to disk   |
| **Transaction Index**  | In-memory `Map`        | Volatile                   | Rebuilt from chain |
| **Property Index**     | In-memory `Map`        | Volatile                   | Rebuilt from chain |
| **Application Data**   | MongoDB                | Durable (disk)             | Daily mongodump    |
| **User Records**       | MongoDB                | Durable (disk)             | Daily mongodump    |
| **Uploaded Documents** | Filesystem `/uploads/` | Durable (disk)             | Rsync to backup    |

**Production Enhancement Required**: Chain state must be persisted to MongoDB or LevelDB to survive process restarts without relying on snapshots.

---

## 7. Security Architecture

### 7.1 Defense-in-Depth Model

```
┌────────────────────────────────────────────────────────────────────┐
│  LAYER 7: APPLICATION SECURITY                                     │
│  • JWT authentication (24h expiry)                                │
│  • RBAC authorization (5 roles)                                   │
│  • Input validation (express-validator)                           │
│  • CORS policy (whitelist origin)                                 │
│  • Helmet.js security headers                                    │
├────────────────────────────────────────────────────────────────────┤
│  LAYER 6: API GATEWAY                                              │
│  • Rate limiting: 1000 req/15min (general), 100/15min (auth)     │
│  • Request logging with timestamp + IP                            │
│  • Payload size limits (express.json())                           │
│  • HTTPS enforcement (TLS 1.3)                                   │
├────────────────────────────────────────────────────────────────────┤
│  LAYER 5: BLOCKCHAIN INTEGRITY                                     │
│  • SHA-256 hash chaining (tamper detection)                       │
│  • Merkle tree proofs (inclusion verification)                    │
│  • Block validation (index, hash, timestamp checks)              │
│  • Transaction deduplication (hash-based)                        │
├────────────────────────────────────────────────────────────────────┤
│  LAYER 4: NETWORK SECURITY                                         │
│  • WebSocket authentication (connection-level)                    │
│  • Mutual TLS between validator nodes                             │
│  • Government MPLS/VPN backbone                                   │
│  • DDoS mitigation (CERT-In infrastructure)                      │
├────────────────────────────────────────────────────────────────────┤
│  LAYER 3: DATA SECURITY                                            │
│  • MongoDB authentication + TLS                                   │
│  • Document hashes (CryptoJS.SHA256)                              │
│  • Encrypted backups (AES-256-GCM)                                │
│  • Key material in HSM (never in plaintext)                       │
├────────────────────────────────────────────────────────────────────┤
│  LAYER 2: INFRASTRUCTURE SECURITY                                  │
│  • Government datacenter physical security                        │
│  • Access-controlled server rooms                                 │
│  • Hardware security modules (Thales Luna / AWS CloudHSM)        │
│  • Biometric access to server racks                               │
├────────────────────────────────────────────────────────────────────┤
│  LAYER 1: OPERATIONAL SECURITY                                     │
│  • CERT-In compliance                                             │
│  • IT Act 2000 adherence                                          │
│  • Background-checked operators                                   │
│  • Principle of least privilege                                   │
│  • Quarterly security audits                                      │
└────────────────────────────────────────────────────────────────────┘
```

### 7.2 HSM Integration for Key Management

| Component             | HSM Function                                 | Implementation                       |
| --------------------- | -------------------------------------------- | ------------------------------------ |
| **Validator Keys**    | Generation + storage of 256-bit signing keys | PKCS#11 interface to Thales Luna HSM |
| **JWT Secret**        | Signing key for authentication tokens        | HSM-stored, never exported           |
| **TLS Certificates**  | Private key generation for mTLS              | HSM-backed CA                        |
| **Backup Encryption** | AES-256-GCM key for snapshot encryption      | HSM key wrapping                     |

**Key Hierarchy**:

```
HSM Master Key (never leaves hardware)
  └── Key Encryption Key (KEK)
        ├── Validator Signing Key (per node)
        ├── JWT Signing Key (per environment)
        ├── TLS Private Key (per service)
        └── Backup Encryption Key (per schedule)
```

### 7.3 Mutual TLS (mTLS) for Node Communication

```
┌────────────┐    mTLS (TLS 1.3)    ┌────────────┐
│ Validator A │◄════════════════════▶│ Validator B │
│             │                      │             │
│ Client Cert │                      │ Client Cert │
│ Server Cert │                      │ Server Cert │
│ CA Root     │                      │ CA Root     │
└────────────┘                       └────────────┘

Certificate Chain:
  Government Root CA (NIC)
    └── Intermediate CA (Bharat Land Chain)
          ├── Validator A Certificate
          ├── Validator B Certificate
          └── Validator C Certificate

Requirements:
  • Certificate pinning (reject unknown CAs)
  • OCSP stapling for revocation checks
  • Cipher: TLS_AES_256_GCM_SHA384
  • Key exchange: X25519
  • Certificate lifetime: 90 days (auto-rotate via ACME)
```

### 7.4 API Gateway Rate Limiting

**Current Implementation** (from `middleware/security.js`):

| Endpoint Category      | Window           | Max Requests     | Response on Exceed         |
| ---------------------- | ---------------- | ---------------- | -------------------------- |
| **General API**        | 15 minutes       | 1,000 per IP     | HTTP 429 + retry-after     |
| **Authentication**     | 15 minutes       | 100 per IP       | HTTP 429 + lockout warning |
| **Blockchain Queries** | 1 minute         | 60 per IP        | HTTP 429                   |
| **WebSocket**          | Connection-level | 10 events/second | Throttle + disconnect      |

**Production Enhancement**:

```
Adaptive Rate Limiting:
  Normal:   1000 req/15min
  Elevated: 500 req/15min   (triggered by anomaly detection)
  Lockdown: 100 req/15min   (triggered by active attack)
  Block:    0 req            (IP blacklisted by CERT-In)
```

### 7.5 Immutable Audit Logging

Every critical system event is logged with **non-repudiable provenance**:

```
AUDIT_LOG_ENTRY = {
  timestamp:    ISO 8601 (millisecond precision)
  eventType:    AUTH_LOGIN | AUTH_FAIL | PROPERTY_REGISTER | CHAIN_QUERY | ...
  actor:        { userId, blockchainId, role, ip }
  action:       { method, path, statusCode }
  target:       { entityType, entityId }
  result:       { success, error_code }
  txHash:       (if blockchain operation) SHA-256 hash
  checksum:     HMAC-SHA256(entry, audit_key) — prevents log tampering
}

Storage:
  • Primary: MongoDB audit collection (indexed by timestamp + actor)
  • Secondary: Syslog forwarding to centralized SIEM
  • Tertiary: Daily export to WORM (Write Once Read Many) storage
```

### 7.6 DDoS Mitigation

| Layer           | Mitigation                              | Provider                     |
| --------------- | --------------------------------------- | ---------------------------- |
| **L3/L4**       | Traffic scrubbing, SYN flood protection | CERT-In / NIC infrastructure |
| **L7**          | WAF rules, bot detection, CAPTCHA       | NGINX + ModSecurity          |
| **Application** | Rate limiting, circuit breaker pattern  | Express middleware           |
| **WebSocket**   | Connection limits, message size caps    | Socket.IO configuration      |

---

## 8. Deployment Architecture

### 8.1 Container Orchestration

```
┌──────────────────────────────────────────────────────────────────────┐
│                    KUBERNETES CLUSTER (per region)                    │
│                    Government Hybrid Cloud (MeitY)                   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  NAMESPACE: bharat-land-chain                                  │ │
│  │                                                                │ │
│  │  ┌──────────────────┐   ┌──────────────────┐                 │ │
│  │  │ POD: validator    │   │ POD: api-server   │                 │ │
│  │  │                  │   │                  │                 │ │
│  │  │ Container:       │   │ Container:       │                 │ │
│  │  │  sovereign-chain │   │  express-api     │                 │ │
│  │  │                  │   │                  │                 │ │
│  │  │ Ports: 5001      │   │ Ports: 5001      │                 │ │
│  │  │ CPU: 4 cores     │   │ CPU: 2 cores     │                 │ │
│  │  │ RAM: 8GB         │   │ RAM: 4GB         │                 │ │
│  │  │ Storage: 500GB   │   │ Storage: 50GB    │                 │ │
│  │  │ (NVMe PV)        │   │ (SSD PV)         │                 │ │
│  │  └──────────────────┘   └──────────────────┘                 │ │
│  │                                                                │ │
│  │  ┌──────────────────┐   ┌──────────────────┐                 │ │
│  │  │ POD: mongodb      │   │ POD: websocket    │                 │ │
│  │  │                  │   │                  │                 │ │
│  │  │ Container:       │   │ Container:       │                 │ │
│  │  │  mongo:6.0       │   │  realtime-svc    │                 │ │
│  │  │                  │   │                  │                 │ │
│  │  │ ReplicaSet: 3    │   │ Ports: 5001 (WS) │                 │ │
│  │  │ Storage: 1TB PV  │   │ CPU: 1 core      │                 │ │
│  │  └──────────────────┘   └──────────────────┘                 │ │
│  │                                                                │ │
│  │  ┌──────────────────┐   ┌──────────────────┐                 │ │
│  │  │ POD: prometheus   │   │ POD: grafana      │                 │ │
│  │  │                  │   │                  │                 │ │
│  │  │ Metrics scraping │   │ Dashboard viz    │                 │ │
│  │  │ 15s interval     │   │ Port: 3000       │                 │ │
│  │  └──────────────────┘   └──────────────────┘                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  SERVICES                                                      │ │
│  │  • LoadBalancer: NGINX Ingress (TLS termination)              │ │
│  │  • ClusterIP: MongoDB, Prometheus, Grafana                    │ │
│  │  • NodePort: API Server (5001), WebSocket (5001)              │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  PERSISTENT VOLUMES                                            │ │
│  │  • validator-data: 500GB NVMe (chain state + snapshots)       │ │
│  │  • mongodb-data: 1TB SSD (application database)               │ │
│  │  • uploads: 200GB SSD (property documents)                    │ │
│  │  • logs: 100GB HDD (forensic logs + audit trail)             │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### 8.2 DevOps Pipeline

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  CODE    │──▶│  BUILD   │──▶│  TEST    │──▶│  STAGE   │──▶│  PROD    │
│          │   │          │   │          │   │          │   │          │
│ Git Push │   │ Docker   │   │ Unit     │   │ Gov      │   │ Rolling  │
│ (GitLab) │   │ Build    │   │ Integr.  │   │ Staging  │   │ Update   │
│          │   │ SBOM Gen │   │ Security │   │ Cluster  │   │ Canary   │
│          │   │ Vuln Scan│   │ Chain    │   │ UAT      │   │ Deploy   │
└──────────┘   └──────────┘   │ Integ.   │   └──────────┘   └──────────┘
                               └──────────┘
```

| Stage     | Tools                                                                        | Gate Criteria               |
| --------- | ---------------------------------------------------------------------------- | --------------------------- |
| **Code**  | GitLab (self-hosted NIC), branch protection, signed commits                  | MR approval by 2+ reviewers |
| **Build** | Docker multi-stage build, SBOM generation (Syft), vulnerability scan (Trivy) | Zero critical CVEs          |
| **Test**  | Jest (unit), Supertest (API integration), chain integrity test suite         | 100% pass, 80%+ coverage    |
| **Stage** | Government staging K8s cluster, automated UAT                                | All smoke tests pass        |
| **Prod**  | Rolling update with canary (10% → 50% → 100%), automatic rollback on failure | Health checks pass          |

### 8.3 Telemetry: Prometheus + Grafana

**Prometheus Metrics Exported**:

| Metric                            | Type      | Label                      |
| --------------------------------- | --------- | -------------------------- |
| `blc_block_height`                | Gauge     | `chain_id`                 |
| `blc_total_transactions`          | Counter   | `chain_id`, `tx_type`      |
| `blc_pending_transactions`        | Gauge     | `chain_id`                 |
| `blc_block_production_time_ms`    | Histogram | `validator_id`             |
| `blc_consensus_round_duration_ms` | Histogram | `round_type`               |
| `blc_validator_uptime_pct`        | Gauge     | `validator_id`             |
| `blc_api_request_duration_ms`     | Histogram | `method`, `path`, `status` |
| `blc_websocket_connections`       | Gauge     | —                          |
| `blc_chain_integrity_score`       | Gauge     | `chain_id`                 |
| `blc_mempool_size`                | Gauge     | `chain_id`                 |

**Grafana Dashboards**:

1. **Network Health**: Block height, production rate, consensus success rate
2. **Validator Performance**: Per-node uptime, blocks produced, latency
3. **API Performance**: Request latency (p50/p95/p99), error rate, throughput
4. **Security**: Failed auth attempts, rate limit hits, integrity violations
5. **Infrastructure**: CPU, memory, disk I/O, network bandwidth per pod

### 8.4 Centralized Forensic Log Aggregation

```
┌────────────┐     ┌──────────────┐     ┌─────────────────────┐
│ Validator  │────▶│ Fluentd      │────▶│ Elasticsearch       │
│ Logs       │     │ (Sidecar)    │     │ (NIC Managed)       │
├────────────┤     │              │     │                     │
│ API Logs   │────▶│ Structured   │────▶│ Index: blc-{date}   │
├────────────┤     │ JSON format  │     │ Retention: 7 years  │
│ Audit Logs │────▶│              │────▶│ (IT Act compliance) │
├────────────┤     │ HMAC signed  │     │                     │
│ System Logs│────▶│              │────▶│ WORM tier after 30d │
└────────────┘     └──────────────┘     └──────────┬──────────┘
                                                     │
                                                     ▼
                                              ┌─────────────┐
                                              │ Kibana       │
                                              │ Forensic UI  │
                                              └─────────────┘
```

**Log Retention Policy**:

| Log Type              | Hot (SSD) | Warm (HDD) | Cold (Archive)        |
| --------------------- | --------- | ---------- | --------------------- |
| **Blockchain Events** | 30 days   | 1 year     | 7 years (IT Act 2000) |
| **API Access Logs**   | 7 days    | 90 days    | 3 years               |
| **Audit Trail**       | 90 days   | 3 years    | **Permanent** (WORM)  |
| **System Metrics**    | 7 days    | 30 days    | 1 year                |

---

## 9. 5-Year Scalability Roadmap

### Phase Overview

```
═══════════════════════════════════════════════════════════════════════
  2026          2027          2028          2029          2030
  YEAR 1        YEAR 2        YEAR 3        YEAR 4        YEAR 5
═══════════════════════════════════════════════════════════════════════

  GENESIS &     NATIONAL      FEDERATION    CROSS-CHAIN   AUTONOMOUS
  STABILIZE     SCALE         & PRUNING     INTEROP       GOVERNANCE
═══════════════════════════════════════════════════════════════════════
```

---

### Year 1 (2026): Genesis & Stabilization

**Objective**: Establish the sovereign chain, onboard pilot states, harden security.

| Milestone                    | Target                                             | Metric                        |
| ---------------------------- | -------------------------------------------------- | ----------------------------- |
| **Q1: Genesis Launch**       | Chain operational in NIC Delhi datacenter          | Block production stable at 2s |
| **Q1: Pilot States**         | 3 states onboarded (Delhi, Maharashtra, Karnataka) | 3 validator nodes active      |
| **Q2: Security Audit**       | CERT-In + third-party security audit               | Zero critical findings        |
| **Q2: HSM Integration**      | Validator keys migrated to HSM                     | Keys never in plaintext       |
| **Q3: MongoDB Persistence**  | Chain state persisted to disk (survive restarts)   | RPO < 0 (zero data loss)      |
| **Q3: Dashboard V1**         | Government officer dashboard operational           | Real-time metrics live        |
| **Q4: Performance Baseline** | Load testing with 1000 concurrent users            | TPS ≥ 50, latency < 200ms     |

**Technical Deliverables**:

- Chain persistence layer (MongoDB or LevelDB backend for `chain[]`)
- Automated backup with 12-hour snapshot intervals
- Production Docker images with Trivy scan
- RBAC enforcement across all API endpoints
- WebSocket authentication with JWT

---

### Year 2 (2027): National Scale

**Objective**: Expand to all 28 states + 8 UTs, increase validator count, optimize throughput.

| Milestone           | Target                                            | Metric                 |
| ------------------- | ------------------------------------------------- | ---------------------- |
| **Q1: 10 States**   | 10 state revenue departments onboarded            | 10 validator nodes     |
| **Q2: 20 States**   | 20 states with dedicated validator infrastructure | 20 validators, $f$ = 6 |
| **Q3: All States**  | 36 validators (28 states + 8 UTs)                 | Full national coverage |
| **Q4: Performance** | Sustained 500 TPS under national load             | P99 latency < 500ms    |

**Technical Deliverables**:

- **Sharded Mempool**: Regional transaction pools with cross-shard finality
- **Parallel Block Validation**: Multi-threaded integrity checks
- **CDN for Static Assets**: Property documents served via government CDN
- **API Gateway Cluster**: NGINX-based load balancer with auto-scaling
- **Monitoring**: Prometheus federation across all regions

**Scaling Formula**:

$$TPS_{max} = \frac{TX_{per\_block} \times validators_{active}}{block\_time_{seconds} \times consensus\_overhead}$$

At $n = 36$, $TX/block = 100$, $block\_time = 2s$, $overhead = 1.5$:

$$TPS_{max} = \frac{100 \times 36}{2 \times 1.5} = 1,200 \ TPS$$

---

### Year 3 (2028): Federation & State Pruning

**Objective**: Implement state channels for high-throughput operations, prune historical state.

| Milestone              | Target                                               | Metric                 |
| ---------------------- | ---------------------------------------------------- | ---------------------- |
| **Q1: State Channels** | District-level state channels for bulk registrations | 10,000 TPS (off-chain) |
| **Q2: State Pruning**  | Archive blocks > 1 year to cold storage              | Active chain < 10GB    |
| **Q3: Light Nodes**    | Read-only nodes for district offices (no consensus)  | 500+ light nodes       |
| **Q4: API V2**         | GraphQL API for complex property queries             | Query latency < 100ms  |

**Technical Deliverables**:

- **State Pruning Engine**: Move historical blocks to WORM archive, keep Merkle roots for verification
- **State Channel Protocol**: Batch 1000 registrations per district, settle to main chain hourly
- **Light Client Protocol**: Block header sync only (no full transactions), Merkle proof verification
- **Compression**: Block data compression (LZ4) reducing storage by 60%

**Pruning Algorithm**:

```
For block B at height h:
  IF (current_height - h) > PRUNE_THRESHOLD (525,600 blocks = 1 year):
    ARCHIVE full block to cold storage
    RETAIN: { index, hash, previousHash, merkleRoot, validator, timestamp }
    DELETE: transactions[] from active storage
    PRESERVE: Merkle root enables future proof generation from archive
```

---

### Year 4 (2029): Cross-Chain Interoperability

**Objective**: Enable interoperability with India's Central Bank Digital Currency (CBDC) and other government chains.

| Milestone                 | Target                                              | Metric                     |
| ------------------------- | --------------------------------------------------- | -------------------------- |
| **Q1: CBDC Bridge**       | RBI Digital Rupee integration for property payments | Payment finality < 10s     |
| **Q2: DigiLocker Bridge** | Cross-reference property docs with DigiLocker vault | Document verification < 5s |
| **Q3: Inter-State Chain** | Cross-state property transfers via relay chain      | Cross-chain finality < 30s |
| **Q4: GSTN Integration**  | Property tax records linked to GST network          | Automated tax compliance   |

**Technical Deliverables**:

- **Relay Chain Architecture**: Hub-and-spoke model where Bharat Land Chain is the hub
- **Atomic Swaps**: Property ownership transfer + CBDC payment in single atomic transaction
- **Cross-Chain Merkle Proofs**: Prove transaction inclusion across chain boundaries
- **Standard Interface**: Government Blockchain Interoperability Protocol (GBIP)

**Cross-Chain Payment Flow**:

```
1. Buyer initiates OWNERSHIP_TRANSFER on Bharat Land Chain
2. Smart escrow locks transfer on property chain
3. Buyer sends Digital Rupee on CBDC chain
4. Relay verifies CBDC payment confirmation
5. Property chain releases ownership to buyer
6. Both chains record cross-reference TX hashes
7. Total time: < 10 seconds, deterministic finality
```

---

### Year 5 (2030): Autonomous Governance & Smart Legal Contracts

**Objective**: Introduce programmable governance and machine-executable legal contracts.

| Milestone                       | Target                                             | Metric                   |
| ------------------------------- | -------------------------------------------------- | ------------------------ |
| **Q1: Smart Legal Contracts**   | Machine-readable property agreements               | Contract execution < 1s  |
| **Q2: AI Fraud Detection**      | ML model for duplicate/fraudulent registrations    | Detection rate > 99%     |
| **Q3: DAO Governance**          | Validator council operates as on-chain DAO         | 100% governance on-chain |
| **Q4: National Scale Complete** | 1 billion property records, full national coverage | 99.999% uptime           |

**Technical Deliverables**:

- **Smart Legal Contract Engine**: Domain-specific language for Indian property law

  ```
  CONTRACT PropertySale {
    PARTIES: seller (BID-xxx), buyer (BID-yyy)
    PROPERTY: propertyId
    CONDITIONS:
      REQUIRE property.verification.status == 'verified'
      REQUIRE property.status == 'active'
      REQUIRE seller == property.owner
      REQUIRE payment.amount >= property.valuation.currentValue
    EXECUTE:
      TRANSFER property.owner FROM seller TO buyer
      RECORD transferPrice = payment.amount
      EMIT OwnershipTransferred(propertyId, seller, buyer)
  }
  ```

- **AI-Powered Fraud Detection**:
  - Duplicate property detection via geospatial ML
  - Identity anomaly detection (unusual registration patterns)
  - Document forgery detection (computer vision on uploaded docs)
  - Network graph analysis for suspicious transfer chains

- **On-Chain Governance DAO**:
  - All protocol changes voted on-chain
  - Weighted voting based on validator uptime and reputation
  - Transparent proposal lifecycle (propose → discuss → vote → execute)
  - Emergency powers with time-locked multisig

---

### 5-Year Summary Table

| Year     | Validators      | States | TPS     | Records | Key Achievement          |
| -------- | --------------- | ------ | ------- | ------- | ------------------------ |
| **2026** | 5               | 3      | 50      | 100K    | Genesis + pilot          |
| **2027** | 36              | 36     | 500     | 10M     | National coverage        |
| **2028** | 36 + 500 light  | 36     | 10,000  | 100M    | State channels + pruning |
| **2029** | 50 + 1000 light | 36     | 50,000  | 500M    | CBDC + cross-chain       |
| **2030** | 50 + 5000 light | 36     | 100,000 | 1B      | Smart contracts + AI     |

---

## Appendix A: Configuration Reference

**Current `CHAIN_CONFIG`** (from `SovereignChain.js`):

| Parameter                 | Value                          | Production Target          |
| ------------------------- | ------------------------------ | -------------------------- |
| `chainId`                 | `BHARAT-LAND-CHAIN-001`        | Same                       |
| `networkName`             | `Bharat Land Registry Network` | Same                       |
| `version`                 | `1.0.0`                        | `2.0.0` (post-audit)       |
| `blockTime`               | `2000` (2s)                    | `2000` (validated optimal) |
| `maxTransactionsPerBlock` | `100`                          | `500` (with sharding)      |
| `genesisTimestamp`        | `Date.now()`                   | Fixed genesis timestamp    |
| `difficulty`              | `1`                            | `1` (PoA, no mining)       |
| `consensusAlgorithm`      | `PoA-PBFT`                     | Same                       |
| `requiredValidators`      | `1`                            | `ceil(n × 2/3)`            |
| `maxBlockSize`            | `1048576` (1MB)                | `4194304` (4MB)            |

## Appendix B: API Endpoint Reference

| Method | Path                                  | Auth | Role    | Function                                   |
| ------ | ------------------------------------- | ---- | ------- | ------------------------------------------ |
| GET    | `/api/health`                         | None | Public  | System health + blockchain status          |
| POST   | `/api/auth/register`                  | None | Public  | User registration + BID creation           |
| POST   | `/api/auth/login`                     | None | Public  | JWT token generation                       |
| GET    | `/api/properties`                     | JWT  | All     | List properties                            |
| POST   | `/api/properties`                     | JWT  | Owner   | Register property (→ PROPERTY_REGISTER TX) |
| GET    | `/api/blockchain/network-status`      | JWT  | All     | Chain telemetry                            |
| GET    | `/api/blockchain/recent-blocks`       | JWT  | All     | Last N blocks                              |
| GET    | `/api/blockchain/recent-transactions` | JWT  | All     | Last N transactions                        |
| GET    | `/api/blockchain/transaction/:hash`   | JWT  | All     | Single TX lookup                           |
| GET    | `/api/blockchain/block/:index`        | JWT  | All     | Single block lookup                        |
| GET    | `/api/blockchain/explorer`            | JWT  | All     | Paginated block explorer                   |
| GET    | `/api/blockchain/verify-property/:id` | JWT  | All     | On-chain property verification             |
| GET    | `/api/blockchain/integrity`           | JWT  | Officer | Full chain integrity audit                 |
| GET    | `/api/blockchain/validators`          | JWT  | Officer | Validator list + status                    |

## Appendix C: Event Bus Reference

| Event                   | Emitted By            | Payload                                 | WebSocket Broadcast                     |
| ----------------------- | --------------------- | --------------------------------------- | --------------------------------------- |
| `block:committed`       | `_produceBlock()`     | `{ block, transactions, validator }`    | `block:new`                             |
| `transaction:submitted` | `submitTransaction()` | `Transaction.toJSON()`                  | `transaction:new`                       |
| `network:started`       | `start()`             | `{ chainId }`                           | `network:started`                       |
| `network:stopped`       | `stop()`              | `{ chainId }`                           | `network:stopped`                       |
| `validator:added`       | `addValidator()`      | `{ id, name, role }`                    | `validator:added` + `validators:list`   |
| `validator:removed`     | `removeValidator()`   | `{ id }`                                | `validator:removed` + `validators:list` |
| — (periodic)            | `setInterval` (10s)   | `{ blockHeight, pendingTx, timestamp }` | `network:heartbeat`                     |

---

**Document Control**

| Field                  | Value                                                 |
| ---------------------- | ----------------------------------------------------- |
| **Author**             | Principal Blockchain Protocol Architect               |
| **Classification**     | Government Restricted                                 |
| **Review Cycle**       | Quarterly                                             |
| **Next Review**        | May 2026                                              |
| **Approval Authority** | Secretary, MeitY                                      |
| **Distribution**       | NIC, CERT-In, State IT Secretaries, Validator Council |

---

_End of Architecture Document — BHARAT LAND CHAIN v2.0.0_
