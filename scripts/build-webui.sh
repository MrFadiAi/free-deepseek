#!/bin/bash
# WebUI build script
# Usage: ./scripts/build-webui.sh

set -e

echo "🔨 Building WebUI..."

cd "$(dirname "$0")/../webui"

# Check node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci --prefer-offline --no-audit
fi

# Build
echo "🏗️  Running build..."
npm run build

if [ ! -f "../static/admin/index.html" ]; then
    echo "❌ WebUI build failed: static/admin/index.html not found"
    exit 1
fi

echo "✅ WebUI built successfully!"
echo "📁 Output: static/admin/"
