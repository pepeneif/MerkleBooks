#!/bin/bash

# Create a temporary directory for the project
mkdir -p solbooks-download

# Copy all project files
cp -r src solbooks-download/
cp package.json solbooks-download/
cp package-lock.json solbooks-download/ 2>/dev/null || true
cp tsconfig.json solbooks-download/
cp tsconfig.app.json solbooks-download/
cp tsconfig.node.json solbooks-download/
cp vite.config.ts solbooks-download/
cp tailwind.config.js solbooks-download/
cp postcss.config.js solbooks-download/
cp eslint.config.js solbooks-download/
cp index.html solbooks-download/
cp README.md solbooks-download/
cp src/index.css solbooks-download/src/ 2>/dev/null || true

# Create .gitignore
cat > solbooks-download/.gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
dist/
build/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port
EOF

echo "✅ Project files copied to solbooks-download/"
echo "📁 You can now download the entire solbooks-download folder"