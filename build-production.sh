#!/bin/bash
echo "Building production version of Flavr..."

# Clear any existing builds
rm -rf dist/
rm -rf server/public/

# Build the client application
echo "Building client application..."
npm run build

# Check if build was successful
if [ -d "dist/public" ] && [ -f "dist/public/index.html" ]; then
    echo "✅ Production build completed successfully!"
    echo "📁 Built files are in dist/public/"
    ls -la dist/public/
else
    echo "❌ Build failed - dist/public not created"
    exit 1
fi

echo "🚀 Ready for deployment!"