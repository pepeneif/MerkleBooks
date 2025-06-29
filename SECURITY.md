# Security Policy

## Overview

Merkle.Space (SolBooks) implements enterprise-grade security measures to protect user data and ensure safe operation. This document outlines our security approach and how to report security vulnerabilities.

## Security Architecture

### Client-Side Security
- **No Backend Servers**: All data processing happens locally in your browser
- **Local Storage Only**: No user data is transmitted to external servers
- **Secure Logging**: Automatic sanitization of sensitive information in logs
- **Input Validation**: All user inputs are validated and sanitized

### API Security
- **Rate Limiting**: Built-in protection against API abuse
- **Timeout Protection**: All external requests have timeout limits
- **Retry Logic**: Exponential backoff prevents service overload
- **Data Validation**: All external API responses are validated

### Error Handling
- **Error Boundaries**: Comprehensive error handling with graceful recovery
- **Sanitized Errors**: No sensitive data exposed in error messages
- **Development vs Production**: Different error detail levels
- **Recovery Mechanisms**: User-friendly retry options

## Data Protection

### Sensitive Data Handling
- **Automatic Redaction**: Sensitive fields automatically redacted from logs
- **No Analytics**: No user tracking or data collection
- **Wallet Security**: Uses official Solana wallet adapters
- **Memory Management**: Secure cleanup of sensitive data

### Privacy Measures
- **Local Processing**: All operations performed client-side
- **No Telemetry**: No usage data transmitted
- **Wallet Independence**: Works with any Solana wallet
- **Data Portability**: Full export/import capabilities

## Supported Security Features

### Input Validation
- Wallet name validation (1-100 characters)
- Note length limits (max 1000 characters)
- Category name validation (max 50 characters)
- Dust threshold validation (0.000001 - 1000)

### Rate Limiting
- Jupiter API: 10-second timeout, 3 max retries
- Solana RPC: Configurable delays between requests
- Transaction fetching: Debounced operations
- Memory limits: Automatic cache cleanup

### Error Recovery
- **Currency Operations**: Fallback to static exchange rates
- **Transaction Fetching**: Graceful handling of RPC failures
- **Wallet Connections**: Automatic reconnection attempts
- **Data Loading**: Progressive error boundaries

## Reporting Security Vulnerabilities

We take security seriously. If you discover a security vulnerability, please follow these steps:

### Responsible Disclosure
1. **Do NOT** create a public GitHub issue for security vulnerabilities
2. Contact the maintainers directly via email
3. Provide detailed information about the vulnerability
4. Allow reasonable time for a fix before public disclosure

### What to Include
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Suggested fix (if available)
- Your contact information

### Response Timeline
- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 1 week
- **Status Updates**: Weekly during investigation
- **Resolution**: Depends on severity and complexity

## Security Best Practices for Users

### Wallet Security
- Use hardware wallets when possible
- Verify wallet connection prompts
- Never share private keys or seed phrases
- Keep wallet software updated

### Browser Security
- Use updated browsers with security patches
- Enable automatic security updates
- Be cautious with browser extensions
- Clear browser data regularly

### Data Management
- Regularly export your data for backup
- Verify imported data before use
- Use secure networks for access
- Log out when using shared computers

## Security Updates

### Update Process
- Security patches released immediately when needed
- Regular security reviews of dependencies
- Automated vulnerability scanning
- Community security feedback encouraged

### Staying Informed
- Watch the repository for security announcements
- Check release notes for security updates
- Follow security best practices for web applications
- Report any suspicious behavior immediately

## Technical Security Details

### Cryptographic Standards
- Uses browser's native WebCrypto API
- Relies on Solana's cryptographic primitives
- No custom cryptographic implementations
- Standard HTTPS for all external communications

### Dependencies
- Regular dependency updates for security patches
- Minimal external dependencies
- All dependencies audited for known vulnerabilities
- Automated security scanning in CI/CD

### Code Security
- TypeScript for type safety
- ESLint for code quality
- Comprehensive error handling
- Input sanitization throughout

## Compliance

### Standards
- Follows OWASP security guidelines
- Implements defense-in-depth principles
- Regular security assessments
- Community-driven security improvements

### Transparency
- Open source for full transparency
- Public security documentation
- Community security reviews welcome
- Clear incident response procedures

---

**Last Updated**: June 2025  
**Version**: 1.0

For security concerns, please contact the maintainers directly rather than creating public issues.