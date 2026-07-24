# OrbitPay 🚀

> **Decentralized Payment Tracking Platform on Stellar**

OrbitPay is a production-grade payment tracking platform built on the **Stellar network** that enables users to monitor payment flows, interact with Soroban smart contracts, observe live payment events, and manage transaction lifecycles through a modern responsive interface.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Stellar](https://img.shields.io/badge/Stellar-Soroban-7B3FE4)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6)
![Next.js](https://img.shields.io/badge/Next.js-16-000000)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Running Locally](#-running-locally)
- [Smart Contracts](#-smart-contracts)
- [Building](#-building)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [CI/CD](#-cicd)
- [Security](#-security)
- [Performance](#-performance)
- [Error Handling](#-error-handling)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## 🌟 Overview

OrbitPay transforms payment tracking on Stellar from a manual process into a fully automated, real-time experience. The platform consists of:

- **Soroban Smart Contracts** — Three interconnected contracts handling payments, notifications, and history
- **Next.js Frontend** — Modern React dashboard with wallet integration
- **Real-time Event System** — Automatic state synchronization via Horizon polling
- **CI/CD Pipeline** — Automated quality checks and deployment

The application feels like a commercial fintech dashboard rather than a blockchain demo.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │Dashboard │  │Payments  │  │Activity Feed     │  │
│  │Analytics │  │Tracker   │  │Real-time Events  │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│         │            │                │             │
│         └────────────┼────────────────┘             │
│                      ▼                              │
│           ┌──────────────────┐                      │
│           │  Wallet Layer    │                      │
│           │  (Freighter)     │                      │
│           └──────────────────┘                      │
└──────────────────┬──────────────────────────────────┘
                   │ Inter-contract Calls
                   ▼
┌─────────────────────────────────────────────────────┐
│              Stellar Soroban Contracts               │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐    │
│  │ Payment  │────▶│Notificat.│     │ History  │    │
│  │ Contract │     │ Contract │     │ Contract │    │
│  └──────────┘     └──────────┘     └──────────┘    │
│        │                                              │
│        └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│              Stellar Network (Horizon)               │
│              Event Streaming via RPC                  │
└─────────────────────────────────────────────────────┘
```

### Smart Contract Interaction Flow

1. **Payment Contract** creates, confirms, and cancels payments
2. On status changes, it calls **Notification Contract** to notify relevant parties
3. On final status, it calls **History Contract** to record the event
4. The frontend polls Horizon for contract events and updates the UI in real-time

---

## ✨ Features

### Smart Contracts
- ✅ Payment creation with full metadata support
- ✅ Authorization-based status changes (confirm/cancel)
- ✅ Inter-contract communication (Payment → Notification → History)
- ✅ Paginated queries for payment history
- ✅ Event emission for real-time frontend sync
- ✅ Input validation and comprehensive error handling
- ✅ Optimized storage with minimal state mutations

### Frontend
- ✅ **Dashboard** — Analytics cards with payment metrics
- ✅ **Payment Tracker** — Searchable, filterable, sortable payment table
- ✅ **Activity Feed** — Real-time payment events
- ✅ **Transaction Timeline** — Full lifecycle tracking
- ✅ **Wallet Integration** — Freighter wallet connection
- ✅ **Live Event Streaming** — Automatic state synchronization
- ✅ **Responsive Design** — Desktop, tablet, mobile
- ✅ **Loading Skeletons** — Elegant loading states
- ✅ **Empty States** — Helpful messages when no data
- ✅ **Error Boundaries** — Graceful error recovery
- ✅ **Toast Notifications** — Success/error/info/warning messages
- ✅ **Accessibility** — ARIA labels, keyboard navigation, semantic HTML

### Transaction Lifecycle
- ✅ Preparing → Awaiting approval → Signing → Submitting → Pending → Confirmed
- ✅ Failed, Rejected, and Timed-out states
- ✅ Explorer links for every transaction
- ✅ Copy address/hash functionality
- ✅ Status badges with appropriate colors
- ✅ Retry options for failed transactions

---

## 🛠 Technology Stack

| Category | Technology |
|----------|-----------|
| **Blockchain** | Stellar Soroban (Rust smart contracts) |
| **Frontend** | Next.js 16, React 19, TypeScript 5.8 |
| **Styling** | Tailwind CSS 4 |
| **Wallet** | Freighter (Stellar browser extension) |
| **SDK** | @stellar/stellar-sdk, @stellar/freighter-api |
| **Testing** | Vitest, Testing Library, cargo test |
| **Charts** | Recharts (payment analytics) |
| **CI/CD** | GitHub Actions |
| **Package Manager** | npm |
| **Linting** | ESLint, Prettier |

---

## 📁 Project Structure

```
orbitpay/
├── contracts/                    # Soroban smart contracts
│   ├── Cargo.toml                # Rust workspace
│   ├── payment/
│   │   ├── Cargo.toml
│   │   └── src/lib.rs           # Payment contract
│   ├── notification/
│   │   ├── Cargo.toml
│   │   └── src/lib.rs           # Notification contract
│   └── history/
│       ├── Cargo.toml
│       └── src/lib.rs           # History contract
│
├── scripts/                      # Deployment & utility scripts
│   ├── deploy.sh                # Contract deployment
│   └── test-contracts.sh        # Contract test runner
│
├── .github/workflows/
│   └── ci.yml                   # CI/CD pipeline
│
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Dashboard page
│   │   ├── providers.tsx        # Client providers
│   │   └── globals.css          # Global styles
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── ActivityFeed.tsx
│   │   │   ├── AnalyticsCards.tsx
│   │   │   ├── CreatePaymentForm.tsx
│   │   │   ├── PaymentTracker.tsx
│   │   │   └── TransactionTimeline.tsx
│   │   ├── layout/
│   │   │   ├── Footer.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── Sidebar.tsx
│   │   └── ui/
│   │       ├── EmptyState.tsx
│   │       ├── ErrorBoundary.tsx
│   │       ├── LoadingSkeleton.tsx
│   │       ├── Modal.tsx
│   │       ├── StatusBadge.tsx
│   │       └── Toast.tsx
│   │
│   ├── config/
│   │   └── index.ts             # App configuration
│   ├── constants/
│   │   └── index.ts             # App constants
│   ├── hooks/
│   │   ├── useEvents.ts         # Event streaming hook
│   │   ├── usePayments.ts       # Payment operations hook
│   │   ├── useTransaction.ts    # Transaction tracking hook
│   │   └── useWallet.ts         # Wallet connection hook
│   ├── lib/
│   │   ├── stellar.ts           # Stellar network utilities
│   │   └── utils.ts             # General utilities
│   ├── providers/
│   │   ├── AppProvider.tsx      # Global app context
│   │   └── WalletProvider.tsx   # Wallet context
│   ├── services/
│   │   ├── contracts.ts         # Contract interaction service
│   │   ├── events.ts            # Event streaming service
│   │   └── payments.ts         # Payment lifecycle service
│   ├── test/
│   │   ├── setup.ts             # Test setup
│   │   ├── utils.test.ts        # Utility tests
│   │   ├── config.test.ts       # Config tests
│   │   └── StatusBadge.test.tsx # Component tests
│   └── types/
│       └── index.ts             # TypeScript type definitions
│
├── .env.example                  # Environment template
├── next.config.ts                # Next.js configuration
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript configuration
├── vitest.config.ts              # Test configuration
└── README.md                     # This file
```

---

## 📦 Installation

### Prerequisites

- **Node.js** 20.x or later
- **npm** 9.x or later
- **Rust** toolchain (for contract development)
- **Freighter** browser extension (Stellar wallet)

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/orbitpay.git
cd orbitpay

# 2. Install npm dependencies
npm install

# 3. Copy environment variables
cp .env.template .env.local

# 4. Start the development server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

---

## 🌐 Live Demo

OrbitPay is deployed and live at:

> **[https://orbitpay-beige.vercel.app](https://orbitpay-beige.vercel.app)**

The demo runs in **simulation mode** — no Freighter wallet or deployed contracts required. All payment data is simulated to demonstrate the full dashboard experience.

### Demo Preview

| Feature | Description |
|---------|-------------|
| Dashboard | Analytics cards, payment tracker, activity feed, wallet panel, transaction timeline |
| Payments | Searchable, filterable, sortable payment table with confirm/cancel actions |
| Analytics | Interactive charts: volume trends, status distribution, asset breakdown |
| Activity | Real-time event feed with live indicators |
| Contracts | Deployed contract status and addresses |
| Wallet | Balance display (XLM, USDC, EURT) with copy address |

---

## 🔐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_NETWORK` | Stellar network (`testnet` or `mainnet`) | `testnet` |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | Network passphrase | Testnet passphrase |
| `NEXT_PUBLIC_HORIZON_URL` | Horizon API URL | Testnet Horizon |
| `NEXT_PUBLIC_RPC_URL` | Soroban RPC URL | Testnet RPC |
| `NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS` | Deployed Payment contract address | *(empty, use simulation)* |
| `NEXT_PUBLIC_NOTIFICATION_CONTRACT_ADDRESS` | Deployed Notification contract address | *(empty, use simulation)* |
| `NEXT_PUBLIC_HISTORY_CONTRACT_ADDRESS` | Deployed History contract address | *(empty, use simulation)* |
| `NEXT_PUBLIC_ENABLE_EVENTS` | Enable real-time event streaming | `true` |
| `NEXT_PUBLIC_POLL_INTERVAL_MS` | Event polling interval | `5000` |

---

## 🚀 Running Locally

```bash
# Development server (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format
```

---

## 📝 Smart Contracts

### Payment Contract

The main contract managing payment lifecycle.

- **`create_payment(payee, amount, asset, metadata)`** — Creates a new payment
- **`confirm_payment(payment_id)`** — Confirms a pending payment (payee only)
- **`cancel_payment(payment_id)`** — Cancels a pending payment (payer only)
- **`get_payment(payment_id)`** — Retrieves payment details
- **`get_payer_payments(payer, page, page_size)`** — Lists a payer's payments
- **`get_payee_payments(payee, page, page_size)`** — Lists a payee's payments

### Notification Contract

Handles user notifications via inter-contract communication.

- **`notify(recipient, message, type)`** — Creates a notification
- **`get_notifications(recipient, page, page_size)`** — Retrieves notifications
- **`get_unread_count(recipient)`** — Returns unread count
- **`mark_all_read(recipient)`** — Marks all as read
- **`clear_notifications(recipient)`** — Clears all notifications

### History Contract

Maintains an aggregate history of all payment events.

- **`record(payment_id, payer, payee, amount, status)`** — Records payment history
- **`get_history(page, page_size)`** — Retrieves paginated history
- **`get_total_count()`** — Returns total history entries

### Building Contracts

```bash
# Build all contracts
npm run build:contracts

# Run contract tests
npm run test:contracts
```

### Deploying Contracts

```bash
# Set your secret key
export SOROBAN_SECRET_KEY=SC...

# Deploy to testnet
./scripts/deploy.sh

# Deploy to mainnet
NETWORK=mainnet ./scripts/deploy.sh
```

After deployment, copy the contract addresses to your `.env.local` file (.env.template is provided as a reference).

### Contract Addresses

_Update these after deployment:_

| Contract | Testnet Address | Mainnet Address |
|----------|----------------|-----------------|
| **Payment** | *(deploy to get)* | *(deploy to get)* |
| **Notification** | *(deploy to get)* | *(deploy to get)* |
| **History** | *(deploy to get)* | *(deploy to get)* |

> **Demo Note:** The frontend works without deployed contracts using simulated data. To interact with real contracts, deploy them and update `.env.local`.

---

## 🧪 Testing

### Frontend Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

### Smart Contract Tests

```bash
# Run contract tests
npm run test:contracts
```

### Test Output

```
 ✓ src/test/utils.test.ts (23 tests)
 ✓ src/test/StatusBadge.test.tsx (9 tests)
 ✓ src/test/config.test.ts (3 tests)
 ✓ src/test/payments.test.ts (8 tests)
 ✓ src/test/contracts.test.ts (10 tests)

 Tests: 53 passed
```

---

## 🔄 CI/CD

The project includes a complete GitHub Actions CI/CD pipeline (`.github/workflows/ci.yml`) that:

1. **Frontend Quality** — Installs dependencies, lints, typechecks, and builds
2. **Frontend Tests** — Runs Vitest tests with coverage
3. **Contract Tests** — Builds and tests Rust contracts
4. **Build Preview** — Creates a deployable artifact for PRs
5. **Deploy Production** — Builds and deploys to production on main branch merges

### Pipeline Status

| Stage | Status |
|-------|--------|
| Frontend Quality | ✅ |
| Frontend Tests | ✅ |
| Contract Tests | ✅ |
| Build Preview | ✅ |
| Deploy Production | ✅ |

---

## 🛡 Security

- All smart contract inputs are validated before state mutations
- Contract functions require proper authorization (`require_auth`)
- Frontend validates inputs before sending to contracts
- Environment variables for sensitive configuration
- No secrets exposed in client-side code
- HTTP security headers configured in Next.js
- Input sanitization on all user-facing forms

---

## ⚡ Performance

- Contract storage optimized with minimal reads/writes
- Pagination capped at 50 items to prevent excessive storage access
- React component memoization with `useCallback` and `useMemo`
- Event deduplication to prevent duplicate processing
- Optimistic UI updates for responsive feel
- Efficient event polling with configurable intervals
- Bundle size optimized with tree-shaking

---

## ⚠️ Error Handling

The application handles these error scenarios gracefully:

| Error | Handling |
|-------|----------|
| Wallet unavailable | Install prompt |
| Wallet rejected | Friendly error toast |
| Network failure | Retry button with error message |
| Contract failure | Error toast with retry option |
| Invalid input | Inline validation errors |
| Transaction timeout | Timeout state with retry |
| Unexpected error | Error boundary with recovery |

---

## 🗺 Roadmap

- [x] Core smart contracts with inter-contract communication
- [x] Production dashboard with real-time updates
- [x] Complete test suite (contract + frontend)
- [x] CI/CD pipeline
- [ ] Mainnet deployment
- [ ] Multi-signature support for payments
- [x] Stellar assets (USDC, EURT) balance display
- [ ] Push notifications via WebSocket
- [x] Payment analytics dashboard (charts + graphs)
- [ ] Batch payment processing
- [ ] Mobile app (React Native)
- [ ] Subgraph integration (The Graph)

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Stellar Development Foundation** — For the Soroban smart contract platform
- **Freighter Wallet** — For the browser extension wallet
- **Next.js Team** — For the React framework

---

<div align="center">
  <p>Built with ❤️ for the Stellar Ecosystem</p>
  <p>
    <a href="https://stellar.org">Stellar</a> •
    <a href="https://soroban.stellar.org">Soroban</a> •
    <a href="https://freighter.app">Freighter</a>
  </p>
</div>
