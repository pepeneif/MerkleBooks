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
│   ├── ErrorBoundary.tsx       # Comprehensive error handling system
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
    ├── currency.ts             # Jupiter API integration and exchange rates
    ├── secure-logger.ts        # Security-aware logging system
    ├── security-config.ts      # Centralized security configuration
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

### 5. Security-First Architecture
- **Decision**: Comprehensive security layer with centralized configuration
- **Rationale**: Protect against common vulnerabilities, sanitize sensitive data
- **Implementation**: [`security-config.ts`](../../../src/utils/security-config.ts) and [`secure-logger.ts`](../../../src/utils/secure-logger.ts)

### 6. Error Boundary Strategy
- **Decision**: Specialized error boundaries for different application areas
- **Rationale**: Graceful degradation, better user experience, secure error handling
- **Implementation**: [`ErrorBoundary.tsx`](../../../src/components/ErrorBoundary.tsx) with multiple boundary types

### 7. External API Integration
- **Decision**: Jupiter API for real-time exchange rates with robust fallbacks
- **Rationale**: Live pricing data essential for accounting, fallbacks ensure reliability
- **Implementation**: [`currency.ts`](../../../src/utils/currency.ts) with caching and retry logic

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

### 5. Error Boundary Pattern
- **Specialized Boundaries**: [`ErrorBoundary.tsx`](../../../src/components/ErrorBoundary.tsx) - Currency, Transaction, Settings boundaries
- **Recovery Mechanisms**: User-friendly error states with retry functionality
- **Security Considerations**: Sanitized error reporting, no sensitive data exposure

### 6. Security Configuration Pattern
- **Centralized Security**: [`security-config.ts`](../../../src/utils/security-config.ts) - Single source of truth for security settings
- **Validation Functions**: Built-in validation for user inputs and API responses
- **Rate Limiting**: Exponential backoff and request throttling

### 7. Secure Logging Pattern
- **Structured Logging**: [`secure-logger.ts`](../../../src/utils/secure-logger.ts) - Context-aware logging with security filtering
- **Data Sanitization**: Automatic redaction of sensitive fields
- **Performance Monitoring**: Built-in performance tracking and API monitoring

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
Jupiter API ←→ currency.ts ←→ Exchange Rate Cache
                     ↓
Solana RPC ←→ Custom Hooks ←→ Components
                     ↓              ↓
                localStorage ←→ Security Layer
                (via storage.ts)  (security-config.ts)
                     ↓
                Secure Logger ←→ Error Boundaries
                (secure-logger.ts)  (ErrorBoundary.tsx)
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

### 4. Currency and Exchange Rate System
**Path**: [`currency.ts`](../../../src/utils/currency.ts) → Jupiter API → Components

**Flow**:
1. `getExchangeRates()` fetches live rates from Jupiter API
2. Implements caching with TTL and fallback mechanisms
3. `convertTokenToBaseCurrency()` handles USD/SOL conversions
4. Rate limiting and retry logic with exponential backoff
5. Components receive formatted currency data

### 5. Security and Logging System
**Path**: [`security-config.ts`](../../../src/utils/security-config.ts) → [`secure-logger.ts`](../../../src/utils/secure-logger.ts) → All components

**Flow**:
1. Centralized security configuration provides limits and validation
2. Secure logger sanitizes sensitive data before logging
3. Input validation functions prevent common vulnerabilities
4. Performance and API monitoring throughout application

### 6. Error Handling System
**Path**: [`ErrorBoundary.tsx`](../../../src/components/ErrorBoundary.tsx) → [`App.tsx`](../../../src/App.tsx) → Components

**Flow**:
1. Specialized error boundaries wrap different application areas
2. Secure error logging with sanitization
3. User-friendly error states with recovery actions
4. Development vs production error display modes

### 7. Theme and UI System
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
- Jupiter API rate limiting with exponential backoff
- Configurable timeout and retry mechanisms

### 2. Memory Management
- Transaction limits per fetch operation
- Efficient data merging for duplicate prevention
- Lazy loading of token metadata
- Exchange rate caching with size limits and TTL
- Automatic cache cleanup when size limits exceeded

### 3. User Experience
- Loading states during blockchain operations
- Graceful error handling for RPC failures
- Responsive design for mobile compatibility
- Error boundaries prevent application crashes
- Fallback mechanisms for external API failures

### 4. Security Performance
- Input validation to prevent processing malicious data
- Sanitized logging to prevent sensitive data exposure
- Request validation to prevent API abuse
- Memory-efficient error handling and logging

## Integration Points

### 1. Solana Blockchain
- **RPC Endpoints**: Configurable through Settings
- **Networks**: Support for devnet, testnet, mainnet-beta, custom
- **Token Support**: SOL + SPL tokens with metadata

### 2. Wallet Adapters
- **Supported**: Phantom, Solflare, Torus
- **Auto-connect**: Configurable connection behavior
- **Multi-wallet**: Support for monitoring multiple addresses

### 3. Jupiter Price API
- **Exchange Rates**: Real-time cryptocurrency pricing data
- **Fallback Rates**: Static fallback rates when API unavailable
- **Caching Strategy**: TTL-based caching with automatic refresh
- **Rate Limiting**: Request throttling and retry mechanisms
- **Data Validation**: Response structure and price validation

### 4. Browser APIs
- **localStorage**: Primary data persistence
- **Clipboard**: Address copying functionality
- **File System**: Export/import operations
- **AbortController**: Request timeout handling