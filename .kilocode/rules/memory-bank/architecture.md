# Architecture: SolBooks

## System Architecture Overview
SolBooks is a client-side React application that connects directly to Solana blockchain through RPC endpoints. No backend server is required - all data is stored locally in the browser's localStorage.

## Source Code Structure
```
src/
├── App.tsx                     # Main application component and routing
├── main.tsx                    # Application entry point
├── index.css                   # Global styles and Tailwind imports
├── vite-env.d.ts              # Vite type definitions
├── components/                 # React components
│   ├── Categories.tsx          # Category management interface
│   ├── Dashboard.tsx           # Main dashboard with stats and overview
│   ├── InvoiceManager.tsx      # Invoice creation and payment management
│   ├── Settings.tsx            # Application settings and configuration
│   ├── Sidebar.tsx             # Navigation sidebar with branding
│   ├── ThemeToggle.tsx         # Light/dark theme switcher
│   ├── TokenSelector.tsx       # Token filtering interface
│   ├── TransactionList.tsx     # Transaction display and classification
│   └── WalletConnection.tsx    # Wallet status and balance display
├── contexts/                   # React context providers
│   ├── ThemeContext.tsx        # Global theme state management
│   └── WalletContext.tsx       # Solana wallet adapter configuration
├── hooks/                      # Custom React hooks
│   ├── useTransactions.ts      # Transaction fetching and management
│   └── useWalletBalance.ts     # Balance tracking across wallets
├── types/                      # TypeScript type definitions
│   └── index.ts                # Core data models and interfaces
└── utils/                      # Utility functions
    ├── storage.ts              # localStorage abstraction layer
    └── tokens.ts               # Token definitions and formatting
```

## Key Technical Decisions

### 1. Client-Side Architecture
- **Decision**: No backend server, pure client-side application
- **Rationale**: Privacy-first approach, reduced infrastructure complexity
- **Implementation**: Direct RPC connections to Solana blockchain

### 2. LocalStorage Data Persistence
- **Decision**: Browser localStorage for all data persistence
- **Rationale**: Privacy, offline capability, no server dependencies
- **Implementation**: Abstracted through [`storage.ts`](../../../src/utils/storage.ts) utilities

### 3. React Hooks State Management
- **Decision**: Built-in React hooks instead of external state management
- **Rationale**: Simpler architecture, sufficient for application scope
- **Implementation**: Custom hooks for business logic, Context for global state

### 4. Wallet Integration Strategy
- **Decision**: Solana Wallet Adapter for multi-wallet support
- **Rationale**: Standard industry solution, supports multiple wallet types
- **Implementation**: [`WalletContext.tsx`](../../../src/contexts/WalletContext.tsx) provides connection

## Design Patterns in Use

### 1. Context Provider Pattern
- **Theme Management**: [`ThemeContext.tsx`](../../../src/contexts/ThemeContext.tsx) - Global light/dark mode
- **Wallet Integration**: [`WalletContext.tsx`](../../../src/contexts/WalletContext.tsx) - Solana wallet connections

### 2. Custom Hooks Pattern
- **Transaction Logic**: [`useTransactions.ts`](../../../src/hooks/useTransactions.ts) - Fetching, classification, filtering
- **Balance Management**: [`useWalletBalance.ts`](../../../src/hooks/useWalletBalance.ts) - Multi-wallet balance tracking

### 3. Storage Abstraction Pattern
- **Data Layer**: [`storage.ts`](../../../src/utils/storage.ts) - Centralized localStorage operations
- **Type Safety**: Consistent interfaces for data import/export

### 4. Component Composition Pattern
- **Page Structure**: [`App.tsx`](../../../src/App.tsx) composes Sidebar + dynamic content
- **Reusable Components**: TransactionList used in Dashboard and Transactions pages

## Component Relationships

### Core Application Flow
```
App.tsx
├── ThemeProvider (ThemeContext)
└── WalletContextProvider (WalletContext)
    ├── Sidebar (navigation)
    └── Main Content (dynamic based on currentPage)
        ├── Dashboard
        ├── TransactionList  
        ├── InvoiceManager
        ├── Settings
        └── Categories
```

### Data Flow Architecture
```
Solana RPC ←→ Custom Hooks ←→ Components
                     ↓
                localStorage (via storage.ts)
```

## Critical Implementation Paths

### 1. Transaction Fetching Pipeline
**Path**: [`useTransactions.ts`](../../../src/hooks/useTransactions.ts) → [`storage.ts`](../../../src/utils/storage.ts) → [`TransactionList.tsx`](../../../src/components/TransactionList.tsx)

**Flow**:
1. `fetchAllTransactions()` gets configured wallets
2. Fetches SOL transactions via `getSignaturesForAddress()`
3. Fetches SPL tokens via `getParsedTokenAccountsByOwner()`
4. Merges with existing classified transactions from localStorage
5. Components receive filtered/processed transactions

### 2. Balance Tracking System
**Path**: [`useWalletBalance.ts`](../../../src/hooks/useWalletBalance.ts) → [`WalletConnection.tsx`](../../../src/components/WalletConnection.tsx)

**Flow**:
1. `fetchAllBalances()` iterates through active wallets
2. Calls `connection.getBalance()` for each wallet
3. Aggregates total balance across all monitored wallets
4. Real-time updates through periodic polling

### 3. Data Persistence Layer
**Path**: [`storage.ts`](../../../src/utils/storage.ts) ← All components

**Operations**:
- `saveTransactions()` / `loadTransactions()` - Transaction data
- `saveInvoices()` / `loadInvoices()` - Invoice management
- `saveWalletConfigs()` / `loadWalletConfigs()` - Wallet monitoring
- `exportData()` / `importData()` - Backup/restore functionality

### 4. Theme and UI System
**Path**: [`ThemeContext.tsx`](../../../src/contexts/ThemeContext.tsx) → All components

**Implementation**:
- CSS classes toggle based on `isDark` state
- Persisted to localStorage as `merkle-space-theme`
- Apple-inspired design system via Tailwind CSS

## Performance Optimizations

### 1. Rate Limiting Protection
- Debounced transaction fetching (5-second delays)
- Batch processing of blockchain requests
- Request delays between wallet iterations

### 2. Memory Management
- Transaction limits per fetch operation
- Efficient data merging for duplicate prevention
- Lazy loading of token metadata

### 3. User Experience
- Loading states during blockchain operations
- Graceful error handling for RPC failures
- Responsive design for mobile compatibility

## Integration Points

### 1. Solana Blockchain
- **RPC Endpoints**: Configurable through Settings
- **Networks**: Support for devnet, testnet, mainnet-beta, custom
- **Token Support**: SOL + SPL tokens with metadata

### 2. Wallet Adapters
- **Supported**: Phantom, Solflare, Torus
- **Auto-connect**: Configurable connection behavior
- **Multi-wallet**: Support for monitoring multiple addresses

### 3. Browser APIs
- **localStorage**: Primary data persistence
- **Clipboard**: Address copying functionality
- **File System**: Export/import operations