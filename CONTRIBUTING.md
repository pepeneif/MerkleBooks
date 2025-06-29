# Contributing to Merkle.Space (SolBooks)

Thank you for your interest in contributing to Merkle.Space! We welcome contributions from developers of all skill levels who want to help improve Solana accounting software.

## 🎯 Project Overview

Merkle.Space (internally known as SolBooks) is a privacy-first Solana accounting application that helps users track, classify, and manage cryptocurrency transactions. The project emphasizes security, user experience, and comprehensive error handling.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- A Solana wallet (Phantom recommended for testing)
- Basic knowledge of React, TypeScript, and Solana

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/solbooks.git
   cd solbooks
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Open in Browser**
   ```
   http://localhost:5173
   ```

## 🏗️ Architecture Guidelines

### Security First
- **Always use the centralized security configuration** from `src/utils/security-config.ts`
- **Add secure logging** using `src/utils/secure-logger.ts` for new features
- **Validate all inputs** using the provided validation functions
- **Sanitize sensitive data** in logs and error messages

### Error Handling
- **Wrap new components** in appropriate error boundaries
- **Use specialized error boundaries** for different application areas:
  - `CurrencyErrorBoundary` for exchange rate operations
  - `TransactionErrorBoundary` for transaction processing
  - `SettingsErrorBoundary` for configuration changes
- **Provide graceful fallbacks** for API failures

### External API Integration
- **Follow Jupiter API patterns** established in `src/utils/currency.ts`
- **Implement rate limiting** with exponential backoff
- **Add fallback mechanisms** for when APIs are unavailable
- **Cache responses** appropriately with TTL and size limits

### Component Development
- **Use TypeScript** for all new code
- **Follow existing patterns** in the codebase
- **Ensure mobile responsiveness** with Tailwind CSS
- **Add appropriate loading states** for async operations

## 📝 Code Style

### TypeScript Standards
- Use strict TypeScript configuration
- Define interfaces for all data structures
- Leverage type safety for API responses
- Document complex types with comments

### React Patterns
- Use functional components with hooks
- Implement custom hooks for reusable logic
- Use Context sparingly (theme, wallet only)
- Memoize expensive operations with `useMemo`/`useCallback`

### Styling Guidelines
- Use Tailwind CSS utility classes
- Follow the Apple-inspired design system
- Ensure dark/light theme compatibility
- Maintain responsive design patterns

### Security Practices
```typescript
// ✅ Good: Use centralized security config
import { SECURITY_CONFIG, validateWalletName } from '../utils/security-config';

if (!validateWalletName(walletName)) {
  throw new Error('Invalid wallet name');
}

// ✅ Good: Use secure logging
import { logError, logInfo } from '../utils/secure-logger';

logInfo('Wallet connected', { walletCount: wallets.length }, {
  component: 'WalletManager',
  function: 'connectWallet'
});

// ❌ Bad: Direct console logging of sensitive data
console.log('User data:', { privateKey: key, apiKey: token });
```

## 🧪 Testing Guidelines

### Manual Testing Requirements
- Test with multiple wallet types (Phantom, Solflare, Torus)
- Verify functionality on desktop and mobile
- Test with different network conditions
- Ensure graceful error handling

### Browser Compatibility
- Test on Chrome, Firefox, Safari, Edge
- Verify localStorage functionality
- Check WebCrypto API compatibility
- Test clipboard operations

### Error Scenarios
- Network disconnection during operations
- API rate limiting responses
- Invalid transaction data
- Wallet connection failures

## 📦 Feature Development

### Adding New Features

1. **Plan the Architecture**
   - Consider security implications
   - Design error handling strategy
   - Plan external API integrations
   - Define data persistence needs

2. **Implement with Security**
   - Use security configuration constants
   - Add input validation
   - Implement secure logging
   - Add appropriate error boundaries

3. **Test Thoroughly**
   - Manual testing across browsers
   - Test error scenarios
   - Verify mobile responsiveness
   - Check accessibility compliance

4. **Document Changes**
   - Update relevant memory bank files
   - Add inline code documentation
   - Update user-facing documentation

### External API Integration

When adding new external APIs:

```typescript
// Follow established patterns from currency.ts
import { SECURITY_CONFIG, calculateBackoffDelay } from '../utils/security-config';
import { logApi, logError } from '../utils/secure-logger';

const fetchWithRetry = async (url: string, retryCount = 0) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, SECURITY_CONFIG.API_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);
    
    if (!response.ok && retryCount < SECURITY_CONFIG.MAX_RETRIES) {
      const delay = calculateBackoffDelay(retryCount, 1000, 30000);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, retryCount + 1);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    logError('API request failed', error, {
      component: 'ApiService',
      function: 'fetchWithRetry'
    });
    throw error;
  }
};
```

## 🔧 Development Tools

### Available Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Recommended Extensions (VS Code)
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- ESLint
- Prettier Code Formatter

## 🐛 Bug Reports

### Before Submitting
- Check existing issues for duplicates
- Test on the latest version
- Verify the issue in multiple browsers
- Try to reproduce consistently

### Bug Report Template
```markdown
**Describe the Bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected Behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- Browser: [e.g. Chrome 91]
- OS: [e.g. macOS 12]
- Wallet: [e.g. Phantom 21.6.0]
- Network: [e.g. Mainnet-beta]

**Console Logs**
Any relevant console output (redact sensitive information).
```

## 🚀 Pull Request Process

### Before Submitting
1. **Code Quality**
   - Run `npm run lint` and fix any issues
   - Ensure TypeScript compilation succeeds
   - Follow established code patterns

2. **Testing**
   - Test manually in multiple browsers
   - Verify mobile responsiveness
   - Test error scenarios
   - Check accessibility

3. **Documentation**
   - Update relevant documentation
   - Add inline comments for complex logic
   - Update memory bank files if needed

### Pull Request Template
```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that causes existing functionality to change)
- [ ] Documentation update

## Testing
- [ ] Manual testing completed
- [ ] Multiple browsers tested
- [ ] Mobile responsiveness verified
- [ ] Error scenarios tested

## Security Checklist
- [ ] Uses centralized security configuration
- [ ] Implements secure logging
- [ ] Validates user inputs
- [ ] Handles errors gracefully
- [ ] No sensitive data in logs

## Screenshots
If applicable, add screenshots showing the changes.
```

## 📚 Resources

### Technical Documentation
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [Jupiter API Documentation](https://docs.jup.ag/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Project Resources
- Memory Bank: `.kilocode/rules/memory-bank/`
- Security Configuration: `src/utils/security-config.ts`
- Architecture Overview: `.kilocode/rules/memory-bank/architecture.md`
- Security Documentation: `SECURITY.md`

## 🤝 Community

### Communication
- Be respectful and inclusive
- Help newcomers get started
- Share knowledge and best practices
- Provide constructive feedback

### Recognition
Contributors will be recognized in:
- Release notes for significant contributions
- Project documentation
- Special thanks in major milestones

---

**Questions?** Feel free to open an issue for discussion or reach out to the maintainers.

Thank you for contributing to Merkle.Space! 🚀