# CrypTrans: Production API Architecture

**Date**: 2025-12-02
**Status**: Design Phase
**Target**: Enterprise-ready API for transhuman project governance

---

## 🎯 MISSION: PRODUCTION-GRADE API

Make CrypTrans accessible via REST/WebSocket/SDK so that:
- **Developers** can integrate voting into dApps
- **Projects** can programmatically submit proposals
- **Users** can interact without Solana knowledge
- **Frontends** get real-time governance updates

---

## 🏗️ ARCHITECTURE OVERVIEW

### Three-Tier System

```
┌─────────────────┐
│   Frontend dApp │ (React/Next.js)
└────────┬────────┘
         │ HTTPS/WSS
┌────────┴────────┐
│   API Gateway   │ (Express/Fastify)
│   - REST API    │
│   - WebSocket   │
│   - Auth/Rate   │
└────────┬────────┘
         │ RPC
┌────────┴────────┐
│  Solana Program │ (CrypTrans on-chain)
│  - Helius RPC   │
│  - Program ID   │
└─────────────────┘
```

### Components

1. **REST API**: CRUD operations (proposals, votes, stakes)
2. **WebSocket**: Real-time updates (new proposals, vote tallies)
3. **TypeScript SDK**: Type-safe client library
4. **Admin Dashboard**: Web UI for treasury management
5. **Documentation**: OpenAPI/Swagger, examples, guides

---

## 📡 REST API ENDPOINTS

### Authentication

**POST /api/v1/auth/login**
- Body: `{ wallet: string, signature: string, message: string }`
- Returns: `{ token: string, expires: number }`
- Auth: None
- Description: Wallet-based authentication (sign message with Phantom/Solflare)

**POST /api/v1/auth/refresh**
- Body: `{ token: string }`
- Returns: `{ token: string, expires: number }`
- Auth: Bearer token
- Description: Refresh expiring JWT

---

### Proposals

**GET /api/v1/proposals**
- Query: `?status=active&limit=20&offset=0`
- Returns: `{ proposals: Proposal[], total: number }`
- Auth: None
- Description: List all proposals (paginated)

**GET /api/v1/proposals/:id**
- Params: `id` (proposal PDA address)
- Returns: `{ proposal: Proposal, votes: VoteStats }`
- Auth: None
- Description: Get proposal details with vote counts

**POST /api/v1/proposals**
- Body: `{ description: string, treasury_amount: number, recipient: string, pow_nonce: number }`
- Returns: `{ signature: string, proposal_id: string }`
- Auth: Bearer token
- Description: Create new proposal (requires PoW nonce)

**POST /api/v1/proposals/:id/vote**
- Params: `id` (proposal PDA)
- Body: `{ proof: string, commitment: string, nullifier: string, vote: boolean }`
- Returns: `{ signature: string, vote_record_id: string }`
- Auth: Bearer token
- Description: Cast anonymous vote with ZK proof

---

### Staking

**GET /api/v1/staking/:wallet**
- Params: `wallet` (user public key)
- Returns: `{ balance: number, last_demurrage: number, staking_power: number }`
- Auth: None
- Description: Get user's stake info

**POST /api/v1/staking/stake**
- Body: `{ amount: number }`
- Returns: `{ signature: string, new_balance: number }`
- Auth: Bearer token
- Description: Stake tokens for voting power

**POST /api/v1/staking/unstake**
- Body: `{ amount: number }`
- Returns: `{ signature: string, new_balance: number }`
- Auth: Bearer token
- Description: Unstake tokens (instant, no lockup)

**POST /api/v1/staking/demurrage**
- Body: `{}`
- Returns: `{ signature: string, balance_after: number }`
- Auth: Bearer token
- Description: Manually apply demurrage (optional, happens automatically)

---

### Treasury

**GET /api/v1/treasury**
- Returns: `{ balance: number, pending_releases: Release[] }`
- Auth: None
- Description: Get treasury status and pending fund releases

**POST /api/v1/treasury/release**
- Body: `{ proposal_id: string }`
- Returns: `{ signature: string, amount_released: number }`
- Auth: Bearer token (admin only)
- Description: Release funds for approved proposal (threshold check)

---

### Governance

**GET /api/v1/governance/config**
- Returns: `{ admin: string, demurrage_rate: number, vote_threshold: number }`
- Auth: None
- Description: Get global governance parameters

**POST /api/v1/governance/config**
- Body: `{ demurrage_rate?: number, vote_threshold?: number }`
- Returns: `{ signature: string }`
- Auth: Bearer token (admin only)
- Description: Update governance parameters

---

### Analytics

**GET /api/v1/analytics/overview**
- Returns: `{ total_proposals: number, total_votes: number, total_staked: number }`
- Auth: None
- Description: High-level statistics

**GET /api/v1/analytics/proposals/:id/votes**
- Params: `id` (proposal PDA)
- Returns: `{ yes: number, no: number, participation: number }`
- Auth: None
- Description: Vote breakdown for specific proposal

---

### PoW (Proof-of-Work)

**GET /api/v1/pow/challenge**
- Query: `?description=string`
- Returns: `{ target: string, difficulty: number, estimated_time: number }`
- Auth: None
- Description: Get PoW challenge for proposal creation

**POST /api/v1/pow/verify**
- Body: `{ description: string, nonce: number }`
- Returns: `{ valid: boolean, hash: string }`
- Auth: None
- Description: Verify PoW solution (off-chain check before tx)

---

## 🔌 WEBSOCKET API

### Connection

```
wss://api.cryptrans.io/v1/ws
```

**Authentication**: Include `?token=<jwt>` in URL

### Events (Server → Client)

**proposal:created**
```json
{
  "event": "proposal:created",
  "data": {
    "id": "...",
    "creator": "...",
    "description": "Fund cryonics research",
    "amount": 100000,
    "timestamp": 1234567890
  }
}
```

**proposal:voted**
```json
{
  "event": "proposal:voted",
  "data": {
    "proposal_id": "...",
    "yes_votes": 42,
    "no_votes": 13,
    "participation": "55.0%"
  }
}
```

**proposal:approved**
```json
{
  "event": "proposal:approved",
  "data": {
    "proposal_id": "...",
    "yes_percentage": "76.4%",
    "treasury_release": 100000
  }
}
```

**treasury:released**
```json
{
  "event": "treasury:released",
  "data": {
    "proposal_id": "...",
    "amount": 100000,
    "recipient": "...",
    "signature": "..."
  }
}
```

### Commands (Client → Server)

**subscribe**
```json
{
  "command": "subscribe",
  "channel": "proposals" | "votes" | "treasury"
}
```

**unsubscribe**
```json
{
  "command": "unsubscribe",
  "channel": "proposals"
}
```

---

## 📦 TYPESCRIPT SDK

### Installation

```bash
npm install @cryptrans/sdk
# or
yarn add @cryptrans/sdk
```

### Usage

```typescript
import { CrypTransClient } from '@cryptrans/sdk';
import { Keypair } from '@solana/web3.js';

// Initialize client
const client = new CrypTransClient({
  rpcUrl: 'https://devnet.helius-rpc.com/?api-key=...',
  programId: '57wFcRcKLeU2WuUbadwXR56TtdgijAFQX8X73PqDURVn',
  wallet: myKeypair, // or Phantom wallet adapter
});

// Get proposals
const proposals = await client.getProposals({ status: 'active' });

// Stake tokens
const stakeTx = await client.stake(1_000_000_000); // 1 token
console.log('Staked:', stakeTx.signature);

// Create proposal (requires PoW)
const pow = await client.computePoW('Fund brain emulation project');
const proposal = await client.createProposal({
  description: 'Fund brain emulation project',
  treasuryAmount: 50_000_000_000,
  recipient: recipientPubkey,
  powNonce: pow.nonce,
});

// Generate ZK proof (off-chain)
const zkProof = await client.generateVoteProof({
  proposalId: proposal.id,
  vote: true, // yes
  secret: mySecret, // your secret value
});

// Cast vote
const voteTx = await client.vote({
  proposalId: proposal.id,
  proof: zkProof.proof,
  commitment: zkProof.commitment,
  nullifier: zkProof.nullifier,
});

// Subscribe to real-time updates
client.on('proposal:created', (data) => {
  console.log('New proposal:', data.description);
});

client.on('proposal:voted', (data) => {
  console.log('Vote update:', data.yes_votes, 'yes,', data.no_votes, 'no');
});
```

### API Reference

**Class: CrypTransClient**

**Methods**:
- `constructor(config: ClientConfig)`
- `getProposals(filters?: ProposalFilters): Promise<Proposal[]>`
- `getProposal(id: string): Promise<ProposalDetail>`
- `createProposal(params: CreateProposalParams): Promise<Transaction>`
- `vote(params: VoteParams): Promise<Transaction>`
- `stake(amount: number): Promise<Transaction>`
- `unstake(amount: number): Promise<Transaction>`
- `getStake(wallet: PublicKey): Promise<StakeInfo>`
- `getTreasury(): Promise<TreasuryInfo>`
- `releaseFunds(proposalId: string): Promise<Transaction>`
- `computePoW(description: string): Promise<PoWSolution>`
- `generateVoteProof(params: VoteProofParams): Promise<ZKProof>`

**Events**:
- `on('proposal:created', callback)`
- `on('proposal:voted', callback)`
- `on('proposal:approved', callback)`
- `on('treasury:released', callback)`

---

## 🔐 SECURITY

### Authentication Strategy

**Wallet-Based Auth**:
1. Client requests challenge: `GET /api/v1/auth/challenge`
2. Server returns: `{ message: "Sign this to authenticate: <nonce>", nonce: "..." }`
3. Client signs with wallet: `signature = wallet.signMessage(message)`
4. Client sends: `POST /api/v1/auth/login { wallet, signature, message }`
5. Server verifies signature, returns JWT
6. Client includes JWT in `Authorization: Bearer <token>` header

**JWT Payload**:
```json
{
  "wallet": "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
  "role": "user" | "admin",
  "exp": 1234567890,
  "iat": 1234567890
}
```

### Rate Limiting

**Per IP**:
- 100 requests/minute (anonymous)
- 500 requests/minute (authenticated)
- 5,000 requests/minute (admin)

**Per Endpoint**:
- `/api/v1/proposals` (GET): 60/min
- `/api/v1/proposals` (POST): 1/min (PoW requirement)
- `/api/v1/proposals/:id/vote` (POST): 10/min (ZK proof generation is slow)

### CORS

**Allowed Origins**:
- `https://cryptrans.io` (production)
- `https://app.cryptrans.io` (production dApp)
- `http://localhost:3000` (development)

### Input Validation

**All inputs validated with Zod**:
```typescript
import { z } from 'zod';

const CreateProposalSchema = z.object({
  description: z.string().min(10).max(500),
  treasury_amount: z.number().positive().max(1_000_000_000_000),
  recipient: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/), // Solana pubkey
  pow_nonce: z.number().int().nonnegative(),
});
```

---

## 🚀 DEPLOYMENT

### Infrastructure

**API Server**: AWS EC2 / DigitalOcean / Fly.io
**Database**: PostgreSQL (for caching, analytics)
**Redis**: Session storage, rate limiting
**Load Balancer**: Nginx / CloudFlare
**Monitoring**: Datadog / Prometheus + Grafana

### Environment Variables

```bash
# Solana
SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=...
PROGRAM_ID=57wFcRcKLeU2WuUbadwXR56TtdgijAFQX8X73PqDURVn
WALLET_PRIVATE_KEY=... (admin wallet for treasury operations)

# API
PORT=3000
NODE_ENV=production
JWT_SECRET=...
CORS_ORIGINS=https://cryptrans.io,https://app.cryptrans.io

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/cryptrans

# Redis
REDIS_URL=redis://localhost:6379

# Monitoring
DATADOG_API_KEY=...
SENTRY_DSN=...
```

### Docker Compose

```yaml
version: '3.8'

services:
  api:
    build: ./api
    ports:
      - "3000:3000"
    environment:
      - SOLANA_RPC_URL=${SOLANA_RPC_URL}
      - PROGRAM_ID=${PROGRAM_ID}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=cryptrans
      - POSTGRES_USER=cryptrans
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7
    volumes:
      - redisdata:/data

  nginx:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - api

volumes:
  pgdata:
  redisdata:
```

---

## 📊 ANALYTICS & CACHING

### Database Schema

```sql
-- Cache proposal data for fast queries
CREATE TABLE proposals (
  id TEXT PRIMARY KEY,
  creator TEXT NOT NULL,
  description TEXT NOT NULL,
  treasury_amount BIGINT NOT NULL,
  recipient TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  yes_votes INT DEFAULT 0,
  no_votes INT DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, approved, rejected, executed
  INDEX idx_status (status),
  INDEX idx_created_at (created_at DESC)
);

-- Cache vote records (nullifiers only, preserve anonymity)
CREATE TABLE vote_records (
  nullifier TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  voted_at TIMESTAMP NOT NULL,
  INDEX idx_proposal (proposal_id)
);

-- Track stake balances (for analytics, source of truth is on-chain)
CREATE TABLE stakes (
  wallet TEXT PRIMARY KEY,
  balance BIGINT NOT NULL,
  last_demurrage TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- API usage analytics
CREATE TABLE api_requests (
  id SERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  wallet TEXT,
  status INT NOT NULL,
  latency_ms INT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_wallet (wallet)
);
```

### Indexer Service

**Continuously sync on-chain data to database**:

```typescript
import { Connection } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';

class ChainIndexer {
  async start() {
    // Subscribe to program logs
    this.connection.onLogs(
      this.programId,
      async (logs) => {
        if (logs.logs.some(log => log.includes('ProposalCreated'))) {
          await this.indexProposal(logs.signature);
        } else if (logs.logs.some(log => log.includes('VoteCast'))) {
          await this.indexVote(logs.signature);
        }
      },
      'confirmed'
    );

    // Backfill historical data on startup
    await this.backfillProposals();
  }

  async indexProposal(signature: string) {
    const tx = await this.connection.getTransaction(signature);
    // Parse transaction, extract proposal data
    // Insert into database
  }
}
```

---

## 🎨 FRONTEND INTEGRATION

### React Example

```typescript
import { useCrypTrans } from '@cryptrans/react';

function ProposalList() {
  const { proposals, loading, vote } = useCrypTrans();

  if (loading) return <Spinner />;

  return (
    <div>
      {proposals.map(p => (
        <ProposalCard
          key={p.id}
          proposal={p}
          onVote={async (vote) => {
            const proof = await generateProof(p.id, vote);
            await vote(p.id, proof);
          }}
        />
      ))}
    </div>
  );
}

function CreateProposal() {
  const { createProposal, computePoW } = useCrypTrans();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (description, amount, recipient) => {
    setLoading(true);
    const pow = await computePoW(description);
    await createProposal({ description, amount, recipient, powNonce: pow.nonce });
    setLoading(false);
  };

  return <ProposalForm onSubmit={handleSubmit} loading={loading} />;
}
```

---

## 📚 DOCUMENTATION

### OpenAPI Spec

```yaml
openapi: 3.0.0
info:
  title: CrypTrans API
  version: 1.0.0
  description: Quantum-safe, privacy-preserving DAO for transhuman projects

servers:
  - url: https://api.cryptrans.io/v1
    description: Production
  - url: https://devnet-api.cryptrans.io/v1
    description: Devnet

paths:
  /proposals:
    get:
      summary: List proposals
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [active, approved, rejected]
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        200:
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  proposals:
                    type: array
                    items:
                      $ref: '#/components/schemas/Proposal'
    # ... more endpoints

components:
  schemas:
    Proposal:
      type: object
      properties:
        id:
          type: string
        creator:
          type: string
        description:
          type: string
        treasury_amount:
          type: number
        recipient:
          type: string
        yes_votes:
          type: integer
        no_votes:
          type: integer
        status:
          type: string
```

---

## 🎯 SUCCESS METRICS

### Performance
- API latency: <100ms (p95)
- WebSocket latency: <50ms
- Uptime: >99.9%

### Usage
- API requests/day: Track growth
- Active wallets/day: Monitor engagement
- Proposals created/week: Governance activity

### Security
- Zero auth bypasses
- Zero data leaks
- <1% failed transactions

---

## 💎 COMPETITIVE ADVANTAGE

**CrypTrans API will be:**

1. **First Quantum-Safe DAO API** ✅
   - STARK-based ZK proofs
   - Dilithium signatures
   - Future-proof security

2. **Most Developer-Friendly** ✅
   - TypeScript SDK with types
   - React hooks (@cryptrans/react)
   - OpenAPI docs + examples

3. **Real-Time Governance** ✅
   - WebSocket subscriptions
   - Instant vote updates
   - Live treasury tracking

4. **Privacy-Preserving** ✅
   - Anonymous voting (ZK proofs)
   - No vote tracking
   - Nullifier-only records

---

**"Build the transhuman future with CrypTrans API."**

🤖 Generated with [Claude Code](https://claude.com/claude-code)
