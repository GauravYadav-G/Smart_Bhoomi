# 🔗 VALIDATOR NODE SETUP GUIDE

## Bharat Land Chain — Sovereign Blockchain Network

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Network Configuration](#network-configuration)
5. [Validator Node Installation](#validator-node-installation)
6. [Node Registration](#node-registration)
7. [Consensus Participation](#consensus-participation)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Security Best Practices](#security-best-practices)
10. [Troubleshooting](#troubleshooting)

---

## 🌐 OVERVIEW

The **Bharat Land Chain** is a sovereign, permissioned blockchain network designed specifically for India's land registry system. It uses **Proof-of-Authority (PoA)** consensus with **PBFT (Practical Byzantine Fault Tolerance)** finality.

### Key Characteristics

- **Consensus Algorithm**: PoA-PBFT (Proof-of-Authority with Byzantine Fault Tolerance)
- **Block Time**: 2 seconds
- **Finality**: Deterministic (no forks)
- **Network Type**: Permissioned (Government-controlled)
- **Chain ID**: `BHARAT-LAND-CHAIN-001`
- **Network Name**: Bharat Land Registry Network

### Validator Roles

Validator nodes can have different roles:

- **Government Validators**: Primary consensus nodes operated by government departments
- **Registry Office Validators**: Regional registry office nodes
- **Audit Validators**: Independent audit nodes for transparency

---

## 🏗️ ARCHITECTURE

### Network Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    Bharat Land Chain Network                 │
│                                                               │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│   │  Government │    │  Government │    │  Government │    │
│   │ Validator 1 │◄──►│ Validator 2 │◄──►│ Validator 3 │    │
│   │   (Delhi)   │    │  (Mumbai)   │    │ (Bangalore) │    │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    │
│          │                   │                   │           │
│          └───────────────────┼───────────────────┘           │
│                              │                               │
│        ┌────────────────────┴────────────────────┐          │
│        │                                          │          │
│   ┌────▼────┐  ┌─────────┐  ┌─────────┐  ┌──────▼─────┐   │
│   │ Registry│  │ Registry│  │  Audit  │  │   Backup   │   │
│   │  Node 1 │  │  Node 2 │  │  Node   │  │    Node    │   │
│   └─────────┘  └─────────┘  └─────────┘  └────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Consensus Flow

1. **Transaction Submission**: User submits property transaction
2. **Transaction Pool**: Transaction enters mempool
3. **Block Proposal**: Current validator proposes new block
4. **PBFT Consensus**: 2/3 validators approve block
5. **Block Finalization**: Block permanently added to chain
6. **Broadcast**: New block distributed to all nodes

---

## 📦 PREREQUISITES

### System Requirements

#### Minimum Specifications

- **CPU**: 4 cores (Intel Xeon or AMD EPYC)
- **RAM**: 8 GB
- **Storage**: 100 GB SSD (NVMe recommended)
- **Network**: 100 Mbps dedicated connection
- **OS**: Ubuntu 20.04 LTS or later / Red Hat Enterprise Linux 8+

#### Recommended Specifications

- **CPU**: 8 cores (Intel Xeon Gold or AMD EPYC 7002+)
- **RAM**: 16 GB
- **Storage**: 500 GB NVMe SSD (RAID 1 recommended)
- **Network**: 1 Gbps dedicated connection with redundancy
- **OS**: Ubuntu 22.04 LTS

### Software Dependencies

```bash
# Node.js (v18.x or higher)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# MongoDB (v6.x or higher)
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Git
sudo apt-get install -y git

# Build tools
sudo apt-get install -y build-essential python3

# PM2 (Process Manager)
sudo npm install -g pm2
```

### Network Requirements

- **Open Ports**:
  - `5001`: REST API & WebSocket
  - `3000`: Admin Dashboard (optional, internal only)
  - `27017`: MongoDB (internal only, firewall protected)
- **Firewall Configuration**:
  ```bash
  sudo ufw allow 5001/tcp
  sudo ufw allow from <internal_network> to any port 27017
  sudo ufw enable
  ```

---

## 🔧 NETWORK CONFIGURATION

### 1. Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/bharat-land-chain
cd /opt/bharat-land-chain

# Clone the repository
git clone <repository-url> .

# Install dependencies
npm install
cd client && npm install && cd ..
```

### 2. Environment Configuration

Create `.env` file in the root directory:

```bash
# ─── NETWORK CONFIGURATION ───
NODE_ENV=production
PORT=5001
CLIENT_URL=https://your-domain.gov.in

# ─── BLOCKCHAIN CONFIGURATION ───
CHAIN_ID=BHARAT-LAND-CHAIN-001
NETWORK_NAME=Bharat Land Registry Network
BLOCK_TIME=2000
MAX_TRANSACTIONS_PER_BLOCK=100

# ─── VALIDATOR CONFIGURATION ───
VALIDATOR_ID=validator-001
VALIDATOR_NAME=Primary Node (Delhi)
VALIDATOR_ROLE=government
VALIDATOR_PUBLIC_KEY=<generate-unique-key>

# ─── DATABASE CONFIGURATION ───
MONGODB_URI=mongodb://localhost:27017/bharat_land_chain
MONGODB_USER=chaindb_admin
MONGODB_PASSWORD=<secure-password>

# ─── CONSENSUS CONFIGURATION ───
REQUIRED_VALIDATORS=3
CONSENSUS_TIMEOUT=5000
PBFT_THRESHOLD=0.67

# ─── PEER NODES (other validators) ───
PEER_NODE_1=https://validator-1.gov.in:5001
PEER_NODE_2=https://validator-2.gov.in:5001
PEER_NODE_3=https://validator-3.gov.in:5001

# ─── SECURITY ───
JWT_SECRET=<generate-strong-secret>
JWT_EXPIRE=7d
ENCRYPTION_KEY=<generate-32-byte-key>

# ─── MONITORING ───
LOG_LEVEL=info
METRICS_ENABLED=true
ALERT_EMAIL=admin@gov.in
```

### 3. Generate Validator Keys

```bash
# Generate unique validator key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add the generated key to `.env` as `VALIDATOR_PUBLIC_KEY`.

---

## 🚀 VALIDATOR NODE INSTALLATION

### Step 1: Database Setup

```bash
# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Create database and user
mongosh <<EOF
use bharat_land_chain
db.createUser({
  user: "chaindb_admin",
  pwd: "<secure-password>",
  roles: [{ role: "readWrite", db: "bharat_land_chain" }]
})
EOF
```

### Step 2: Initialize Blockchain

Edit `blockchain/SovereignChain.js` to add your validator:

```javascript
// In the constructor, add your validator node
this.addValidator(
  process.env.VALIDATOR_ID || "validator-001",
  process.env.VALIDATOR_NAME || "Primary Node",
  process.env.VALIDATOR_ROLE || "government",
);
```

### Step 3: Configure Peer Discovery

Edit `services/realtimeService.js` to add peer node connections:

```javascript
// Add peer node WebSocket connections
const peerNodes = [
  process.env.PEER_NODE_1,
  process.env.PEER_NODE_2,
  process.env.PEER_NODE_3,
].filter(Boolean);

peerNodes.forEach((peer) => {
  connectToPeer(peer);
});
```

### Step 4: Build Application

```bash
# Build frontend
cd client
npm run build
cd ..

# Test the build
node server.js
```

If successful, you should see:

```
⛓️  ═══════════════════════════════════════════
   BHARAT LAND CHAIN — Sovereign Network
   Chain ID: BHARAT-LAND-CHAIN-001
   Consensus: PoA-PBFT
   Block Time: 2s
   Genesis Block: 3a58c25b42ef361e...
⛓️  ═══════════════════════════════════════════

✅ MongoDB Connected: localhost
⛓️  Blockchain network STARTED — producing blocks
🔌 WebSocket real-time event system initialized
```

### Step 5: Production Deployment

```bash
# Use PM2 for process management
pm2 start server.js --name bharat-land-chain
pm2 save
pm2 startup

# Enable auto-restart on crash
pm2 set pm2:autodump true
```

---

## 📝 NODE REGISTRATION

### Register with Network Coordinator

1. **Submit Node Registration Request**
   - Email: blockchain-admin@gov.in
   - Subject: Validator Node Registration Request
   - Include:
     - Organization name
     - Validator ID
     - Public key
     - Node location (city)
     - Role (government/registry/audit)
     - Contact information
     - Server specifications

2. **Await Approval**
   - Network coordinator reviews application
   - Security audit of infrastructure
   - Approval typically within 3-5 business days

3. **Receive Network Credentials**
   - Peer node addresses
   - Network access tokens
   - Consensus configuration

4. **Join Consensus**
   - Update `.env` with approved configuration
   - Restart node with `pm2 restart bharat-land-chain`
   - Monitor logs: `pm2 logs bharat-land-chain`

### Verify Node Registration

```bash
# Check validator status
curl -X GET http://localhost:5001/api/blockchain/validators

# Check network status
curl -X GET http://localhost:5001/api/blockchain/network-status

# Your validator should appear in the list with isActive: true
```

---

## 🔄 CONSENSUS PARTICIPATION

### Understanding PoA-PBFT Consensus

#### Block Production Cycle

1. **Round-Robin Scheduling**: Validators take turns proposing blocks
2. **Block Proposal**: Current validator collects pending transactions
3. **Pre-Prepare Phase**: Proposed block sent to all validators
4. **Prepare Phase**: Validators validate and broadcast approval
5. **Commit Phase**: Once 2/3 validators agree, block is committed
6. **Finalization**: Block permanently added, no possibility of revert

#### Validator Responsibilities

- **Maintain 99%+ uptime**
- **Validate all incoming transactions**
- **Participate in consensus voting**
- **Store complete blockchain history**
- **Broadcast new blocks to peers**
- **Report suspicious activity**

### Monitor Consensus Participation

```bash
# View real-time blockchain activity
pm2 logs bharat-land-chain --lines 100

# Check validator statistics
curl -X GET http://localhost:5001/api/blockchain/validators/<your-validator-id>
```

Expected output:

```json
{
  "id": "validator-001",
  "name": "Primary Node (Delhi)",
  "role": "government",
  "isActive": true,
  "blocksProduced": 1247,
  "uptime": 99.8,
  "lastBlockTimestamp": 1708012345678,
  "joinedAt": 1707500000000
}
```

---

## 📊 MONITORING & MAINTENANCE

### System Monitoring

#### 1. Node Health Dashboard

Access the Government Officer dashboard at:

```
https://your-domain.gov.in/blockchain-governance
```

Features:

- Real-time block production
- Validator uptime statistics
- Network health metrics
- Transaction throughput
- Audit trail

#### 2. PM2 Monitoring

```bash
# View process status
pm2 status

# View resource usage
pm2 monit

# View logs
pm2 logs bharat-land-chain

# Restart if needed
pm2 restart bharat-land-chain
```

#### 3. Automated Alerts

Configure alerts in `.env`:

```bash
ALERT_EMAIL=ops-team@gov.in
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=85
ALERT_THRESHOLD_DISK=90
ALERT_DOWNTIME_MINUTES=5
```

### Backup & Recovery

#### Daily Backups

```bash
# Create backup script
cat > /opt/bharat-land-chain/backup.sh <<'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backup/blockchain/$DATE

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --db bharat_land_chain --out $BACKUP_DIR/mongodb

# Backup blockchain data
cp -r /opt/bharat-land-chain/data $BACKUP_DIR/

# Compress backup
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
rm -rf $BACKUP_DIR

# Keep only last 30 days
find /backup/blockchain -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR.tar.gz"
EOF

chmod +x /opt/bharat-land-chain/backup.sh

# Schedule daily backup
crontab -e
# Add: 0 2 * * * /opt/bharat-land-chain/backup.sh
```

#### Recovery Procedure

```bash
# Stop node
pm2 stop bharat-land-chain

# Extract backup
tar -xzf /backup/blockchain/20240214_020000.tar.gz -C /tmp/

# Restore MongoDB
mongorestore --db bharat_land_chain /tmp/20240214_020000/mongodb/bharat_land_chain

# Restore blockchain data
cp -r /tmp/20240214_020000/data/* /opt/bharat-land-chain/data/

# Restart node
pm2 restart bharat-land-chain
```

### Performance Optimization

#### 1. MongoDB Indexing

```javascript
// Create indexes for faster queries
db.properties.createIndex({ blockchainHash: 1 });
db.properties.createIndex({ owner: 1 });
db.transfers.createIndex({ propertyId: 1 });
db.transfers.createIndex({ status: 1 });
```

#### 2. Memory Tuning

Edit `pm2.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: "bharat-land-chain",
      script: "./server.js",
      instances: 1,
      exec_mode: "cluster",
      max_memory_restart: "2G",
      node_args: "--max-old-space-size=4096",
    },
  ],
};
```

#### 3. Network Optimization

```bash
# Increase TCP buffer sizes
sudo sysctl -w net.core.rmem_max=16777216
sudo sysctl -w net.core.wmem_max=16777216
sudo sysctl -w net.ipv4.tcp_rmem="4096 87380 16777216"
sudo sysctl -w net.ipv4.tcp_wmem="4096 65536 16777216"
```

---

## 🔒 SECURITY BEST PRACTICES

### 1. Network Security

```bash
# Configure strict firewall rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from <trusted_network> to any port 5001
sudo ufw allow from <peer_validator_1> to any port 5001
sudo ufw allow from <peer_validator_2> to any port 5001
sudo ufw enable

# Enable fail2ban
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
```

### 2. SSL/TLS Configuration

```bash
# Install Certbot
sudo apt-get install certbot

# Obtain SSL certificate
sudo certbot certonly --standalone -d validator.gov.in

# Configure NGINX reverse proxy
sudo apt-get install nginx

cat > /etc/nginx/sites-available/blockchain <<'EOF'
server {
    listen 443 ssl http2;
    server_name validator.gov.in;

    ssl_certificate /etc/letsencrypt/live/validator.gov.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/validator.gov.in/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/blockchain /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Access Control

```bash
# Restrict SSH access
sudo vi /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no
# Add: AllowUsers admin@<trusted_ip>

sudo systemctl restart sshd

# Setup SSH key authentication only
ssh-keygen -t ed25519 -C "validator-admin@gov.in"
```

### 4. Intrusion Detection

```bash
# Install AIDE (Advanced Intrusion Detection Environment)
sudo apt-get install aide
sudo aideinit
sudo mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# Schedule daily checks
echo "0 3 * * * /usr/bin/aide --check" | sudo crontab -
```

### 5. Audit Logging

Enable comprehensive logging in `.env`:

```bash
AUDIT_LOG_ENABLED=true
AUDIT_LOG_PATH=/var/log/blockchain/audit.log
AUDIT_LOG_RETENTION_DAYS=365
```

---

## 🔧 TROUBLESHOOTING

### Common Issues

#### Issue 1: Node Not Syncing

**Symptoms**: Blockchain height not increasing, no new blocks

**Solution**:

```bash
# Check network connectivity to peers
ping <peer_node_ip>

# Check if other nodes are reachable
curl -X GET http://<peer_node>:5001/api/blockchain/network-status

# Restart with clean sync
pm2 stop bharat-land-chain
rm -rf /opt/bharat-land-chain/data/sync-lock
pm2 start bharat-land-chain

# Monitor logs
pm2 logs bharat-land-chain --lines 50
```

#### Issue 2: High Memory Usage

**Symptoms**: Node slow, high RAM consumption

**Solution**:

```bash
# Check memory usage
pm2 monit

# Restart with memory limit
pm2 delete bharat-land-chain
pm2 start server.js --name bharat-land-chain --max-memory-restart 2G

# Optimize MongoDB
mongosh bharat_land_chain --eval "db.runCommand({compact: 'blocks'})"
```

#### Issue 3: Consensus Timeout

**Symptoms**: Blocks not being finalized, validator errors

**Solution**:

```bash
# Check validator connectivity
curl -X GET http://localhost:5001/api/blockchain/validators

# Verify at least 2/3 validators are online
# Increase consensus timeout in .env
CONSENSUS_TIMEOUT=10000

# Restart node
pm2 restart bharat-land-chain
```

#### Issue 4: Database Connection Error

**Symptoms**: "MongoDB connection failed"

**Solution**:

```bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod

# Check connection string in .env
MONGODB_URI=mongodb://chaindb_admin:<password>@localhost:27017/bharat_land_chain

# Test connection
mongosh "mongodb://chaindb_admin:<password>@localhost:27017/bharat_land_chain"
```

### Log Analysis

```bash
# View all errors
pm2 logs bharat-land-chain --err --lines 100

# Filter specific errors
pm2 logs bharat-land-chain | grep "ERROR"

# Export logs for analysis
pm2 logs bharat-land-chain --lines 1000 > /tmp/blockchain-logs.txt
```

### Performance Diagnostics

```bash
# Check CPU usage
top -p $(pgrep -f "bharat-land-chain")

# Check disk I/O
iotop -p $(pgrep -f "bharat-land-chain")

# Check network traffic
sudo iftop -i eth0

# Check open connections
netstat -an | grep 5001
```

---

## 📞 SUPPORT & RESOURCES

### Technical Support

- **Email**: blockchain-support@gov.in
- **Emergency Hotline**: +91-11-XXXX-XXXX (24/7)
- **Documentation**: https://docs.bharat-land-chain.gov.in
- **Status Page**: https://status.bharat-land-chain.gov.in

### Community

- **Validator Forum**: https://forum.bharat-land-chain.gov.in
- **Telegram Group**: @BharatLandChainValidators
- **Monthly Webinars**: First Tuesday of every month

### Reporting Issues

1. Check the [Known Issues](https://github.com/bharat-land-chain/issues) page
2. Search the [Forum](https://forum.bharat-land-chain.gov.in)
3. Submit a detailed bug report with:
   - Node ID and version
   - Error logs (last 100 lines)
   - System specifications
   - Steps to reproduce

---

## 📜 LICENSE & COMPLIANCE

This blockchain network is operated under the authority of the **Government of India**. All validator nodes must comply with:

- **IT Act, 2000** and amendments
- **Digital India Initiative** guidelines
- **National Blockchain Framework**
- **Data Protection Regulations**

Validator operators are responsible for:

- Maintaining data privacy
- Reporting security incidents within 24 hours
- Participating in mandatory security audits
- Following operational guidelines

---

## ✅ CHECKLIST

### Pre-Launch Checklist

- [ ] Hardware meets minimum specifications
- [ ] Ubuntu 22.04 LTS installed and updated
- [ ] All software dependencies installed
- [ ] `.env` file configured correctly
- [ ] MongoDB secured with authentication
- [ ] Firewall configured and enabled
- [ ] SSL certificate obtained and installed
- [ ] SSH hardened with key-only authentication
- [ ] Backup script created and scheduled
- [ ] Monitoring dashboard accessible
- [ ] Node registered with network coordinator
- [ ] Peer connections tested
- [ ] Initial sync completed
- [ ] Consensus participation verified
- [ ] Alert notifications tested
- [ ] Documentation reviewed

---

**Document Version**: 1.0  
**Last Updated**: February 14, 2026  
**Maintained By**: Bharat Land Chain Network Team  
**Contact**: blockchain-admin@gov.in
