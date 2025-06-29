import fs from "fs";
import path from "path";

export function ensureDeploymentReady(): boolean {
  const distPublicDir = path.resolve(import.meta.dirname, "..", "dist", "public");
  const serverPublicDir = path.resolve(import.meta.dirname, "public");

  // Check if Vite build exists in dist/public
  if (fs.existsSync(distPublicDir)) {
    const indexExists = fs.existsSync(path.join(distPublicDir, "index.html"));
    if (indexExists) {
      console.log("Production build found in dist/public, using static files");
      return true;
    }
  }

  // Check if manual build exists in server/public
  if (fs.existsSync(serverPublicDir)) {
    const indexExists = fs.existsSync(path.join(serverPublicDir, "index.html"));
    if (indexExists) {
      console.log("Production build found in server/public, using static files");
      return true;
    }
  }

  console.log("No production build found, will use development mode");
  return false;
}

export function createMinimalBuild(): void {
  const publicDir = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Clear existing files to ensure fresh deployment
  try {
    const files = fs.readdirSync(publicDir);
    files.forEach(file => {
      const filePath = path.join(publicDir, file);
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      } else {
        fs.rmSync(filePath, { recursive: true, force: true });
      }
    });
    console.log("Cleared existing production files for fresh deployment");
  } catch (error) {
    // Directory might be empty, that's fine
  }

  // Create a lightweight production redirect that works with Vite dev server
  const productionHTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <title>Flavr - AI Recipe Generator</title>
    <meta name="description" content="Your AI-powered culinary companion for personalized recipes. Transform your kitchen into a culinary playground." />

    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json" />

    <!-- Theme colors -->
    <meta name="theme-color" content="#f97316" />
    <meta name="msapplication-TileColor" content="#f97316" />

    <!-- iOS PWA support -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Flavr" />
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />

    <!-- Standard favicon -->
    <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />

    <!-- Prevent deployment caching issues -->
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    
    <!-- Redirect to main app in production deployments -->
    <script>
      // If we're in a deployed environment (not localhost), redirect to Vite dev server
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        window.location.href = '/';
      }
    </script>
  </head>
  <body style="background: #0f172a; color: #f8fafc; font-family: system-ui;">
    <div id="root">
      <div style="
        position: fixed;
        inset: 0;
        background: linear-gradient(135deg, #1e293b, #0f172a);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="text-align: center; color: white;">
          <div style="
            width: 60px;
            height: 60px;
            margin: 0 auto 20px;
            border: 4px solid rgba(249, 115, 22, 0.3);
            border-top: 4px solid #f97316;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></div>
          <h1 style="font-size: 2rem; margin-bottom: 10px; color: #f97316;">Flavr</h1>
          <p style="color: #94a3b8; font-size: 0.9rem;">Starting your culinary companion...</p>
        </div>
      </div>
    </div>

    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  </body>
</html>`;

  fs.writeFileSync(path.join(publicDir, 'index.html'), productionHTML);

  // Copy essential static files
  const clientPublicDir = path.resolve(import.meta.dirname, "..", "client", "public");

  if (fs.existsSync(clientPublicDir)) {
    try {
      const files = fs.readdirSync(clientPublicDir, { withFileTypes: true });
      files.forEach(file => {
        if (file.name === 'index.html') return; // Skip, we use our custom one

        const sourcePath = path.join(clientPublicDir, file.name);
        const targetPath = path.join(publicDir, file.name);

        if (file.isDirectory()) {
          fs.mkdirSync(targetPath, { recursive: true });
          const subFiles = fs.readdirSync(sourcePath);
          subFiles.forEach(subFile => {
            fs.copyFileSync(path.join(sourcePath, subFile), path.join(targetPath, subFile));
          });
        } else {
          if (file.name === 'service-worker.js') {
            let content = fs.readFileSync(sourcePath, 'utf8');
            const timestamp = Date.now();
            content = content.replace(
              /const CACHE_VERSION = 'v\d+-\d+'/,
              `const CACHE_VERSION = 'v${timestamp}-${timestamp}'`
            );
            fs.writeFileSync(targetPath, content);
            console.log(`Updated service worker with timestamp: ${timestamp}`);
          } else {
            fs.copyFileSync(sourcePath, targetPath);
          }
        }
      });
      console.log("Copied client assets to production directory with cache-busting");
    } catch (error: any) {
      console.log("Could not copy client assets:", error.message);
    }
  }
}
