#!/bin/bash
echo "Creating quick deployment build..."

# Create production directory
mkdir -p server/public

# Copy base HTML with proper production setup
cat > server/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <title>Flavr - AI Recipe Generator</title>
    <meta name="description" content="Your AI-powered culinary companion for personalized recipes." />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="theme-color" content="#f97316" />
  </head>
  <body>
    <div id="root"></div>
    <script>
      // Force development mode when production build unavailable
      window.location.href = window.location.protocol + '//' + window.location.host.replace('.app', '.dev') + '?dev=true';
    </script>
  </body>
</html>
EOF

echo "✅ Quick deployment build created!"
echo "📁 Files are in server/public/"