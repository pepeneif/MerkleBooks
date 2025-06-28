# Product Overview: SolBooks

## Why This Project Exists
SolBooks addresses a fundamental gap in Solana wallet ecosystem - the inability to properly label, categorize, and manage crypto transactions for accounting purposes. While wallets like Phantom excel at transaction execution, they fail at transaction organization and financial management.

## Problems It Solves
1. **Transaction Context Loss**: Users forget what transactions were for
2. **Accounting Complexity**: No built-in categorization for income/expenses
3. **Multi-Wallet Management**: Difficulty tracking across multiple addresses
4. **Tax Preparation**: No easy way to export classified transaction data
5. **Invoice Management**: No professional invoicing for Solana payments
6. **Data Portability**: Wallet data locked in proprietary formats

## How It Should Work
### Core User Workflow
1. **Setup**: Connect wallet(s) and configure monitoring addresses
2. **Auto-Import**: Transactions automatically fetched from configured wallets
3. **Classification**: Users classify transactions as income/expense with categories
4. **Notes & Context**: Add custom notes and descriptions to transactions
5. **Dashboard**: View aggregated balances, income, expenses across all wallets
6. **Invoice Management**: Create and send professional payment requests
7. **Data Export**: Export classified data for tax/accounting purposes

### User Experience Goals
- **Intuitive**: Should feel familiar to users of modern accounting software
- **Fast**: Real-time updates with minimal loading states
- **Beautiful**: Apple-inspired design that users enjoy using daily
- **Reliable**: Robust error handling and offline-first data storage
- **Privacy-Focused**: No external servers, all data stored locally
- **Professional**: Generate reports and invoices suitable for business use

## Key Features Implementation Status
### ✅ Implemented Core Features
- Multi-wallet connection and monitoring
- Automatic transaction fetching for SOL and SPL tokens
- Transaction classification with categories and notes
- Real-time balance tracking across wallets
- Professional invoice creation and payment
- Data export/import for backup and portability
- Responsive design with light/dark themes
- RPC endpoint configuration for reliability

### 📋 Current Functionality
- **Dashboard**: Aggregated stats, token-specific breakdowns, unclassified transaction counts
- **Transactions**: Comprehensive list with classification UI, filtering, refresh capabilities
- **Invoices**: Create, send, track payment status with Solana integration
- **Categories**: Basic category management (currently simple implementation)
- **Settings**: Wallet management, RPC configuration, data management
- **Multi-Token Support**: Handles SOL, USDC, USDT, mSOL, ETH, BTC, BONK, JUP and unknown tokens

### 🎯 Target User Types
1. **Crypto Freelancers**: Need to track payments and expenses for tax purposes
2. **DeFi Users**: Want to categorize yields, trades, and protocol interactions
3. **Small Businesses**: Accept Solana payments and need accounting records
4. **Individual Investors**: Track portfolio performance and transaction history
5. **Developers**: Monitor multiple wallets across different projects