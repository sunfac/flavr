
#!/bin/bash

echo "🚀 Starting Flavr in production mode..."

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ No production build found. Running build first..."
    npm run build
    
    if [ $? -ne 0 ]; then
        echo "❌ Build failed. Exiting."
        exit 1
    fi
fi

# Set production environment
export NODE_ENV=production

# Start the application
echo "✅ Starting production server..."
npm run start
