# SmartBhoomi — Complete Build Guide

## From Zero to a Fully Functional Blockchain Land Registry

### A Step-by-Step Guide for Absolute Beginners

---

**Who is this for?** Anyone — even if you have never written a single line of code. This guide explains every concept, every file, every decision, and every connection in the SmartBhoomi system. By the end, you will understand exactly how a decentralised land registry works and be able to build one yourself.

---

## TABLE OF CONTENTS

```
PART 1: FOUNDATIONS — What You Need to Know Before Building
  Chapter 1:  What is SmartBhoomi? (The Big Picture)
  Chapter 2:  Concepts Explained Like You're Five
  Chapter 3:  Tools You Need (Installation Guide)
  Chapter 4:  Project Folder Structure — What Goes Where

PART 2: THE BACKEND — Building the Brain
  Chapter 5:  Setting Up the Server (Express.js)
  Chapter 6:  Connecting to the Database (MongoDB)
  Chapter 7:  User Registration & Login (Authentication)
  Chapter 8:  The Property System (Registration, Listing, Details)
  Chapter 9:  The Blockchain Engine (Bharat Land Chain)
  Chapter 10: Encrypting Citizen Data (AES-256-GCM)
  Chapter 11: IPFS — Storing Documents on a Decentralised Network
  Chapter 12: The Spatial Engine — Haversine GPS Conflict Detection
  Chapter 13: The AI/ML Fraud Detection System
  Chapter 14: Biometric Authentication (FIDO2/WebAuthn)
  Chapter 15: The Transfer System — Peer-to-Peer Ownership Change
  Chapter 16: The Audit Trail — Tamper-Proof Transaction History
  Chapter 17: The Admin Portal — Government Command Centre
  Chapter 18: Notifications — Email, SMS, WebSocket

PART 3: THE FRONTEND — Building the Face
  Chapter 19: React App Setup & Routing
  Chapter 20: Pages & Components — What the User Sees
  Chapter 21: Context Providers — Sharing State Across Pages
  Chapter 22: The Admin Dashboard — Government Interface

PART 4: RUNNING THE SYSTEM
  Chapter 23: Environment Variables (.env file)
  Chapter 24: Starting Everything Up
  Chapter 25: Testing the System
  Chapter 26: Common Errors and How to Fix Them

APPENDICES
  A: Complete File Map (Every File Explained)
  B: Complete API Reference (Every Endpoint)
  C: Database Schema Reference (Every Collection)
  D: Glossary of Technical Terms
```

---

# PART 1: FOUNDATIONS

---

## Chapter 1: What is SmartBhoomi? (The Big Picture)

### 1.1 The Problem

In India, buying or selling land involves visiting government offices, dealing with paper files, waiting for months, and hoping nobody has forged documents to claim your land. Land disputes make up 66% of all court cases in India. Some cases take 20+ years to resolve.

The root causes:

- **Paper records can be forged** — Anyone with access can modify a land deed
- **No map verification** — Two people can claim the same plot and nobody checks automatically
- **No audit trail** — There is no tamper-proof record of who did what and when
- **Centralised storage** — If the government server crashes, documents are lost
- **No identity proof** — Someone can pretend to be the owner and sell your land

### 1.2 The Solution: SmartBhoomi

SmartBhoomi is a web application that solves all five problems:

| Problem              | SmartBhoomi Solution                                                                                       | Technology                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Paper records forged | Every property is recorded on a **blockchain** — an unchangeable digital ledger                            | Bharat Land Chain (PBFT)     |
| No map verification  | GPS coordinates are checked using the **Haversine formula** to detect overlapping plots                    | Haversine + MongoDB 2dsphere |
| No audit trail       | Every step of a transfer is recorded in a **hash chain** — change one detail and the whole chain breaks    | SHA-256 Hash Chain           |
| Centralised storage  | Documents are encrypted and stored on **IPFS** — a distributed file system with no single point of failure | IPFS + AES-256-GCM           |
| No identity proof    | Both buyer and seller must pass **biometric authentication** (fingerprint/face) during transfers           | FIDO2/WebAuthn               |

Additionally, an **AI system** (Random Forest machine learning) automatically detects suspicious registrations, and a **government admin portal** gives officials oversight with rank-based access control.

### 1.3 How Users Interact with SmartBhoomi

```
┌──────────────────────────────────────────────────────────┐
│                     CITIZEN PORTAL                        │
│                                                          │
│  1. Register account (name, email, government ID)        │
│  2. Complete KYC (Aadhaar, PAN, face enrollment)         │
│  3. Register property (details, documents, GPS coords)   │
│  4. View dashboard (all properties, blockchain status)   │
│  5. Initiate transfer (buyer creates request)            │
│  6. Biometric verification (both parties)                │
│  7. Payment (Razorpay/UPI)                               │
│  8. Ownership transferred (blockchain + database)        │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                   GOVERNMENT ADMIN PORTAL                 │
│                                                          │
│  1. Login (gov.in email + TOTP MFA)                      │
│  2. Review pending properties (approve/reject)           │
│  3. View all properties on interactive India map         │
│  4. Check fraud intelligence alerts                      │
│  5. View blockchain explorer                             │
│  6. Manage IPFS document vault                           │
│  7. Freeze/dispute properties                            │
│  8. Generate reports and audit trails                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 1.4 The Technology Stack (What Tools We Use)

Think of building a house: you need bricks (database), walls (backend), paint (frontend), locks (security), and electricity (services). Here is SmartBhoomi's "construction material":

| Layer            | Technology                 | What It Does                                                 | Analogy                 |
| ---------------- | -------------------------- | ------------------------------------------------------------ | ----------------------- |
| **Frontend**     | React 18                   | What the user sees and clicks — forms, buttons, charts, maps | The paint and furniture |
| **Backend**      | Express.js (Node.js)       | Processes requests, talks to database, runs business logic   | The walls and plumbing  |
| **Database**     | MongoDB                    | Stores all data — users, properties, transfers, logs         | The filing cabinet      |
| **Blockchain**   | Bharat Land Chain (custom) | Immutable ledger — once written, cannot be changed           | The stone tablets       |
| **File Storage** | IPFS (Kubo)                | Stores encrypted document files across a distributed network | The safety deposit box  |
| **AI/ML**        | Flask + scikit-learn       | Analyses registrations to detect fraud                       | The security guard      |
| **Biometric**    | @simplewebauthn            | Fingerprint and face recognition for identity proof          | The fingerprint lock    |
| **Email**        | Nodemailer                 | Sends emails for notifications                               | The postman             |
| **SMS**          | Twilio                     | Sends text messages                                          | The telegram            |
| **Payments**     | Razorpay                   | Processes payments during transfers                          | The bank teller         |
| **Real-time**    | Socket.IO                  | Instant updates pushed to the browser (no refresh needed)    | The intercom            |

---

## Chapter 2: Concepts Explained Like You're Five

### 2.1 What is a Server?

When you type a website address, your browser sends a message ("request") to a computer somewhere ("server"). That computer processes your message and sends back a response (a web page, data, etc.).

In SmartBhoomi:

- The **backend server** is built with **Express.js** and runs on port **5001**
- The **frontend** is built with **React** and runs on port **3001**
- They talk to each other through **API calls** (like sending letters back and forth)

```
Your Browser (port 3001)  ──HTTP Request──>  Server (port 5001)  ──Query──>  MongoDB
                          <──JSON Response──                      <──Data──
```

### 2.2 What is an API?

An API (Application Programming Interface) is a set of "doors" that the server opens for the frontend to knock on. Each door has a specific address (URL) and expects a specific type of knock (GET, POST, PUT, DELETE).

Example:

```
POST /api/auth/register        ← "I want to create a new account"
POST /api/auth/login            ← "I want to log in"
GET  /api/properties            ← "Show me all properties"
POST /api/properties            ← "I want to register a new property"
POST /api/transfers             ← "I want to buy this property"
```

### 2.3 What is a Database?

A database is like an organised digital filing cabinet. MongoDB stores data as "documents" (like JSON files) inside "collections" (like folders).

SmartBhoomi has these collections:
| Collection | What It Stores |
|---|---|
| `users` | Citizen accounts (name, email, KYC status, biometric credentials) |
| `admins` | Government officer accounts (gov.in email, rank, clearance level) |
| `properties` | Land records (title, address, GPS, documents, blockchain hash, verification status) |
| `transferrequests` | Ownership change requests (buyer, seller, status, payment, biometric proofs) |
| `auditlogs` | Tamper-proof hash-chained records of every transfer step |
| `notifications` | Email/SMS/push notification records |
| `announcements` | Government announcements and guidelines |

### 2.4 What is a Blockchain?

Imagine a notebook where:

- Each page (block) has a serial number
- Each page contains a list of transactions
- At the bottom of each page, you write a unique fingerprint (hash) of the page
- At the top of the NEXT page, you copy that fingerprint

If anyone changes even one letter on a previous page, the fingerprint changes, and every subsequent page becomes invalid. This is a **blockchain** — a chain of blocks where each block references the previous one.

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Block #0  │    │ Block #1  │    │ Block #2  │    │ Block #3  │
│ (Genesis) │    │           │    │           │    │           │
│           │    │ prevHash: │    │ prevHash: │    │ prevHash: │
│ hash: abc │──>│ abc       │──>│ def       │──>│ ghi       │
│           │    │ hash: def │    │ hash: ghi │    │ hash: jkl │
│ TX: none  │    │ TX: Prop1 │    │ TX: Prop2 │    │ TX: Xfer1 │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

SmartBhoomi's blockchain is called **Bharat Land Chain**. It has 3 "validator" computers (Government, Registry Office, Auditor) that must agree (2 out of 3) before any new page is added. This is called **PBFT consensus** (Practical Byzantine Fault Tolerance).

### 2.5 What is IPFS?

IPFS (InterPlanetary File System) is like BitTorrent for files — instead of storing a file on ONE server, it's spread across many computers. Each file gets a unique address based on its CONTENT (called a CID — Content Identifier). If the content changes, the address changes. So you can always verify that the file hasn't been tampered with.

SmartBhoomi adds encryption BEFORE uploading to IPFS. So even if someone finds the file on the network, they cannot read it without the decryption key.

### 2.6 What is Encryption?

Encryption turns readable data into scrambled gibberish that only someone with the correct "key" can unscramble.

SmartBhoomi uses **AES-256-GCM**:

- **AES** = Advanced Encryption Standard (the algorithm)
- **256** = The key is 256 bits long (extremely hard to guess — there are more possible keys than atoms in the universe)
- **GCM** = Galois/Counter Mode (it not only encrypts but also checks if anyone tampered with the data)

Two layers of encryption:

1. **Document Encryption** — Full files (deeds, receipts) encrypted before storing on IPFS
2. **Field Encryption** — Individual data fields (Aadhaar number, PAN number) encrypted in MongoDB

### 2.7 What is the Haversine Formula?

The Earth is round, but computer screens are flat. If you try to calculate distance between two GPS points using flat-Earth math (Pythagorean theorem), you get the wrong answer — especially at higher latitudes where the "lines" of longitude get closer together.

The **Haversine formula** accounts for the Earth's curvature:

```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)
distance = 2 × Earth_Radius × atan2(√a, √(1-a))
```

SmartBhoomi uses this to check if two properties are within 100 metres of each other (a "spatial conflict").

### 2.8 What is JWT?

JWT (JSON Web Token) is like a VIP wristband at a concert. When you log in, the server gives you a wristband (token). Every time you make a request, you show the wristband. The server checks if it's valid and lets you in.

SmartBhoomi uses TWO different wristband colours:

- **Blue wristband** = Citizen token (signed with `JWT_SECRET`)
- **Red wristband** = Admin token (signed with `JWT_SECRET_ADMIN_PORTAL`)

A blue wristband cannot get you into the admin area, and a red wristband cannot get you into the citizen area. This is called **channel isolation**.

---

## Chapter 3: Tools You Need (Installation Guide)

### 3.1 Required Software

Install these in order:

#### 1. Node.js (v18 or later)

Node.js lets you run JavaScript outside a browser — it's the engine for both the backend server and the frontend build tool.

**macOS:**

```bash
# Using Homebrew (recommended)
brew install node

# Verify installation
node --version    # Should show v18.x or later
npm --version     # Should show 9.x or later
```

**Windows:** Download from https://nodejs.org (choose LTS version)

**Linux (Ubuntu):**

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 2. MongoDB (v6 or later)

MongoDB is the database that stores all application data.

**macOS:**

```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0

# Verify it's running
mongosh --eval "db.version()"
```

**Windows:** Download from https://www.mongodb.com/try/download/community

**Linux (Ubuntu):**

```bash
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### 3. Docker Desktop (for IPFS)

Docker runs the IPFS node (Kubo) in an isolated container.

**All platforms:** Download from https://www.docker.com/products/docker-desktop/

After installation, verify:

```bash
docker --version
docker compose version
```

#### 4. Git (optional but recommended)

For version control and cloning the project.

```bash
git --version     # Usually pre-installed on macOS/Linux
```

#### 5. A Code Editor

**VS Code** is recommended: https://code.visualstudio.com/

Helpful VS Code extensions:

- ESLint (code quality)
- Prettier (code formatting)
- MongoDB for VS Code (view database)
- Thunder Client (test APIs without Postman)

### 3.2 Setting Up the IPFS Node

SmartBhoomi uses a self-hosted IPFS node (Kubo) running inside Docker:

```bash
# Pull and run the Kubo IPFS image
docker run -d \
  --name ipfs_node \
  -p 5002:5001 \
  -p 8080:8080 \
  -v ipfs_staging:/export \
  -v ipfs_data:/data/ipfs \
  ipfs/kubo:latest

# Verify it's running
docker ps
curl http://localhost:5002/api/v0/version
```

**Important ports:**

- `5002` → IPFS API (mapped from container's 5001 to avoid conflict with our backend)
- `8080` → IPFS Gateway (to retrieve files via HTTP)

---

## Chapter 4: Project Folder Structure — What Goes Where

### 4.1 The Root Directory

```
SmartBhoomi/
│
├── server.js                    ← THE ENTRY POINT — starts the whole backend
├── package.json                 ← Backend dependencies list
├── .env                         ← Secret configuration (passwords, keys) — NEVER commit this
│
├── config/
│   └── database.js              ← MongoDB connection logic
│
├── models/                      ← DATABASE SCHEMAS — define what data looks like
│   ├── User.js                  ← Citizen accounts (name, email, KYC, biometrics)
│   ├── Admin.js                 ← Government officer accounts
│   ├── Property.js              ← Land records (title, GPS, documents, blockchain)
│   ├── TransferRequest.js       ← Ownership transfer requests
│   ├── AuditLog.js              ← Hash-chained audit entries
│   ├── Notification.js          ← Email/SMS notification records
│   └── Announcement.js          ← Government announcements
│
├── routes/                      ← URL DEFINITIONS — which URL goes to which function
│   ├── auth.js                  ← /api/auth/* (register, login, biometric)
│   ├── property.js              ← /api/properties/* (CRUD + spatial check)
│   ├── transfer.js              ← /api/transfers/* (create, approve, pay, complete)
│   ├── admin.js                 ← /api/admin/* (government operations)
│   ├── blockchain.js            ← /api/blockchain/* (explorer, stats)
│   ├── kyc.js                   ← /api/kyc/* (Aadhaar, PAN, face enrollment)
│   ├── intelligence.js          ← /api/intelligence/* (ML fraud alerts)
│   └── notification.js          ← /api/notifications/* (user notifications)
│
├── controllers/                 ← BUSINESS LOGIC — the actual code that handles requests
│   ├── authController.js        ← Register, login, biometric verification (1,204 lines)
│   ├── propertyController.js    ← Register property, verify, list, update (617 lines)
│   ├── transferController.js    ← Transfer lifecycle management
│   ├── adminController.js       ← Government admin operations
│   ├── kycController.js         ← e-KYC verification flows
│   ├── intelligenceController.js← ML fraud detection interface
│   └── notificationController.js← Notification management
│
├── middleware/                   ← GATEKEEPERS — check auth & validate before logic runs
│   ├── auth.js                  ← protect() — verifies citizen JWT
│   ├── adminAuth.js             ← protectAdmin() — verifies admin JWT (different secret)
│   └── security.js              ← Rate limiting, input validation rules
│
├── blockchain/                  ← THE BLOCKCHAIN ENGINE
│   ├── SovereignChain.js        ← Core blockchain: Block, Transaction, Validator, Chain (737 lines)
│   ├── BlockchainService.js     ← High-level API wrapper for the chain (292 lines)
│   └── PropertyRegistry.sol     ← Solidity smart contract (EVM reference, 215 lines)
│
├── services/                    ← INTERNAL SERVICES — specialised logic modules
│   ├── ipfsService.js           ← IPFS upload/download with HKDF encryption (557 lines)
│   ├── AuditService.js          ← 15-step hash-chained audit trail (204 lines)
│   ├── BiometricService.js      ← WebAuthn/FIDO2 helpers
│   ├── eKYCService.js           ← Aadhaar/PAN verification simulation
│   ├── MLService.js             ← Random Forest fraud classification client
│   ├── SMSService.js            ← Twilio SMS sending
│   └── realtimeService.js       ← Socket.IO WebSocket management
│
├── utils/                       ← UTILITY FUNCTIONS — reusable helpers
│   ├── encryption.js            ← AES-256-GCM encrypt/decrypt, SHA-256, mask data
│   ├── haversineDistance.js     ← Haversine geodesic formula
│   ├── spatialConflict.js       ← 2-tier conflict detection (MongoDB + Haversine)
│   ├── emailService.js          ← Nodemailer email templates
│   ├── fileUpload.js            ← Multer file upload configuration
│   └── paymentService.js        ← Razorpay payment helpers
│
├── client/                      ← THE FRONTEND (React application)
│   ├── package.json             ← Frontend dependencies list
│   ├── public/
│   │   └── index.html           ← The single HTML page that React mounts into
│   └── src/
│       ├── App.js               ← Root component — all routes defined here
│       ├── index.js             ← Entry point — renders App into the DOM
│       │
│       ├── context/             ← SHARED STATE — data available to all components
│       │   ├── AuthContext.js   ← Login/logout state, user data, token management
│       │   ├── BlockchainContext.js ← Live blockchain stats via WebSocket
│       │   └── IntelligenceContext.js ← Fraud alerts and anomaly data
│       │
│       ├── services/
│       │   └── api.js           ← Axios HTTP client — all API calls centralised here
│       │
│       ├── components/          ← REUSABLE UI PIECES
│       │   ├── Navbar.js        ← Navigation bar (shown on all citizen pages)
│       │   ├── BoundaryMap.js   ← Leaflet map for property boundaries
│       │   ├── InteractiveMapPicker.js ← Click-to-pick GPS coordinates
│       │   ├── SmartIdentityCard.js    ← Blockchain ID card display
│       │   ├── TransferIdentityCard.js ← Transfer status card
│       │   ├── CommandCenterDashboard.js ← Real-time blockchain monitor
│       │   ├── BlockchainTransparencyPanel.js ← Block explorer UI
│       │   ├── PredictiveIndicators.js ← ML risk indicators
│       │   └── SkeletonLoader.js       ← Loading placeholder UI
│       │
│       ├── pages/               ← FULL-PAGE VIEWS (one per route)
│       │   ├── LandingPage.js   ← Public home page (hero, features, stats)
│       │   ├── Login.js         ← Login form with biometric support
│       │   ├── Register.js      ← Registration form
│       │   ├── Dashboard.js     ← User dashboard (property summary, charts)
│       │   ├── RegisterProperty.js ← Property registration form (with map picker)
│       │   ├── PropertyList.js  ← All user's properties
│       │   ├── PropertyDetails.js ← Single property deep-view
│       │   ├── TransferRequests.js ← All transfer requests
│       │   ├── PaymentGateway.js ← Razorpay/UPI payment page
│       │   ├── KYCDashboard.js  ← Aadhaar/PAN/face verification page
│       │   ├── BlockExplorer.js ← Browse blockchain blocks and transactions
│       │   ├── Profile.js       ← User profile editing
│       │   └── BlockchainGovernance.js ← Governance dashboard
│       │
│       └── admin/               ← GOVERNMENT ADMIN PORTAL
│           ├── context/
│           │   └── AdminAuthContext.js ← Admin login state (separate from citizen)
│           ├── services/
│           │   └── adminApi.js  ← Admin-specific API calls
│           ├── pages/
│           │   ├── AdminLogin.js    ← Admin login form (gov.in email + MFA)
│           │   └── AdminDashboard.js ← Main admin command centre
│           └── components/
│               ├── AIMLPanel.js     ← ML fraud detection controls
│               ├── IPFSAdminPanel.js ← IPFS document management
│               ├── BlockchainAdminPanel.js ← Blockchain monitoring
│               ├── IntelHub.js      ← Intelligence alerts hub
│               ├── InteractiveIndiaMap.js ← India heatmap of properties
│               └── AdminSmartIDCard.js ← Admin ID card display
│
└── uploads/                     ← Uploaded files stored here (gitignored)
    └── ipfs_pending/            ← Files waiting for IPFS upload retry
```

### 4.2 How These Pieces Connect

```
User clicks "Register Property" button
        │
        ▼
[React RegisterProperty.js page]
  → Collects form data (title, address, GPS, documents)
  → Calls api.post('/properties', data)
        │
        ▼
[Express route: routes/property.js]
  → router.post('/', protect, propertyValidation, validate, registerProperty)
  → protect middleware checks JWT token
  → propertyValidation checks required fields
        │
        ▼
[Controller: controllers/propertyController.js → registerProperty()]
  → Step 1: Generate unique propertyId
  → Step 2: Call spatialConflict.checkSpatialConflict(lat, lng) ← HAVERSINE
  → Step 3: Call mlService.classifyProperty(features) ← AI FRAUD CHECK
  → Step 4: Call blockchainService.registerProperty(data) ← BLOCKCHAIN
  → Step 5: Decide verification status (auto-verify or needs_review)
  → Step 6: Save to MongoDB via Property.create(...)
  → Step 7: Send email + SMS notifications
  → Step 8: Return JSON response to frontend
        │
        ▼
[React receives response]
  → Shows success/error toast notification
  → Redirects to dashboard
```

---

# PART 2: THE BACKEND

---

## Chapter 5: Setting Up the Server (Express.js)

### 5.1 What server.js Does

`server.js` is the single entry point for the entire backend. When you type `node server.js`, this is what happens (in order):

```
1. Load environment variables from .env file
2. Create an Express application
3. Connect to MongoDB
4. Start WebSocket (Socket.IO) for real-time events
5. Apply security middleware (Helmet, CORS, JSON parsing)
6. Mount all route files on their URL prefixes
7. Add health check endpoint
8. Add error handling
9. Start listening on port 5001
```

### 5.2 The Code, Explained Line by Line

```javascript
require("dotenv").config(); // Read .env file → puts values into process.env

const express = require("express"); // Import Express (the web framework)
const http = require("http"); // Built-in Node HTTP module
const cors = require("cors"); // Cross-Origin Resource Sharing (allows frontend to talk to backend)
const helmet = require("helmet"); // Security headers (prevents common web attacks)
const connectDatabase = require("./config/database"); // Our database connector
const { initializeWebSocket } = require("./services/realtimeService"); // Socket.IO setup

const app = express(); // Create the Express app
const server = http.createServer(app); // Wrap it in an HTTP server (needed for WebSocket)

connectDatabase(); // Connect to MongoDB
const io = initializeWebSocket(server); // Start WebSocket on same HTTP server
```

### 5.3 Middleware — The Gatekeepers

Middleware runs BEFORE your route handler. Think of it as a series of security checkpoints:

```
Request arrives → Helmet → CORS → JSON Parser → Route Matcher → Controller
```

```javascript
app.use(helmet()); // Sets 11 security headers (X-Frame-Options, CSP, etc.)
app.use(
  cors({
    // Allow frontend (port 3001) to talk to backend (port 5001)
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true, // Allow cookies/auth headers
  }),
);
app.use(express.json({ limit: "10mb" })); // Parse JSON request bodies (up to 10MB for document uploads)
```

### 5.4 Route Mounting

Each route file handles a specific URL prefix:

```javascript
app.use("/api/auth", require("./routes/auth")); // /api/auth/register, /api/auth/login, ...
app.use("/api/properties", require("./routes/property")); // /api/properties, /api/properties/:id, ...
app.use("/api/transfers", require("./routes/transfer")); // /api/transfers, /api/transfers/:id, ...
app.use("/api/admin", require("./routes/admin")); // /api/admin/login, /api/admin/dashboard-stats, ...
app.use("/api/blockchain", require("./routes/blockchain")); // /api/blockchain/blocks, /api/blockchain/stats, ...
app.use("/api/kyc", require("./routes/kyc")); // /api/kyc/verify-aadhaar, /api/kyc/enroll-face, ...
app.use("/api/intelligence", require("./routes/intelligence")); // /api/intelligence/alerts, /api/intelligence/risk, ...
app.use("/api/notifications", require("./routes/notification")); // /api/notifications, ...
```

---

## Chapter 6: Connecting to the Database (MongoDB)

### 6.1 The Connection File

`config/database.js` connects to MongoDB using Mongoose (an ORM — Object Relational Mapper — that lets you define data "shapes" in JavaScript):

```javascript
const mongoose = require("mongoose");

const connectDatabase = async () => {
  const dbUri = process.env.MONGODB_URI || process.env.DATABASE_URI;
  const conn = await mongoose.connect(dbUri);
  console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
};
```

Your `.env` file needs:

```
MONGODB_URI=mongodb://localhost:27017/property_registry
```

This means: connect to MongoDB running on my machine, and use a database called `property_registry`. MongoDB will create it automatically the first time data is written.

### 6.2 How Mongoose Models Work

A "model" defines the SHAPE of data. Think of it as a form template.

Example — the User model (`models/User.js`) says:

```
Every user MUST have:  name, email, password, phoneNumber, governmentId
Every user CAN have:   address, profile picture, biometric credentials, KYC data
```

When you do `User.create({ name: 'Rahul', email: 'rahul@gmail.com', ... })`, Mongoose checks that all required fields are present, validates formats (email must have @), hashes the password, and saves it to MongoDB.

---

## Chapter 7: User Registration & Login (Authentication)

### 7.1 Registration Flow

When a citizen registers:

```
1. Frontend sends: { name, email, password, phoneNumber, governmentId, role }
        │
2. Security middleware validates fields:
   → Name not empty
   → Email is valid format
   → Password ≥ 8 characters
   → Government ID not empty
   → Role is one of: property_owner, buyer, seller
        │
3. Controller checks: does this email or government ID already exist?
   → If yes: return error "already exists"
        │
4. Create Blockchain Identity:
   → blockchainService.createBlockchainIdentity({ name, email, governmentId })
   → Generates a unique blockchain ID (BID-xxxxx)
   → Creates a QR code containing the blockchain identity
   → Records the identity creation on the blockchain
        │
5. Create User in MongoDB:
   → Password is automatically hashed with bcrypt (12 salt rounds)
   → Government ID can be encrypted with AES-256-GCM
   → Blockchain ID, node ID, verification hash, QR code saved
        │
6. Generate JWT token:
   → jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '24h' })
        │
7. Send welcome email + SMS (non-blocking, won't fail registration if email fails)
        │
8. Return: { token, user: { id, name, email, blockchainId, qrCode } }
```

### 7.2 Login Flow

```
1. Frontend sends: { email, password }
        │
2. Find user by email (include password field — normally hidden)
        │
3. Check account lockout:
   → If user.lockUntil > now → "Account locked, try in X minutes"
   → Lockout triggers after 5 failed attempts
   → Lockout duration: 30 minutes
        │
4. Compare password:
   → bcrypt.compare(inputPassword, storedHash)
   → If wrong: increment loginAttempts, return "Invalid credentials"
        │
5. If correct: reset loginAttempts to 0
        │
6. Check if biometric login is required:
   → If user has face/fingerprint enrolled → requiresBiometric: true
   → Frontend must then complete biometric step before getting full token
        │
7. Generate JWT token and return user data
```

### 7.3 How JWT Protection Works

After login, the frontend stores the token in `localStorage`. For every subsequent request, the `api.js` interceptor automatically adds it:

```javascript
// client/src/services/api.js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`; // Adds: "Bearer eyJhbG..."
  }
  return config;
});
```

On the backend, the `protect` middleware extracts and verifies this token:

```javascript
// middleware/auth.js
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = await User.findById(decoded.id); // Attach user to request
next(); // Allow the request to proceed
```

If the token is missing, expired, or forged → 401 Unauthorized.

---

## Chapter 8: The Property System

### 8.1 Registering a Property

The `registerProperty` function in `propertyController.js` is the most complex function in the system — it orchestrates 7 subsystems in a single request:

```
Step 1: GENERATE UNIQUE ID
→ Format: "PROP-{timestamp}-{randomHex}"
→ Example: "PROP-1709472000000-A3F2B1C4"

Step 2: HAVERSINE SPATIAL CONFLICT CHECK
→ If GPS coordinates provided, check if any existing property
  is within 100 metres using the Haversine formula
→ If conflict found, property goes to admin review

Step 3: ML FRAUD RISK CLASSIFICATION
→ Extract 8 features from the registration:
  - Number of documents uploaded
  - Has ownership deed? (yes/no)
  - Has sale deed? (yes/no)
  - Has tax receipt? (yes/no)
  - KYC verification level (0-3)
  - Coordinate conflict? (yes/no)
  - Property valuation
  - Registration hour (off-hours = higher risk)
→ Send to Flask ML service (port 5050)
→ Get back: { risk_label: 'low'/'medium'/'high', fraud_probability: 0.0-1.0 }

Step 4: BLOCKCHAIN REGISTRATION
→ Create SHA-256 hash of property data
→ Submit PROPERTY_REGISTER transaction to Bharat Land Chain
→ PBFT consensus confirms the block
→ Get back: { transactionHash, blockNumber }

Step 5: AUTO-VERIFICATION DECISION
→ IF documents complete AND no spatial conflict AND ML risk ≠ high:
    → Status = "verified" (auto-approved!)
→ ELSE:
    → Status = "needs_review" (sent to admin dashboard)

Step 6: SAVE TO MONGODB
→ All data saved including blockchain hashes, verification status,
  conflict info, and ML risk scores

Step 7: SEND NOTIFICATIONS
→ Email: "Your property PROP-xxx has been registered"
→ SMS: Similar message to phone number
→ WebSocket: Real-time event broadcast to all connected clients
```

### 8.2 The Property Model — What Gets Stored

| Field                          | Type     | Example                                          | Purpose                      |
| ------------------------------ | -------- | ------------------------------------------------ | ---------------------------- |
| `propertyId`                   | String   | `PROP-1709472000000-A3F2B1C4`                    | Unique identifier            |
| `blockchainHash`               | String   | `a1b2c3d4...` (64 hex chars)                     | Links to blockchain          |
| `owner`                        | ObjectId | `65a1b2c3d4e5f6a7b8c9d0e1`                       | Points to User document      |
| `propertyDetails.title`        | String   | `"3 BHK Flat in Bengaluru"`                      | Human-readable title         |
| `propertyDetails.propertyType` | String   | `"residential"`                                  | One of 5 types               |
| `propertyDetails.coordinates`  | Object   | `{ latitude: 12.97, longitude: 77.59 }`          | GPS location                 |
| `propertyDetails.boundary`     | Array    | `[{lat, lng}, {lat, lng}, ...]`                  | Polygon boundary points      |
| `documents`                    | Array    | See below                                        | Uploaded legal documents     |
| `documents[].ipfsCID`          | String   | `bafybeig...`                                    | IPFS content identifier      |
| `documents[].ipfsIV`           | String   | `a1b2c3...` (hex)                                | Encryption IV                |
| `documents[].ipfsAuthTag`      | String   | `d4e5f6...` (hex)                                | GCM auth tag                 |
| `verification.status`          | String   | `"verified"` or `"needs_review"`                 | Current status               |
| `verification.checks`          | Object   | `{ documentHashValid: true, ... }`               | Auto-check results           |
| `location`                     | GeoJSON  | `{ type: "Point", coordinates: [77.59, 12.97] }` | For 2dsphere spatial queries |
| `valuation.currentValue`       | Number   | `5000000`                                        | Value in INR                 |
| `ownershipHistory`             | Array    | `[{ previousOwner, newOwner, date, txHash }]`    | Transfer history             |
| `dataIntegrityHash`            | String   | SHA-256 hash                                     | For tamper detection         |

---

## Chapter 9: The Blockchain Engine (Bharat Land Chain)

### 9.1 Where the Code Lives

`blockchain/SovereignChain.js` (737 lines) contains everything:

- `Transaction` class — represents one action (register property, transfer, etc.)
- `Block` class — a container of transactions with hash linkage
- `ValidatorNode` class — one of the 3 government validators
- `SovereignChain` class — the main chain that orchestrates everything

`blockchain/BlockchainService.js` (292 lines) is a friendlier wrapper that the rest of the app uses.

### 9.2 How a Transaction Gets Confirmed

```
registerProperty() in BlockchainService.js is called
        │
        ▼
1. Create a Transaction object:
   { type: 'PROPERTY_REGISTER', data: {...}, from: userId, hash: SHA-256(...) }
        │
        ▼
2. Submit to SovereignChain.submitTransaction(tx)
   → Validates the transaction
   → Adds to pending pool
        │
        ▼
3. processTransactions() triggers PBFT:
   → PRIMARY VALIDATOR (round-robin): Creates a candidate block
     - Packs pending TXs (up to 100 per block)
     - Calculates Merkle root of all TX hashes
     - Computes block hash
        │
        ▼
4. PREPARE phase:
   → Sends candidate block to other 2 validators
   → Each validator independently checks:
     a) previousHash matches last block? ✓
     b) index = last block index + 1? ✓
     c) timestamp > last block timestamp? ✓
     d) Hash recomputation matches? ✓
   → Each validator signs a PREPARE message with HMAC-SHA256
        │
        ▼
5. COMMIT phase:
   → Need ≥ 2 out of 3 PREPARE messages (quorum)
   → If achieved: each validator sends COMMIT message
   → If not (too many Byzantine validators): block REJECTED
        │
        ▼
6. FINALITY:
   → Block appended to chain
   → All transactions marked 'confirmed' with blockNumber
   → Previous blocks get confirmation increment (sliding window of 7)
```

### 9.3 The Three Validators

| ID            | Name               | Role                          | Think of it as... |
| ------------- | ------------------ | ----------------------------- | ----------------- |
| `GOV-NODE-01` | Government Primary | Revenue Department            | The judge         |
| `REG-NODE-02` | Registry Office    | Sub-Registrar                 | The clerk         |
| `AUD-NODE-03` | Audit Authority    | Comptroller & Auditor General | The auditor       |

All three must be running. At least 2 must agree for any block to be accepted.

### 9.4 The Merkle Tree

Inside each block, all transaction hashes are combined into a tree:

```
If a block has 4 transactions with hashes H1, H2, H3, H4:

        MerkleRoot = SHA-256(AB + CD)
           /                    \
   AB = SHA-256(H1+H2)    CD = SHA-256(H3+H4)
     /       \               /       \
    H1       H2             H3       H4
    |        |              |        |
   TX1      TX2            TX3      TX4

If TX2 is tampered, H2 changes → AB changes → MerkleRoot changes
→ Block hash changes → NEXT block's previousHash doesn't match → CHAIN BROKEN
```

---

## Chapter 10: Encrypting Citizen Data (AES-256-GCM)

### 10.1 The Encryption Utility

`utils/encryption.js` provides these functions:

| Function                      | What It Does                                              |
| ----------------------------- | --------------------------------------------------------- |
| `encrypt(text)`               | Encrypts a string → returns `"ENC:iv:authTag:ciphertext"` |
| `decrypt(text)`               | Decrypts an `"ENC:..."` string → returns original text    |
| `generateIntegrityHash(data)` | Creates SHA-256 hash of sorted JSON data                  |
| `maskData(text, type)`        | Masks data for display: `"1234****5678"`                  |
| `generateBlockchainRef()`     | Generates a random blockchain reference ID                |

### 10.2 How Encrypt Works

```javascript
function encrypt(text) {
  const iv = crypto.randomBytes(16); // Random 16-byte IV (unique per encryption)
  const cipher = crypto.createCipheriv(
    "aes-256-gcm", // Algorithm
    Buffer.from(process.env.ENCRYPTION_KEY, "hex"), // 32-byte key from .env
    iv, // Initialisation vector
  );
  let encrypted = cipher.update(text, "utf8", "hex"); // Encrypt the text
  encrypted += cipher.final("hex"); // Finalise
  const authTag = cipher.getAuthTag().toString("hex"); // Get authentication tag (tamper detection)
  return `ENC:${iv.toString("hex")}:${authTag}:${encrypted}`;
}
```

**Why "ENC:" prefix?** So the `decrypt` function knows whether a value is encrypted or plain text. Legacy data without encryption passes through unchanged.

### 10.3 Two Encryption Layers Explained

**Layer 1 — IPFS Documents** (in `services/ipfsService.js`):

```
Property deed file (5 MB)
    → HKDF derives a KEY from "propertyId:ownerId" + government salt
    → AES-256-GCM encrypts the file with this key
    → Upload encrypted blob to IPFS
    → Store CID, IV, AuthTag in MongoDB
```

**Layer 2 — Database Fields** (in `utils/encryption.js`):

```
Aadhaar number: "1234-5678-9012"
    → AES-256-GCM encrypts with ENCRYPTION_KEY from .env + random IV
    → Stored in MongoDB as: "ENC:a1b2c3...:d4e5f6...:g7h8i9..."
    → Displayed to user as: "1234****9012" (masked)
```

---

## Chapter 11: IPFS — Storing Documents on a Decentralised Network

### 11.1 The IPFS Service

`services/ipfsService.js` (557 lines) handles:

1. **Key Derivation** — HKDF creates a unique encryption key per document
2. **Encryption** — AES-256-GCM encrypts the file before upload
3. **Upload** — Sends encrypted bytes to the local Kubo IPFS node
4. **Download** — Retrieves from IPFS, decrypts, verifies hash
5. **Retry** — If IPFS is down, files are queued for later upload

### 11.2 The Complete Upload Flow

```
1. User uploads "sale_deed.pdf" (2 MB)
        │
2. Read file into memory as Buffer
        │
3. SHA-256 hash the plaintext → store as documentHash (for later verification)
        │
4. HKDF Key Derivation:
   Salt = "SmartBhoomi_Gov_Salt_2026_SECURE"
   IKM  = "PROP-1234:USER-5678"  (propertyId + ownerId)
   Info = "SmartBhoomi-IPFS-Doc-Encryption"
   → Outputs a 32-byte (256-bit) key
   → Same inputs ALWAYS produce the same key (deterministic)
   → So the key doesn't need to be stored — it can be re-derived
        │
5. AES-256-GCM Encryption:
   → Generate random 16-byte IV
   → Encrypt the file buffer
   → Get 16-byte AuthTag (proves data wasn't tampered)
   → Prepend IV + AuthTag to ciphertext
   → Total overhead: exactly 32 bytes (regardless of file size)
        │
6. Upload to IPFS:
   → Connect to Kubo at http://localhost:5002
   → ipfs.add(encryptedBuffer, { pin: true })
   → Get back a CID: "bafybeig..."
        │
7. Save metadata to MongoDB:
   → property.documents[i].ipfsCID = "bafybeig..."
   → property.documents[i].ipfsIV = "a1b2c3..."
   → property.documents[i].ipfsAuthTag = "d4e5f6..."
   → property.documents[i].ipfsProvider = "private-kubo"
   → property.documents[i].ipfsStatus = "uploaded"
        │
8. Anchor on blockchain:
   → Submit DATA_ANCHOR transaction with CID + documentHash
```

### 11.3 The Download/Verification Flow

```
1. User requests to view their sale deed
        │
2. Retrieve CID, IV, AuthTag from MongoDB
        │
3. Fetch from IPFS: ipfs.cat(CID) → encrypted buffer
        │
4. Re-derive the HKDF key (same propertyId + ownerId → same key)
        │
5. Decrypt with AES-256-GCM using stored IV and AuthTag
   → If anyone tampered with the encrypted data, GCM detects it
   → Decryption fails with "authentication error"
        │
6. SHA-256 hash the decrypted file → compare with stored documentHash
   → If they match: document is INTACT
   → If they differ: document was TAMPERED (even if GCM somehow passed)
        │
7. Serve the decrypted file to the user's browser
```

---

## Chapter 12: The Spatial Engine — Haversine GPS Conflict Detection

### 12.1 The Problem with Flat-Earth Math

If you use simple distance formula (`sqrt((x2-x1)² + (y2-y1)²)`) with GPS coordinates, you get WRONG answers because:

- 1° latitude ≈ 111 km everywhere (roughly constant)
- 1° longitude ≈ 111 km × cos(latitude) — it SHRINKS as you go north

At Delhi (28.6°N): 1° longitude ≈ 97.8 km (not 111 km — **14% error!**)
At Srinagar (34.1°N): 1° longitude ≈ 92.2 km (**21% error!**)

### 12.2 The Two-Tier Detection System

**Tier 1 — MongoDB Fast Filter** (`utils/spatialConflict.js`):

```javascript
const candidates = await Property.find({
  location: {
    $nearSphere: {
      $geometry: { type: "Point", coordinates: [lng, lat] },
      $maxDistance: 100, // 100 metres
    },
  },
});
```

MongoDB uses a 2dsphere index (a special index for Earth-surface queries) to quickly find properties NEAR the given point. This is very fast but may include false positives.

**Tier 2 — Haversine Precise Check** (`utils/haversineDistance.js`):

```javascript
for (const candidate of candidates) {
  const distance = haversineDistance(lat, lng, candidate.lat, candidate.lng);
  if (distance < 100) {
    return { conflict: true, distanceMetres: distance };
  }
}
```

For each candidate from Tier 1, compute the EXACT geodesic distance. Only flag a conflict if it's truly < 100 metres.

### 12.3 The Result in the Registration Flow

If a conflict is detected at 49.94 m:

```json
{
  "conflict": true,
  "conflictingParcel": {
    "id": "PROP-1709472000000-B1C2D3E4",
    "title": "Rahul's Farm",
    "owner": "Rahul Sharma",
    "distance": 49.94
  },
  "overlapType": "MODERATE"
}
```

The property is NOT rejected — it's sent to the admin dashboard with a flag: "⚠️ Coordinate conflict: Another property exists 49.94m away." The admin reviews and decides.

---

## Chapter 13: The AI/ML Fraud Detection System

### 13.1 How It Works

A separate Python server (Flask, port 5050) runs a **Random Forest** machine learning model with 100 decision trees.

```
Node.js Backend                    Flask ML Server (port 5050)
      │                                    │
      ├─ POST /api/predict ──────────────>│
      │  { doc_count: 0,                  │
      │    has_ownership_deed: 0,          │
      │    has_sale_deed: 0,               │
      │    has_tax_receipt: 0,             │── Random Forest
      │    kyc_level: 0,                   │   100 trees
      │    coord_conflict: 1,              │   8 features
      │    valuation: 10000000,            │   3 classes
      │    hour: 2 }                       │
      │                                    │
      │<────────────────────────────────── │
      │  { risk_label: 'high',            │
      │    fraud_probability: 0.85,        │
      │    model_version: 'rf_v2.1' }     │
```

### 13.2 The Rule-Based Fallback

If the Flask server is down (network issue, not installed yet), the system falls back to simple rules:

```javascript
let score = 0.0;
if (docCount === 0) score += 0.4; // No documents = very suspicious
if (!hasOwnershipDeed) score += 0.15; // Missing critical document
if (kycLevel === "none") score += 0.2; // No KYC verification
if (coordinateConflict) score += 0.25; // Overlapping property
if (valuation > 10000000) score += 0.1; // High-value property

// score >= 0.7 → HIGH risk, score >= 0.3 → MEDIUM risk, else → LOW risk
```

This means the system NEVER fails — even without the ML server, fraud detection continues.

### 13.3 The Four Real-Time Anomaly Detectors

The Intelligence Controller (`controllers/intelligenceController.js`) runs 4 algorithms:

| Algorithm                     | What It Detects                                       | How                                        |
| ----------------------------- | ----------------------------------------------------- | ------------------------------------------ |
| **Rapid Registration**        | Someone registering 3+ properties in 24 hours         | Count properties per user per day          |
| **Coordinate Overlap**        | Two properties at same GPS location                   | Haversine distance < 100m                  |
| **High-Value Quick Transfer** | Expensive property sold within a week of registration | Check value > ₹1 Cr AND age < 7 days       |
| **Stale Pending**             | Property waiting for review for > 72 hours            | Check pending properties older than 3 days |

---

## Chapter 14: Biometric Authentication (FIDO2/WebAuthn)

### 14.1 What FIDO2 Actually Does

FIDO2 uses your device's built-in biometric sensor (fingerprint reader, Face ID, Windows Hello) to create a **cryptographic key pair**:

- **Private key** → stored INSIDE your device's secure chip (TPM/Secure Enclave) — NEVER leaves the device
- **Public key** → sent to the server and stored in the database

When you authenticate:

1. Server sends a random challenge
2. Your device asks for your fingerprint/face
3. If biometric matches, device SIGNS the challenge with the private key
4. Server VERIFIES the signature with the stored public key

**Why is this better than passwords?**

- The key is bound to your DEVICE + your BIOMETRIC — can't be phished
- The private key never leaves the device — can't be stolen from the server
- Each authentication increments a counter — replays detected

### 14.2 Liveness Detection

To prevent someone holding up a PHOTO of your face, SmartBhoomi adds liveness challenges:

The system randomly picks from 6 actions:

```
blink, turn_left, turn_right, nod_up, nod_down, smile
```

The camera checks that you perform the action in real-time. This prevents photo and video replay attacks.

### 14.3 Dual-Party Transfer Authentication

During a property transfer, BOTH buyer AND seller must pass biometric:

```
Step 3: BUYER opens camera → performs liveness challenge → scans fingerprint/face
        → Server verifies → status: "buyer_biometric_verified"

Step 5: SELLER opens camera → performs liveness challenge → scans fingerprint/face
        → Server verifies → status: "seller_biometric_confirmed"
```

This creates two independent cryptographic proofs. Neither party can later claim "I didn't agree to this transfer" — the biometric proof exists on the server with the signed challenge.

---

## Chapter 15: The Transfer System — Peer-to-Peer Ownership Change

### 15.1 The 6-Step Transfer Protocol

```
STEP 1: BUYER INITIATES
  → Buyer finds a property they want
  → Clicks "Request Transfer"
  → Enters proposed price
  → POST /api/transfers { propertyId, proposedPrice }
  → Status: "pending"
  → Audit log: "transfer_initiated"

STEP 2: OWNER APPROVES
  → Owner sees the request in their dashboard
  → Reviews buyer info and proposed price
  → Clicks "Approve" (or "Reject")
  → PUT /api/transfers/:id/owner-approve
  → Status: "owner_approved"
  → Property status changes to "transfer_pending"
  → Audit log: "property_locked"

STEP 3: BUYER BIOMETRIC VERIFICATION
  → Buyer opens the transfer page
  → Camera activates → liveness challenge (e.g., "blink twice")
  → Fingerprint or face scan
  → POST /api/transfers/:id/buyer-biometric
  → Status: "buyer_biometric_verified"
  → Audit log: "buyer_biometric_challenge", "buyer_biometric_verified"

STEP 4: PAYMENT
  → Buyer clicks "Pay Now"
  → Razorpay payment modal opens (credit card, UPI, net banking)
  → Payment processed
  → POST /api/transfers/:id/process-payment
  → Status: "payment_completed"
  → Audit log: "payment_initiated", "payment_completed"

STEP 5: SELLER BIOMETRIC CONFIRMATION
  → Seller opens the transfer page
  → Camera activates → different liveness challenge
  → Fingerprint or face scan
  → POST /api/transfers/:id/seller-confirm
  → Status: "seller_biometric_confirmed"
  → Audit log: "seller_biometric_challenge", "seller_biometric_confirmed"

STEP 6: AUTOMATIC EXECUTION
  → System automatically executes the transfer:
    a) Update property owner in MongoDB
    b) Add entry to ownershipHistory array
    c) Submit OWNERSHIP_TRANSFER transaction to blockchain
    d) PBFT consensus confirms
    e) Send email/SMS to both parties
  → Status: "completed"
  → Audit log: "ownership_transferred", "blockchain_recorded", "transfer_completed"
```

---

## Chapter 16: The Audit Trail — Tamper-Proof Transaction History

### 16.1 How Hash Chaining Works

Every audit entry contains:

```javascript
{
  step: "payment_completed",
  data: { amount: 5000000, currency: "INR", method: "UPI" },
  timestamp: 1709472000000,
  previousHash: "a1b2c3d4...",      // Hash of the PREVIOUS entry
  hash: SHA-256(previousHash + step + data + timestamp)
}
```

If someone changes the payment amount from ₹50,00,000 to ₹1:

- The DATA changes → the HASH of this entry changes
- But the NEXT entry has the OLD hash as its `previousHash`
- `nextEntry.previousHash ≠ tamperedEntry.hash` → **CHAIN BROKEN**
- The verification function pinpoints EXACTLY which entry was modified

### 16.2 The 15 Steps

The `AuditService.js` has a dedicated logging function for each step:

```
logTransferInitiated()       → "Buyer X requested transfer of property Y"
logPropertyLocked()          → "Property locked for transfer"
logBuyerKYCVerified()        → "Buyer KYC verified"
logBiometricChallenge()      → "Biometric challenge issued (type: blink)"
logBuyerBiometricVerified()  → "Buyer biometric verified (score: 98)"
logSellerBiometricConfirmed()→ "Seller biometric confirmed (score: 95)"
logPaymentInitiated()        → "Payment of ₹50,00,000 initiated via UPI"
logPaymentCompleted()        → "Payment completed (txId: pay_xxx)"
logOwnershipTransferred()    → "Ownership transferred from A to B"
logBlockchainRecorded()      → "Recorded on blockchain (block #42)"
logTransferCompleted()       → "Transfer completed successfully"
logTransferRejected()        → "Transfer rejected (reason: ...)"
logTransferCancelled()       → "Transfer cancelled by buyer"
logAnomaly()                 → "Anomaly detected: rapid transfer alert"
```

---

## Chapter 17: The Admin Portal — Government Command Centre

### 17.1 Admin Authentication

Admin login is COMPLETELY SEPARATE from citizen login:

| Feature       | Citizen Portal      | Admin Portal                         |
| ------------- | ------------------- | ------------------------------------ |
| Email allowed | Any email           | Only `@gov.in` or `@nic.in`          |
| JWT secret    | `JWT_SECRET`        | `JWT_SECRET + '_ADMIN_PORTAL'`       |
| Token expiry  | 24 hours            | 4 hours                              |
| MFA           | Optional biometric  | Required TOTP (Google Authenticator) |
| Password min  | 8 characters        | 12 characters                        |
| Account lock  | 5 failures / 30 min | 5 failures / 30 min                  |
| Clearance     | None                | Level 1-5 based on rank              |

### 17.2 Rank-Based Access Control

| Clearance Level | Ranks                             | Can Do                                      |
| --------------- | --------------------------------- | ------------------------------------------- |
| 5 (Highest)     | Secretary, Additional Secretary   | Create other admins, delete properties      |
| 4               | Joint Secretary, Commissioner     | Freeze properties, generate reports         |
| 3               | Director, Additional Commissioner | Approve/reject properties, resolve disputes |
| 2               | Deputy Director, Sub-Registrar    | Flag suspicious, upload documents           |
| 1 (Lowest)      | Assistant, Tehsildar              | View-only access                            |

The `requireClearance(minLevel)` middleware enforces this:

```javascript
router.delete(
  "/property/:id",
  protectAdmin,
  requireClearance(4),
  adminDeleteProperty,
);
// → Only Level 4+ (Joint Secretary and above) can delete a property
```

### 17.3 Admin Dashboard Features

The admin dashboard (`AdminDashboard.js`) is a single-page command centre with tabs:

| Tab                    | What It Shows                                             |
| ---------------------- | --------------------------------------------------------- |
| **Overview**           | Total properties, users, pending reviews, recent activity |
| **Pending Properties** | Properties awaiting admin review (approve/reject/flag)    |
| **All Properties**     | Complete property database with search and filters        |
| **Intel Hub**          | ML fraud alerts, anomaly detections, risk heatmap         |
| **Blockchain**         | Chain status, block explorer, validator health            |
| **IPFS Vault**         | Document storage stats, integrity verification            |
| **AI/ML Panel**        | Model performance, classification history                 |
| **India Map**          | Interactive map with property markers and heatmap overlay |
| **Announcements**      | Create/edit government announcements for citizens         |

---

## Chapter 18: Notifications — Email, SMS, WebSocket

### 18.1 Three Notification Channels

**Email** (`utils/emailService.js`):

- Uses Nodemailer with SMTP transport
- Sends: Registration welcome, property registered, transfer initiated, payment confirmed, transfer completed
- HTML email templates with government branding

**SMS** (`services/SMSService.js`):

- Uses Twilio API
- Sends: OTP codes, registration confirmation, transfer alerts
- Falls back gracefully if Twilio credentials not configured

**WebSocket** (`services/realtimeService.js`):

- Uses Socket.IO for real-time push events
- Events: `property:registered`, `transfer:updated`, `blockchain:block`, `intelligence:alert`
- Frontend listens and updates UI without page refresh

---

# PART 3: THE FRONTEND

---

## Chapter 19: React App Setup & Routing

### 19.1 How React Works (30-Second Version)

React breaks the UI into reusable **components**. Each component is a function that returns HTML-like code (JSX). When data changes, React efficiently updates only the parts of the page that need to change.

```
App.js                          ← Root component, defines all routes
  ├── LandingPage               ← / (public home page)
  ├── Login                     ← /login
  ├── Register                  ← /register
  ├── Dashboard                 ← /dashboard (protected — need login)
  ├── RegisterProperty          ← /register-property (protected)
  ├── PropertyList              ← /properties (protected)
  ├── PropertyDetails           ← /properties/:id (protected)
  ├── TransferRequests          ← /transfers (protected)
  ├── PaymentGateway            ← /payment/:requestId (protected)
  ├── KYCDashboard              ← /kyc (protected)
  ├── BlockExplorer             ← /block-explorer (protected)
  ├── CommandCenterDashboard    ← /command-center (protected)
  ├── Profile                   ← /profile (protected)
  ├── AdminLogin                ← /admin/login (separate auth)
  └── AdminDashboard            ← /admin/dashboard (admin protected)
```

### 19.2 Protected Routes

```javascript
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth(); // Check if user has a valid token
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Usage:
<Route
  path="/dashboard"
  element={
    <PrivateRoute>
      <Dashboard />
    </PrivateRoute>
  }
/>;
```

If you try to visit `/dashboard` without logging in, you're automatically redirected to `/login`.

### 19.3 Lazy Loading

All pages are loaded ON DEMAND (not all at once):

```javascript
const Dashboard = lazy(() => import("./pages/Dashboard"));
```

This means the Dashboard code is only downloaded when you actually navigate to it, making the initial page load faster.

---

## Chapter 20: Pages & Components — What the User Sees

### 20.1 Landing Page (`LandingPage.js`)

The first page visitors see. Contains:

- Hero section with animated graphics (Framer Motion)
- Feature highlights (blockchain, encryption, AI, spatial)
- Platform statistics (properties registered, transactions, etc.)
- Call-to-action buttons ("Get Started", "Learn More")

### 20.2 Dashboard (`Dashboard.js`)

After login, the user's home screen showing:

- Property count summary (total, verified, pending, in transfer)
- Recent activity timeline
- Quick action buttons (Register Property, View Transfers)
- Charts (property distribution by type, verification status — Recharts library)
- Blockchain identity card (QR code, blockchain ID)

### 20.3 Register Property (`RegisterProperty.js`)

Multi-step form:

1. **Property Details**: Title, description, type, area, survey/plot number
2. **Address**: Street, city, state, zip code
3. **GPS Coordinates**: Interactive map picker (Leaflet) — click on map to set coordinates
4. **Boundary Points**: Click map corners to define property boundary polygon
5. **Documents**: Upload ownership deed, sale deed, tax receipt (drag & drop)
6. **Valuation**: Current property value in INR
7. **Review & Submit**: Summary of all entered data

The map picker (`InteractiveMapPicker.js`) uses the Leaflet library to show an interactive map of India. Users click to place a marker at their property's location.

### 20.4 Property Details (`PropertyDetails.js`)

Deep view of a single property showing:

- All property details (title, type, address, area)
- Boundary map (Leaflet polygon overlay)
- Document list (with "View on IPFS" links)
- Blockchain hash and transaction ID
- Verification status with checklist
- Ownership history (all previous owners)
- Smart Identity Card (visual blockchain ID card)

### 20.5 Transfer Requests (`TransferRequests.js`)

Two-column layout:

- **Left**: Incoming requests (you are the seller)
- **Right**: Outgoing requests (you are the buyer)

Each request shows current status with a step indicator:

```
● Initiated → ● Owner Approved → ● Buyer Biometric → ● Payment → ● Seller Biometric → ● Completed
```

### 20.6 KYC Dashboard (`KYCDashboard.js`)

Identity verification page with three sections:

1. **Aadhaar Verification**: Enter Aadhaar number → OTP verification
2. **PAN Verification**: Enter PAN → automatic validation
3. **Face Enrollment**: Camera activates → capture face → face descriptor stored

KYC levels: `none` → `basic` (Aadhaar OR PAN) → `standard` (both) → `full` (both + face)

### 20.7 Block Explorer (`BlockExplorer.js`)

Visual blockchain browser:

- Chain statistics (block height, total transactions, validators)
- Block list (click to expand and see transactions)
- Transaction search by hash
- Validator status (online/offline, blocks produced, uptime)

---

## Chapter 21: Context Providers — Sharing State Across Pages

### 21.1 What is React Context?

Context is like a "global variable" for React components. Instead of passing data from parent to child to grandchild (called "prop drilling"), you wrap your app in a Provider and any component can access the data.

### 21.2 AuthContext (`context/AuthContext.js`)

**What it provides:**

- `user` — Current logged-in user's data
- `token` — JWT token
- `isAuthenticated` — Boolean: is the user logged in?
- `loading` — Boolean: still checking auth status?
- `login(email, password)` — Login function
- `logout()` — Clear token and redirect
- `loginWithOtp(userId, otp)` — OTP-based login
- `nomineeLogin(...)` — Nominee access login

**How it works:**

```javascript
// Any component can do this:
const { user, isAuthenticated, login, logout } = useAuth();

// To check if logged in:
if (isAuthenticated) {
  /* show dashboard */
}

// To login:
await login("rahul@gmail.com", "password123");

// To logout:
logout(); // Clears localStorage, redirects to /login
```

### 21.3 BlockchainContext (`context/BlockchainContext.js`)

Connects to the Socket.IO WebSocket and provides live blockchain data:

- Current block height
- Live transaction feed
- Validator statuses
- Network health metrics

### 21.4 IntelligenceContext (`context/IntelligenceContext.js`)

Provides fraud intelligence data:

- Active alerts count
- Recent anomalies
- Risk distribution charts

---

## Chapter 22: The Admin Dashboard — Government Interface

### 22.1 Separate Authentication

Admin login uses a completely different system:

- `AdminAuthContext.js` — separate from citizen `AuthContext.js`
- `adminApi.js` — separate API client
- Different JWT secret, shorter expiry (4 hours)
- TOTP MFA required after password

### 22.2 Dashboard Components

| Component        | File                      | Purpose                                                        |
| ---------------- | ------------------------- | -------------------------------------------------------------- |
| AI/ML Panel      | `AIMLPanel.js`            | View ML model predictions, retrain, see classification history |
| IPFS Panel       | `IPFSAdminPanel.js`       | View uploaded documents, check integrity, re-upload failed     |
| Blockchain Panel | `BlockchainAdminPanel.js` | Chain health, validator stats, block production rate           |
| Intel Hub        | `IntelHub.js`             | Anomaly alerts, fraud investigations, risk heatmap             |
| India Map        | `InteractiveIndiaMap.js`  | All properties plotted on map with filters                     |
| Admin ID Card    | `AdminSmartIDCard.js`     | Admin's government ID card with QR                             |

---

# PART 4: RUNNING THE SYSTEM

---

## Chapter 23: Environment Variables (.env file)

Create a `.env` file in the project root with these variables:

```bash
# ═══════════════════════════════════════
# SERVER
# ═══════════════════════════════════════
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:3001

# ═══════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════
MONGODB_URI=mongodb://localhost:27017/property_registry

# ═══════════════════════════════════════
# AUTHENTICATION
# ═══════════════════════════════════════
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=24h
ADMIN_JWT_SECRET=your_admin_jwt_secret_different_from_above

# ═══════════════════════════════════════
# ENCRYPTION
# ═══════════════════════════════════════
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2

# ═══════════════════════════════════════
# IPFS
# ═══════════════════════════════════════
IPFS_MODE=private
IPFS_PRIVATE_API=http://localhost:5002
IPFS_PRIVATE_GATEWAY=http://localhost:8080

# ═══════════════════════════════════════
# EMAIL (Nodemailer)
# ═══════════════════════════════════════
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# ═══════════════════════════════════════
# SMS (Twilio) — Optional
# ═══════════════════════════════════════
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE=+1234567890

# ═══════════════════════════════════════
# PAYMENTS (Razorpay) — Optional
# ═══════════════════════════════════════
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

# ═══════════════════════════════════════
# WEBAUTHN (Biometric)
# ═══════════════════════════════════════
WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_NAME=SmartBhoomi Land Registry
WEBAUTHN_ORIGIN=http://localhost:3001
```

---

## Chapter 24: Starting Everything Up

### Step-by-Step Launch Sequence

```bash
# ═══════════════════════════════════════
# TERMINAL 1: Start MongoDB
# ═══════════════════════════════════════
# macOS:
brew services start mongodb-community@7.0

# Linux:
sudo systemctl start mongod

# Verify:
mongosh --eval "db.version()"


# ═══════════════════════════════════════
# TERMINAL 2: Start IPFS (Docker)
# ═══════════════════════════════════════
docker start ipfs_node
# Or if first time:
docker run -d --name ipfs_node -p 5002:5001 -p 8080:8080 ipfs/kubo:latest

# Verify:
curl http://localhost:5002/api/v0/version


# ═══════════════════════════════════════
# TERMINAL 3: Start Backend Server
# ═══════════════════════════════════════
cd /path/to/SmartBhoomi
npm install              # First time only — installs dependencies
node server.js           # Or: npm run dev (auto-restarts on file changes)

# You should see:
# ✅ MongoDB Connected: localhost
# ⛓️  Smart Bhoomi National Land Infrastructure
#    Port: 5001
#    Blockchain: Bharat Land Chain (Sovereign)


# ═══════════════════════════════════════
# TERMINAL 4: Start Frontend
# ═══════════════════════════════════════
cd /path/to/SmartBhoomi/client
npm install              # First time only
npm start                # Starts React dev server on port 3001

# Browser automatically opens: http://localhost:3001


# ═══════════════════════════════════════
# TERMINAL 5 (Optional): Start ML Service
# ═══════════════════════════════════════
cd /path/to/ml-service
pip install flask scikit-learn numpy
python app.py            # Starts on port 5050
```

### 24.1 Seeding Initial Data

Create the first admin account:

```bash
node seed-admin.js
# Creates: admin@gov.in / password (clearance level 5)
```

### 24.2 Verifying Everything Works

1. **Health Check**: Visit `http://localhost:5001/api/health`

   ```json
   {
     "success": true,
     "services": {
       "database": "connected",
       "blockchain": {
         "network": "Bharat Land Chain",
         "consensus": "PBFT",
         "status": "operational"
       },
       "websocket": "active"
     }
   }
   ```

2. **Frontend**: Visit `http://localhost:3001` — should see the Landing Page

3. **Admin**: Visit `http://localhost:3001/admin/login` — login with seeded admin credentials

---

## Chapter 25: Testing the System

### 25.1 The Evaluation Suite

SmartBhoomi includes a comprehensive 25-test evaluation suite:

```bash
node run-extended-tests.js
```

This runs all 25 tests across 8 categories:

- **Blockchain** (7 tests): throughput, integrity, BFT, validators, Merkle, on-chain verification, gas
- **Cryptography** (5 tests): AES-256-GCM, HKDF, SHA-256, field encryption, key isolation
- **Spatial** (3 tests): Haversine accuracy, latitude error analysis, conflict detection
- **AI/ML** (2 tests): risk classification, anomaly detection
- **IPFS** (2 tests): encryption pipeline, tamper detection
- **Auth** (3 tests): JWT isolation, admin security, FIDO2 analysis
- **Audit** (2 tests): hash-chain verification, 15-step coverage
- **Solidity** (1 test): smart contract structural analysis

Expected output: **25/25 PASSED**

### 25.2 Manual Testing Walkthrough

**Test 1: Register a citizen**

1. Go to `http://localhost:3001/register`
2. Fill in: Name, Email, Password, Phone, Government ID
3. Click "Register"
4. Should receive a blockchain ID and QR code

**Test 2: Register a property**

1. Login → Go to "Register Property"
2. Fill in title, description, type, address
3. Click on map to set GPS coordinates
4. Upload at least 3 documents (ownership deed, sale deed, tax receipt)
5. Submit → Should see "Property registered and auto-verified!"

**Test 3: Check spatial conflict**

1. Register another property with GPS very close to the first one (< 100m)
2. Should see a warning: "Coordinate conflict detected"
3. Property should go to "needs_review" status

**Test 4: Admin approval**

1. Go to `http://localhost:3001/admin/login`
2. Login with admin credentials
3. Go to "Pending Properties" tab
4. Review the flagged property → Click "Approve" or "Reject"

**Test 5: Property transfer**

1. Register a second user (the buyer)
2. Buyer searches for the property
3. Buyer clicks "Request Transfer" → enters price
4. Seller approves the transfer
5. Both parties complete biometric verification
6. Buyer makes payment
7. Transfer completes automatically

---

## Chapter 26: Common Errors and How to Fix Them

| Error                           | Cause                                          | Fix                                                                                  |
| ------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| `ECONNREFUSED 127.0.0.1:27017`  | MongoDB not running                            | Start MongoDB: `brew services start mongodb-community@7.0`                           |
| `ECONNREFUSED 127.0.0.1:5002`   | IPFS Docker container not running              | Start Docker: `docker start ipfs_node`                                               |
| `JWT_SECRET is not defined`     | Missing .env file                              | Create `.env` file with all variables (Chapter 23)                                   |
| `ENCRYPTION_KEY is not defined` | Missing encryption key in .env                 | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `Port 5001 already in use`      | Another process using the port                 | Kill it: `lsof -ti:5001 \| xargs kill -9`                                            |
| `Port 3001 already in use`      | Another React dev server running               | Kill it: `lsof -ti:3001 \| xargs kill -9`                                            |
| `Module not found: 'xyz'`       | Missing npm dependency                         | Run `npm install` in the project root                                                |
| `Cannot read property of null`  | User not logged in / token expired             | Clear localStorage and re-login                                                      |
| `Proxy error: ECONNREFUSED`     | Backend not running (frontend can't reach API) | Start backend: `node server.js`                                                      |
| `2dsphere index not found`      | First property registration needs index        | Register a property — index auto-created by Mongoose                                 |

---

# APPENDICES

---

## Appendix A: Complete File Map (Every File Explained)

| File                                    | Lines | Purpose                                                        |
| --------------------------------------- | ----: | -------------------------------------------------------------- |
| `server.js`                             |   181 | Express app creation, middleware, route mounting, startup      |
| `config/database.js`                    |    32 | MongoDB connection using Mongoose                              |
| `models/User.js`                        |   284 | Citizen data schema (KYC, biometric, blockchain ID)            |
| `models/Admin.js`                       |   256 | Government officer schema (rank, clearance, MFA)               |
| `models/Property.js`                    |   272 | Property schema (details, documents, IPFS, GeoJSON, integrity) |
| `models/TransferRequest.js`             |   150 | Transfer schema (status lifecycle, biometric proofs, payment)  |
| `models/AuditLog.js`                    |   150 | Hash-chained audit entries                                     |
| `models/Notification.js`                |   ~50 | Notification records                                           |
| `models/Announcement.js`                |   ~80 | Government announcements                                       |
| `routes/auth.js`                        |    63 | Auth URL definitions (register, login, biometric, nominee)     |
| `routes/property.js`                    |   129 | Property URL definitions (CRUD, spatial check, map data)       |
| `routes/transfer.js`                    |    53 | Transfer URL definitions (create, approve, biometric, pay)     |
| `routes/admin.js`                       |   100 | Admin URL definitions (login, review, manage, reports)         |
| `routes/blockchain.js`                  |   ~30 | Blockchain explorer URLs                                       |
| `routes/kyc.js`                         |   ~40 | KYC verification URLs                                          |
| `routes/intelligence.js`                |   ~30 | Intelligence/ML URLs                                           |
| `routes/notification.js`                |   ~20 | Notification URLs                                              |
| `controllers/authController.js`         | 1,204 | Full auth logic (register, login, WebAuthn, OTP, nominee)      |
| `controllers/propertyController.js`     |   617 | Property registration + auto-verification pipeline             |
| `controllers/transferController.js`     |  ~500 | 6-step transfer lifecycle                                      |
| `controllers/adminController.js`        |  ~800 | All admin operations                                           |
| `controllers/kycController.js`          |  ~300 | Aadhaar/PAN/face verification                                  |
| `controllers/intelligenceController.js` |  ~200 | ML fraud classification + anomaly detection                    |
| `middleware/auth.js`                    |    68 | Citizen JWT protection                                         |
| `middleware/adminAuth.js`               |   121 | Admin JWT protection (separate secret) + dual-auth             |
| `middleware/security.js`                |    68 | Rate limiting + input validation rules                         |
| `blockchain/SovereignChain.js`          |   737 | Core blockchain engine (Block, TX, Validator, Chain)           |
| `blockchain/BlockchainService.js`       |   292 | Blockchain API wrapper                                         |
| `blockchain/PropertyRegistry.sol`       |   215 | Solidity smart contract reference                              |
| `services/ipfsService.js`               |   557 | HKDF + AES-256-GCM encryption + IPFS upload/download           |
| `services/AuditService.js`              |   204 | 15-step hash-chained audit logging                             |
| `services/BiometricService.js`          |  ~150 | WebAuthn/FIDO2 helpers                                         |
| `services/eKYCService.js`               |  ~200 | Aadhaar/PAN simulation                                         |
| `services/MLService.js`                 |  ~100 | Flask ML service client                                        |
| `services/SMSService.js`                |   ~80 | Twilio SMS wrapper                                             |
| `services/realtimeService.js`           |  ~100 | Socket.IO WebSocket events                                     |
| `utils/encryption.js`                   |  ~120 | AES-256-GCM encrypt/decrypt/hash/mask                          |
| `utils/haversineDistance.js`            |   ~30 | Haversine geodesic formula                                     |
| `utils/spatialConflict.js`              |   157 | 2-tier spatial conflict detection                              |
| `utils/emailService.js`                 |  ~200 | Nodemailer email templates                                     |
| `utils/fileUpload.js`                   |   ~50 | Multer file upload config                                      |
| `utils/paymentService.js`               |  ~100 | Razorpay payment helpers                                       |
| `client/src/App.js`                     |   154 | React root — all routes and providers                          |
| `client/src/services/api.js`            |   173 | Axios HTTP client with auth interceptor                        |
| `client/src/context/AuthContext.js`     |   138 | Login/logout state management                                  |
| `run-extended-tests.js`                 | 1,678 | 25-test comprehensive evaluation suite                         |

---

## Appendix B: Complete API Reference

### Authentication (`/api/auth`)

| Method | Endpoint                           | Auth    | Description                     |
| ------ | ---------------------------------- | ------- | ------------------------------- |
| POST   | `/register`                        | Public  | Create citizen account          |
| POST   | `/login`                           | Public  | Login with email + password     |
| POST   | `/send-email-otp`                  | Public  | Request OTP login               |
| POST   | `/verify-email-otp`                | Public  | Verify OTP and get token        |
| POST   | `/verify-biometric`                | Public  | Initiate biometric verification |
| POST   | `/complete-biometric-login`        | Public  | Complete biometric login        |
| POST   | `/skip-biometric-step`             | Public  | Skip biometric (fallback)       |
| POST   | `/nominee-login`                   | Public  | Login as nominee                |
| GET    | `/profile`                         | 🔒 User | Get user profile                |
| PUT    | `/profile`                         | 🔒 User | Update user profile             |
| POST   | `/verify-transfer-face`            | 🔒 User | Face verification for transfers |
| POST   | `/setup-nominee`                   | 🔒 User | Set up nominee access           |
| POST   | `/biometric/re-enroll/request-otp` | 🔒 User | Request re-enrollment OTP       |
| POST   | `/biometric/re-enroll/face`        | 🔒 User | Re-enroll face biometric        |
| POST   | `/biometric/re-enroll/fingerprint` | 🔒 User | Re-enroll fingerprint           |

### Properties (`/api/properties`)

| Method | Endpoint           | Auth    | Description                 |
| ------ | ------------------ | ------- | --------------------------- |
| POST   | `/`                | 🔒 User | Register new property       |
| GET    | `/`                | 🔒 User | List all properties         |
| GET    | `/my`              | 🔒 User | List user's properties      |
| GET    | `/:id`             | 🔒 User | Get property details        |
| PUT    | `/:id`             | 🔒 User | Update property             |
| GET    | `/check-conflict`  | 🔒 User | Check GPS spatial conflict  |
| GET    | `/all-with-coords` | 🔒 User | Get all properties with GPS |
| GET    | `/:id/history`     | 🔒 User | Get ownership history       |

### Transfers (`/api/transfers`)

| Method | Endpoint                      | Auth    | Description                   |
| ------ | ----------------------------- | ------- | ----------------------------- |
| POST   | `/`                           | 🔒 User | Create transfer request       |
| GET    | `/`                           | 🔒 User | List all transfer requests    |
| GET    | `/:requestId`                 | 🔒 User | Get transfer details          |
| PUT    | `/:requestId/owner-approve`   | 🔒 User | Owner approves transfer       |
| POST   | `/:requestId/buyer-biometric` | 🔒 User | Buyer biometric verification  |
| POST   | `/:requestId/seller-confirm`  | 🔒 User | Seller biometric confirmation |
| POST   | `/:requestId/process-payment` | 🔒 User | Process payment               |
| GET    | `/:requestId/audit-trail`     | 🔒 User | View audit trail              |
| GET    | `/:requestId/verify-audit`    | 🔒 User | Verify audit chain integrity  |

### Admin (`/api/admin`)

| Method | Endpoint                | Auth         | Description                      |
| ------ | ----------------------- | ------------ | -------------------------------- |
| POST   | `/login`                | Public       | Admin login                      |
| POST   | `/verify-mfa`           | Public       | Verify TOTP MFA code             |
| GET    | `/profile`              | 🔒 Admin     | Admin profile                    |
| GET    | `/dashboard-stats`      | 🔒 Admin     | Dashboard statistics             |
| GET    | `/pending-properties`   | 🔒 Admin     | Properties needing review        |
| PUT    | `/approve-property/:id` | 🔒 Admin     | Approve a property               |
| PUT    | `/reject-property/:id`  | 🔒 Admin     | Reject a property                |
| GET    | `/all-properties`       | 🔒 Admin     | All properties                   |
| DELETE | `/property/:id`         | 🔒 Admin L4+ | Delete property (high clearance) |
| PUT    | `/freeze-property/:id`  | 🔒 Admin L2+ | Freeze property                  |
| GET    | `/audit-trail/:id`      | 🔒 Admin     | View property audit trail        |
| POST   | `/create-admin`         | 🔒 Admin L5  | Create new admin (super admin)   |

---

## Appendix C: Database Schema Reference

### Users Collection

```
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique, lowercase),
  password: String (required, bcrypt hashed, min 8 chars),
  role: "property_owner" | "buyer" | "seller",
  phoneNumber: String (required),
  governmentId: String (required, unique),
  governmentIdEncrypted: String (AES-256-GCM),
  governmentIdMasked: String (e.g., "ABCD****EFGH"),
  kycStatus: {
    aadhaarVerified: Boolean,
    panVerified: Boolean,
    faceEnrolled: Boolean,
    kycLevel: "none" | "basic" | "standard" | "full"
  },
  biometricCredentials: [{ credentialId, publicKey, counter }],
  blockchainId: String (e.g., "BID-12345"),
  loginAttempts: Number,
  lockUntil: Date,
  createdAt: Date
}
```

### Properties Collection

```
{
  _id: ObjectId,
  propertyId: String (e.g., "PROP-1709472000000-A3F2B1C4"),
  blockchainHash: String (SHA-256, 64 hex chars),
  blockchainTransactionId: String,
  owner: ObjectId → Users,
  propertyDetails: {
    title: String,
    description: String,
    propertyType: "residential" | "commercial" | "agricultural" | "industrial" | "land",
    area: { value: Number, unit: "sqft" | "sqm" | "acre" | "hectare" },
    address: { street, city, state, zipCode, country },
    coordinates: { latitude: Number, longitude: Number },
    boundary: [{ latitude, longitude }]
  },
  documents: [{
    documentType: "ownership_deed" | "sale_deed" | "tax_receipt" | ...,
    documentHash: String (SHA-256),
    ipfsCID: String,
    ipfsIV: String,
    ipfsAuthTag: String,
    ipfsStatus: "uploaded" | "pending_ipfs_upload" | "failed"
  }],
  verification: {
    status: "pending" | "verified" | "rejected" | "needs_review",
    checks: { documentHashValid, ownerKycVerified, duplicateCheck, ... },
    coordinateConflictWith: String
  },
  location: { type: "Point", coordinates: [longitude, latitude] },
  ownershipHistory: [{ previousOwner, newOwner, transferDate, transferHash }],
  dataIntegrityHash: String (SHA-256),
  createdAt: Date
}
```

### TransferRequests Collection

```
{
  _id: ObjectId,
  requestId: String,
  property: ObjectId → Properties,
  currentOwner: ObjectId → Users,
  buyer: ObjectId → Users,
  proposedPrice: Number,
  status: "pending" | "owner_approved" | "buyer_biometric_verified" |
          "payment_completed" | "seller_biometric_confirmed" | "completed" |
          "cancelled" | "disputed",
  buyerBiometric: { verified, method, biometricScore, livenessScore },
  sellerBiometric: { confirmed, method, biometricScore, livenessScore },
  payment: { orderId, paymentId, amount, method, status },
  auditChainHead: String (hash of latest audit entry),
  blockchainTransactionHash: String,
  createdAt: Date
}
```

---

## Appendix D: Glossary of Technical Terms

| Term               | Simple Explanation                                                            |
| ------------------ | ----------------------------------------------------------------------------- |
| **API**            | A set of URLs that the frontend uses to talk to the backend                   |
| **AES-256-GCM**    | A military-grade encryption algorithm that also detects tampering             |
| **Blockchain**     | A chain of blocks where each block references the previous one — tamper-proof |
| **CORS**           | A security rule that controls which websites can talk to your server          |
| **CID**            | Content Identifier — IPFS's address for a file, based on its content          |
| **Express.js**     | A Node.js framework for building web servers                                  |
| **FIDO2/WebAuthn** | A standard for using biometrics (fingerprint/face) instead of passwords       |
| **GCM**            | Galois/Counter Mode — an encryption mode that adds tamper detection           |
| **GeoJSON**        | A format for representing geographic shapes (points, polygons)                |
| **Haversine**      | A formula for calculating distance on a sphere (Earth)                        |
| **HKDF**           | A way to derive encryption keys from a master input — no key storage needed   |
| **Helmet**         | A middleware that adds security headers to HTTP responses                     |
| **HMAC**           | Hash-based Message Authentication Code — proves data wasn't changed           |
| **IPFS**           | InterPlanetary File System — decentralised file storage                       |
| **JWT**            | JSON Web Token — a signed token that proves you are logged in                 |
| **KYC**            | Know Your Customer — verifying someone's identity with government documents   |
| **Kubo**           | The Go implementation of IPFS (the actual program that runs IPFS)             |
| **Merkle Tree**    | A hash tree that can verify any single piece of data belongs to a set         |
| **Middleware**     | Code that runs between receiving a request and sending a response             |
| **MongoDB**        | A NoSQL database that stores data as JSON-like documents                      |
| **Mongoose**       | A library that adds structure (schemas) to MongoDB                            |
| **MFA/TOTP**       | Multi-Factor Authentication / Time-based One-Time Password                    |
| **Node.js**        | A runtime that lets you run JavaScript on a server (not just browsers)        |
| **PBFT**           | Practical Byzantine Fault Tolerance — a consensus algorithm                   |
| **React**          | A JavaScript library for building user interfaces                             |
| **REST**           | Representational State Transfer — a style for designing APIs                  |
| **Socket.IO**      | A library for real-time, bidirectional communication                          |
| **SHA-256**        | A hash function that turns any data into a fixed 64-character fingerprint     |
| **Solidity**       | A programming language for Ethereum smart contracts                           |
| **2dsphere**       | A MongoDB index type for geographic (Earth-surface) queries                   |
| **WebSocket**      | A persistent connection between browser and server for real-time data         |

---

_This guide was written to accompany SmartBhoomi v1.0. For the IEEE research paper with empirical results and performance data, see `SMARTBHOOMI_IEEE_RESEARCH_PAPER.md`._
