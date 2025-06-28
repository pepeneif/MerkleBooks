# Technology Stack: SolBooks

## Core Technologies Used

### Frontend Framework
- **React 18.3.1**: Modern functional components with hooks
- **TypeScript 5.5.3**: Full type safety and developer experience
- **Vite 5.4.2**: Lightning-fast build tool and dev server
- **JSX/TSX**: Component templating with type safety

### Styling & Design System
- **Tailwind CSS 3.4.1**: Utility-first CSS framework
- **PostCSS 8.4.35**: CSS processing and autoprefixer
- **Apple-inspired Design**: Custom color palette and glass morphism effects
- **Responsive Design**: Mobile-first approach with breakpoints
- **Dark/Light Themes**: CSS class-based theme switching

### Blockchain Integration
- **@solana/web3.js 1.87.6**: Core Solana blockchain interactions
- **@solana/wallet-adapter-react 0.15.35**: React wallet integration
- **@solana/wallet-adapter-react-ui 0.9.35**: Pre-built wallet UI components
- **@solana/wallet-adapter-wallets 0.19.32**: Multi-wallet support (Phantom, Solflare, Torus)
- **@solana/wallet-adapter-base 0.9.23**: Base wallet adapter functionality

### UI Components & Icons
- **Lucide React 0.344.0**: Beautiful, customizable SVG icons
- **Recharts 2.12.7**: Chart library for data visualization
- **Custom Components**: Built from scratch using Tailwind

### Development Tools
- **ESLint 9.9.1**: Code linting and formatting
- **TypeScript ESLint 8.3.0**: TypeScript-specific linting rules
- **@vitejs/plugin-react 4.3.1**: Vite React plugin
- **Globals 15.9.0**: Global type definitions

## Development Setup

### Prerequisites
- **Node.js 18+**: Modern JavaScript runtime
- **npm or yarn**: Package manager
- **Solana wallet**: Phantom recommended for testing

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Runs on http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Build Configuration
- **Vite Config**: [`vite.config.ts`](../../../vite.config.ts)
  - React plugin enabled
  - Lucide React excluded from optimization for better performance
- **TypeScript Config**: Multiple config files for different contexts
  - `tsconfig.json`: Main configuration
  - `tsconfig.app.json`: Application-specific settings
  - `tsconfig.node.json`: Node.js environment settings

### Tailwind Configuration
- **Config File**: [`tailwind.config.js`](../../../tailwind.config.js)
- **Dark Mode**: CSS class-based (`darkMode: 'class'`)
- **Custom Colors**: Apple-inspired gray palette
- **Animations**: Custom fade-in and slide-up animations
- **Backdrop Blur**: Extended blur utilities for glass effects

## Technical Constraints

### Browser Requirements
- **Modern Browsers**: ES6+ support required
- **LocalStorage**: Must support localStorage for data persistence
- **WebCrypto**: Required for wallet cryptographic operations
- **Fetch API**: For RPC communication with Solana blockchain

### Blockchain Limitations
- **RPC Rate Limits**: Public endpoints have request limits
- **Transaction Fees**: Users pay SOL for transaction gas
- **Network Latency**: Blockchain operations have inherent delays
- **Token Metadata**: Some tokens may lack complete metadata

### Performance Considerations
- **Client-Side Only**: No server-side rendering or API
- **Memory Usage**: Large transaction histories consume browser memory
- **Storage Limits**: localStorage has ~5-10MB browser limits
- **Concurrent Requests**: Rate limiting prevents parallel blockchain calls

## Key Dependencies Analysis

### Production Dependencies
```json
{
  "@solana/wallet-adapter-base": "^0.9.23",
  "@solana/wallet-adapter-react": "^0.15.35", 
  "@solana/wallet-adapter-react-ui": "^0.9.35",
  "@solana/wallet-adapter-wallets": "^0.19.32",
  "@solana/web3.js": "^1.87.6",
  "lucide-react": "^0.344.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "recharts": "^2.12.7"
}
```

### Development Dependencies
- **Linting**: ESLint with React hooks and TypeScript plugins
- **Build Tools**: Vite with React plugin and TypeScript support
- **CSS Processing**: Tailwind, PostCSS, Autoprefixer
- **Type Definitions**: React and React DOM types

## Tool Usage Patterns

### State Management
- **React Hooks**: useState, useEffect, useCallback, useMemo
- **Custom Hooks**: Business logic abstraction (useTransactions, useWalletBalance)
- **Context API**: Global state for theme and wallet connection
- **No External Store**: Redux/Zustand not needed for current scope

### Data Persistence
- **LocalStorage**: Primary storage mechanism
- **JSON Serialization**: All data stored as JSON strings
- **Type Safety**: TypeScript interfaces for all stored data
- **Migration Strategy**: Version field in exported data for future compatibility

### API Communication
- **Fetch API**: Direct RPC calls to Solana blockchain
- **No GraphQL**: Direct JSON-RPC communication
- **Error Handling**: Try-catch blocks with user-friendly messages
- **Retry Logic**: Built-in retry for failed blockchain requests

### Code Organization
- **Feature-Based**: Components grouped by functionality
- **Type Definitions**: Centralized in `src/types/index.ts`
- **Utility Functions**: Shared logic in `src/utils/`
- **Custom Hooks**: Business logic in `src/hooks/`

### Testing Strategy
- **Manual Testing**: Primary testing approach currently
- **Type Safety**: TypeScript provides compile-time error checking
- **Browser Testing**: Cross-browser compatibility testing
- **No Unit Tests**: Could be added with Jest/Vitest in future

## Performance Optimizations

### Bundle Optimization
- **Vite Tree Shaking**: Unused code elimination
- **Code Splitting**: Dynamic imports where beneficial
- **Asset Optimization**: Automatic image and CSS optimization
- **Lucide Exclusion**: Prevents optimization issues with icon library

### Runtime Performance
- **Memoization**: useMemo and useCallback for expensive operations
- **Debouncing**: Prevents excessive API calls
- **Batch Processing**: Groups blockchain requests
- **Lazy Loading**: Components and data loaded on demand

### User Experience
- **Loading States**: Visual feedback during async operations
- **Progressive Enhancement**: Works without JavaScript for basic viewing
- **Responsive Design**: Optimized for all screen sizes
- **Accessibility**: Semantic HTML and keyboard navigation support

## Integration Patterns

### Wallet Integration
- **Multi-Adapter**: Support for multiple wallet providers
- **Auto-Connection**: Configurable automatic wallet connection
- **Error Boundaries**: Graceful handling of wallet connection issues
- **Event Handling**: React to wallet connection/disconnection events

### Blockchain Integration
- **RPC Abstraction**: Configurable RPC endpoints
- **Network Support**: Devnet, Testnet, Mainnet-beta, Custom
- **Transaction Parsing**: Both SOL and SPL token support
- **Metadata Fetching**: Token logos and information retrieval

### Theme Integration
- **CSS Variables**: Dynamic theme switching
- **System Preference**: Respects user's OS theme preference
- **Persistence**: Theme choice saved to localStorage
- **Component Integration**: All components support both themes