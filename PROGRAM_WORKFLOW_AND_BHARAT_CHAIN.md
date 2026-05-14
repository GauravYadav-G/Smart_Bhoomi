# Complete Program Workflow + How Bharat Land Chain Works

This document explains how the full system runs end-to-end (frontend → backend → database → Bharat Land Chain → real-time UI), grounded in the current codebase.

## 1) What runs in this project

### Backend (Node.js/Express)

- Entry point: `server.js`
- Responsibilities:
  - REST APIs (auth, properties, transfers, notifications, intelligence, blockchain)
  - MongoDB persistence (via Mongoose models)
  - WebSocket (Socket.IO) broadcasting live blockchain events
  - Starts/hosts the **Bharat Land Chain** engine in-process

### Frontend (React)

- Entry point: `client/src/index.js` → `client/src/App.js`
- Responsibilities:
  - Login/register, dashboards and workflow pages
  - Calls REST APIs via `client/src/services/api.js` (Axios)
  - Subscribes to live blockchain events via `client/src/context/BlockchainContext.js` (Socket.IO client)

### Database (MongoDB)

- Connection: `config/database.js` (called from `server.js`)
- Core collections (models in `models/`):
  - `User`, `Property`, `TransferRequest`, `Notification`

### Bharat Land Chain (Sovereign permissioned chain)

- Core engine: `blockchain/SovereignChain.js`
- Application wrapper: `blockchain/BlockchainService.js`
- Blockchain REST API: `routes/blockchain.js`
- Live broadcasting: `services/realtimeService.js`

## 2) Startup sequence (what happens when you run the backend)

1. `server.js` loads environment variables (`dotenv`).
2. Connects MongoDB via `connectDatabase()`.
3. Creates HTTP server and initializes Socket.IO via `initializeWebSocket(server)`.
   - Socket.IO is connected to the chain singleton (`require('../blockchain/SovereignChain')`) and listens to chain events.
4. Mounts API routes:
   - `POST /api/auth/*` (`routes/auth.js`)
   - `GET/POST /api/properties/*` (`routes/property.js`)
   - `GET/POST /api/transfers/*` (`routes/transfer.js`)
   - `GET /api/blockchain/*` (`routes/blockchain.js`)
   - plus notifications/intelligence
5. Loads `blockchain/BlockchainService.js`.
   - The `BlockchainService` constructor calls `this.chain.start()` immediately.
   - This starts periodic block production every ~2 seconds.

Health check (`GET /api/health`) returns current blockchain network info using `blockchainService.getNetworkStatus()`.

## 3) Frontend runtime flow (how the client talks to the backend)

### Authentication state

- `client/src/context/AuthContext.js`:
  - Stores JWT in `localStorage` (`token`) and user in `localStorage` (`user`).
  - Loads `/auth/profile` on refresh if a token exists.

### REST calls

- `client/src/services/api.js`:
  - Axios instance uses `REACT_APP_API_URL` or defaults to `http://localhost:5001/api`.
  - Request interceptor attaches `Authorization: Bearer <token>`.
  - If server replies `401`, client clears storage and redirects to `/login`.

### Blockchain live data (WebSocket + REST)

- `client/src/context/BlockchainContext.js`:
  - Connects Socket.IO to `http://localhost:5001` (hard-coded `SOCKET_URL`).
  - On connect, requests: network status, recent blocks/tx, validators.
  - Also does an initial REST fetch from `/api/blockchain/*`.

### Where blockchain UI is enabled

- `client/src/App.js` wraps these routes in `BlockchainProvider`:
  - `/command-center`
  - `/block-explorer`
  - `/blockchain-governance` (currently the simulator page)

## 4) Auth workflow (Register/Login/2FA)

### 4.1 Register

- Endpoint: `POST /api/auth/register` (`controllers/authController.js`)
- Flow:
  1. Validate fields (name/email/password/governmentId).
  2. Create a **blockchain identity** using `blockchainService.createBlockchainIdentity()`.
     - This anchors an `IDENTITY_CREATE` transaction on Bharat Land Chain.
     - Generates a `blockchainId` like `BID-<32 hex>` and a QR code.
  3. Create a `User` in MongoDB storing:
     - `blockchainId`, `blockchainNodeId`, `blockchainVerificationHash`, `blockchainQRCode`, `blockchainIssuedAt`.
  4. Return JWT + user info to the client.

### 4.2 Login

- Endpoint: `POST /api/auth/login`
- Flow:
  1. Validate email/password.
  2. Verify password (`user.comparePassword`).
  3. If 2FA enabled → return `requiresTwoFactor: true`.
  4. Else return JWT + user profile.

### 4.3 Two-factor authentication (optional)

- Endpoints:
  - `POST /api/auth/enable-2fa`
  - `POST /api/auth/verify-2fa`
- Uses `speakeasy` secrets and QR code enrollment.

## 5) Property lifecycle workflow (Register → Verify → View → History)

### 5.1 Register property (owner/seller)

- Endpoint: `POST /api/properties/register` (`controllers/propertyController.js`)
- Flow:
  1. Reject if role is `government_officer` or `inspector`.
  2. Validate `propertyDetails.title` and `propertyDetails.address`.
  3. Generate `propertyId` like `PROP-<timestamp>-<random>`.
  4. Build `propertyData` and hash it via `blockchainService.generatePropertyHash()`.
  5. Anchor on chain:
     - `blockchainService.registerProperty(propertyData)`
     - Submits a `PROPERTY_REGISTER` transaction containing:
       - `propertyId`, `propertyHash`, `ownerBlockchainId`, and metadata.
  6. Store in MongoDB (`Property.create`) with:
     - `propertyId`
     - `blockchainHash` (the property hash)
     - `blockchainTransactionId` (the chain transaction hash)
     - `verification.status = pending`
  7. Send email/SMS notifications (non-blocking).

### 5.2 Government verification (officer/inspector)

- Endpoint: `PUT /api/properties/:propertyId/verify` (`controllers/propertyController.js`)
- Flow:
  1. Validates new verification status (`verified/rejected/under_review`).
  2. Prevents verifying your own property.
  3. Updates MongoDB verification fields (`verifiedBy`, `verifiedAt`, notes/reason).
  4. Sends notifications.

Note: this step is **database verification**.

### 5.3 Viewing a property + on-chain verification check

- Endpoint: `GET /api/properties/:id` (`controllers/propertyController.js`)
- Flow:
  1. Loads the property from MongoDB and checks access rules.
  2. Calls `blockchainService.verifyProperty(property.blockchainHash, property.propertyId)`.
     - This does two things:
       - Records a `PROPERTY_VERIFY` transaction on the chain.
       - Calls `chain.verifyPropertyOnChain(propertyId, propertyHash)` to compare the stored hash.
  3. Returns `property` + `blockchainVerification`.

### 5.4 History

- Endpoint: `GET /api/properties/:propertyId/history`
- Flow:
  - Returns MongoDB ownership history plus chain transaction history from `blockchainService.getPropertyHistory(propertyId)`.

## 6) Transfer lifecycle workflow (Buyer → Owner → Payment → Government → Chain)

### 6.1 Buyer creates transfer request

- Endpoint: `POST /api/transfers` (`controllers/transferController.js`)
- Flow:
  1. Buyer requests transfer for a verified property.
  2. Creates `TransferRequest` with status `pending`.
  3. Notifies the current owner (email + SMS + Notification records).

### 6.2 Owner approves/rejects

- Endpoint: `PUT /api/transfers/:requestId/owner-approve`
- Flow:
  1. Owner sets `ownerApproval.approved`.
  2. If `paymentReceived=true` (manual), system marks payment `completed` and moves to `payment_completed`.
  3. Else creates a payment order and moves to `payment_pending`.
  4. Notifies buyer.

### 6.3 Payment processing

- Endpoint: `POST /api/transfers/:requestId/process-payment`
- Flow:
  - If `simulated=true` or `method=cash`:
    - Marks payment as `completed` immediately and moves to `payment_completed`.
  - Else:
    - Uses `paymentService.processPayment(...)` (Razorpay-style verification) and then marks payment `completed`.

### 6.4 Government approval (final)

- Endpoint: `PUT /api/transfers/:requestId/government-approve`
- Flow:
  1. Requires payment status `completed`.
  2. On approval:
     - Calls `blockchainService.transferOwnership(propertyId, fromEmail, toEmail, ...)`.
     - This submits an `OWNERSHIP_TRANSFER` transaction on Bharat Land Chain.
     - Updates MongoDB `Property.owner` and appends `ownershipHistory`.
     - Marks `TransferRequest.status = completed`.
  3. On rejection:
     - Marks `government_rejected` and can initiate refund via `paymentService.refundPayment(...)`.

## 7) Bharat Land Chain internals (how the chain works)

### 7.1 Data structures

- `blockchain/SovereignChain.js` defines:
  - `Transaction`:
    - `id`: `TX-<timestamp>-<random>`
    - `type`: `PROPERTY_REGISTER | PROPERTY_VERIFY | OWNERSHIP_TRANSFER | IDENTITY_CREATE`
    - `data`: payload (includes `propertyId` for property-linked tx)
    - `signer`: string identifier
    - `hash`: SHA-256 over payload
    - `status`: `pending|confirmed|failed`
    - `blockNumber`, `blockHash`
  - `Block`:
    - `index`, `previousHash`, `timestamp`
    - `transactions[]`
    - `merkleRoot`: computed from tx hashes
    - `hash`: SHA-256 over block header fields
    - `validator`: validator node id

### 7.2 Genesis

- At startup the chain creates:
  - A `GENESIS` transaction and a block `#0`.
  - Default validator: `GOV-NODE-PRIMARY`.

### 7.3 Consensus + finality

- Consensus algorithm: `PoA-PBFT` (permissioned Proof-of-Authority with deterministic finality semantics).
- Validators:
  - Stored in-memory (`Map`) and can be added/removed via chain methods.
- Block production:
  - Periodic: every ~2 seconds (`blockTime: 2000`).
  - No empty blocks: a block is produced only if `pendingTransactions.length > 0`.
  - Validator selection: **round-robin** by `chain.length % activeValidators.length`.

### 7.4 Transaction flow

1. Application submits a transaction via `chain.submitTransaction(type, data, signer)`.
2. The tx is appended to the mempool (`pendingTransactions`).
3. The chain emits `transaction:submitted`.
4. If the network is running, the chain attempts to produce a block immediately for fast confirmation.
5. In `_produceBlock()`:
   - Takes up to `maxTransactionsPerBlock`.
   - Builds a new block with `previousHash` linkage.
   - Validates index continuity, hash correctness, and timestamp order.
   - Commits the block and calls `tx.confirm(blockNumber, blockHash)` for each tx.
   - Emits `block:committed` with block summary + tx summaries.

### 7.5 Property indexing and verification

- The chain keeps an index: `propertyId -> [tx hashes]`.
- `verifyPropertyOnChain(propertyId, expectedHash)`:
  - Finds the `PROPERTY_REGISTER` transaction.
  - Compares `registrationTx.data.propertyHash` with the expected hash stored in MongoDB.

### 7.6 Integrity audit

- `verifyChainIntegrity()` scans blocks to detect:
  - broken previous-hash links
  - tampering (recomputed hash mismatch)
  - timestamp disorder

These results are exposed to officers via `GET /api/blockchain/integrity`.

## 8) Blockchain REST API + Explorer

All blockchain routes require auth (`router.use(protect)` in `routes/blockchain.js`).

- `GET /api/blockchain/network-status`
- `GET /api/blockchain/recent-blocks?limit=10`
- `GET /api/blockchain/recent-transactions?limit=20`
- `GET /api/blockchain/transaction/:hash`
- `GET /api/blockchain/block/:index`
- `GET /api/blockchain/explorer?page=1&limit=10`
- `GET /api/blockchain/verify-property/:propertyId`
- Officer-only:
  - `GET /api/blockchain/integrity`
  - `GET /api/blockchain/validators`

Frontend pages using this include:

- `client/src/pages/BlockExplorer.js`
- `client/src/components/BlockchainTransparencyPanel.js`

## 9) Real-time updates (Socket.IO)

- Backend: `services/realtimeService.js`.
- Events emitted to clients:
  - `network:status`, `network:heartbeat`
  - `blocks:recent`, `block:new`
  - `transaction:new`
  - `validators:list`, `validator:added`, `validator:removed`

- Frontend subscription: `client/src/context/BlockchainContext.js`.

## 10) “Blockchain Simulator” page vs the real chain

- Route: `/blockchain-governance` in `client/src/App.js`.
- Page file: `client/src/pages/BlockchainGovernance.js`.
- This is an **interactive simulated blockchain environment** (client-side educational sandbox).
- It is separate from the real backend Bharat Land Chain engine (which lives in `blockchain/SovereignChain.js`).

## 11) Ports and configuration notes (important)

This repo currently uses multiple defaults that must align:

- Backend port is `process.env.PORT || 5000` (`server.js`).
- Frontend REST base URL is `REACT_APP_API_URL || http://localhost:5001/api` (`client/src/services/api.js`).
- Frontend Socket.IO URL is hard-coded `http://localhost:5001` (`client/src/context/BlockchainContext.js`).

If your backend is running on `5000`, you should update the client configuration (or set env vars) so REST + Socket.IO point to the correct port.

## 12) How the full workflow looks in practice

1. User registers → identity anchored (`IDENTITY_CREATE`) → MongoDB user created.
2. Owner registers property → property hash computed → `PROPERTY_REGISTER` anchored → MongoDB property created (pending verification).
3. Officer verifies property in DB → property becomes eligible for transfer.
4. Buyer requests transfer → owner approves → payment completed.
5. Government approves → `OWNERSHIP_TRANSFER` anchored → MongoDB property owner changes + ownershipHistory updated.
6. At every step, the explorer/UI can display live chain status/blocks/transactions via REST + WebSocket.
