# Deployment Guide

This guide explains how to build and deploy Merkle.Space (SolBooks) for production use.

## 🏗️ Building for Production

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Build Process

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd SolBooks
   npm install
   ```

2. **Build Production Bundle**
   ```bash
   npm run build
   ```

3. **Preview Production Build** (Optional)
   ```bash
   npm run preview
   ```

The production build will be created in the `dist/` directory.

## 🌐 Deployment Options

### Static Hosting Services

Since Merkle.Space is a client-side application, it can be deployed on any static hosting service.

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Configuration**: Vercel auto-detects Vite projects. No additional configuration needed.

#### Netlify
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Deploy

**Build Settings**:
- Build command: `npm run build`
- Publish directory: `dist`

#### GitHub Pages
```bash
# Install gh-pages
npm install --save-dev gh-pages

# Add to package.json scripts
"deploy": "gh-pages -d dist"

# Build and deploy
npm run build
npm run deploy
```

#### AWS S3 + CloudFront
1. Build the project: `npm run build`
2. Upload `dist/` contents to S3 bucket
3. Configure S3 for static website hosting
4. Set up CloudFront for HTTPS and caching

### Custom Server Deployment

#### Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /path/to/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
}
```

#### Apache
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/dist
    
    <Directory /path/to/dist>
        Options -Indexes
        AllowOverride All
        Require all granted
        
        # Handle client-side routing
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    # Security headers
    Header always set X-Frame-Options DENY
    Header always set X-Content-Type-Options nosniff
    Header always set X-XSS-Protection "1; mode=block"
</VirtualHost>
```

## 🔒 Security Considerations

### HTTPS Requirements
- **Always use HTTPS** in production
- Solana wallet integrations require secure contexts
- Configure proper SSL certificates

### Security Headers
Ensure your server includes these security headers:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
```

### Domain Configuration
- Configure proper CORS policies if needed
- Ensure wallet adapters work with your domain
- Test wallet connections on the deployed domain

## ⚙️ Environment Configuration

### Build-time Configuration
The application uses build-time configuration. No runtime environment variables needed.

### Network Configuration
Users can configure RPC endpoints through the application UI:
- Devnet (default for development)
- Testnet
- Mainnet-beta (production)
- Custom RPC endpoints

### Jupiter API
- No API keys required for Jupiter Price API
- Rate limiting handled automatically
- Fallback rates included for offline operation

## 🚀 Optimization

### Performance Optimizations
- Vite automatically optimizes the build
- Code splitting for better loading
- Asset optimization and compression
- Tree shaking removes unused code

### Bundle Analysis
```bash
# Analyze bundle size
npm run build -- --analyze
```

### CDN Configuration
If using a CDN, configure caching headers:
- Static assets: Cache for 1 year
- HTML files: Cache for 1 hour or less
- Service worker: No cache

## 📊 Monitoring

### Client-Side Monitoring
The application includes built-in logging:
- Performance monitoring
- Error tracking with sanitization
- API response monitoring
- Security event logging

### Analytics Considerations
- No analytics included by default (privacy-first)
- Users' sensitive data never leaves their browser
- Consider privacy-respecting analytics if needed

## 🔧 Troubleshooting

### Common Issues

#### Wallet Connection Issues
- Ensure HTTPS is properly configured
- Check that the domain is accessible
- Verify wallet extensions are installed
- Test with multiple wallet types

#### API Rate Limiting
- Jupiter API rate limiting is handled automatically
- Fallback rates ensure continued operation
- Monitor console for rate limit warnings

#### Loading Issues
- Check browser console for errors
- Verify all assets are properly served
- Ensure client-side routing works
- Test localStorage functionality

#### Performance Issues
- Monitor bundle size with build analysis
- Check network tab for slow-loading assets
- Verify CDN configuration if used
- Test on various devices and connections

### Debug Mode
Enable debug logging by opening browser console and setting:
```javascript
localStorage.setItem('debug', 'true');
```

## 📱 Mobile Considerations

### Progressive Web App (PWA)
The application is mobile-responsive but not currently a PWA. To add PWA features:

1. Add service worker
2. Create web app manifest
3. Implement offline capabilities
4. Add app installation prompts

### Mobile Testing
- Test on various mobile devices
- Verify touch interactions work properly
- Check responsive design breakpoints
- Test wallet connections on mobile browsers

## 🔄 Updates and Maintenance

### Updating Dependencies
```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Rebuild and test
npm run build
npm run preview
```

### Security Updates
- Monitor dependencies for security vulnerabilities
- Update Solana Web3.js regularly
- Keep wallet adapters updated
- Review security logs periodically

### Performance Monitoring
- Monitor application performance
- Check for memory leaks in long-running sessions
- Monitor external API response times
- Track error rates and patterns

---

## 📞 Support

For deployment issues:
1. Check the troubleshooting section above
2. Review application logs in browser console
3. Test with different networks and wallets
4. Create an issue with deployment details

**Remember**: Always test thoroughly on your deployed domain before going live, especially wallet connections and API integrations.