import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// Deployment helper functions removed during pruning
// import { setupVoiceChat } from "./voiceChat";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Ensure proper handling of module requests - don't interfere with Vite's module transformation
app.use((req, res, next) => {
  const url = req.originalUrl;
  
  // Only set MIME types for actual static files, not Vite-transformed modules
  if (url.startsWith('/client/public/') || url.startsWith('/public/')) {
    if (url.endsWith('.js') || url.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (url.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (url.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    }
  }
  
  next();
});

// Add stable headers for both development and production
app.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Deployment configuration removed during pruning

  // Check if we're in production mode and have a build
  const isProduction = process.env.NODE_ENV === "production" || app.get("env") === "production" || process.env.REPLIT_DEPLOYMENT === "true";
  const distPublicDir = path.resolve(import.meta.dirname, "..", "dist", "public");
  const hasBuild = fs.existsSync(distPublicDir) && fs.existsSync(path.join(distPublicDir, "index.html"));

  if (isProduction && hasBuild) {
    log("Production mode detected with valid build - serving static files");
    // Serve static files from production build
    app.use(express.static(distPublicDir, {
        setHeaders: (res, filePath) => {
          // Set proper MIME types
          const ext = path.extname(filePath);
          if (ext === '.js' || ext === '.mjs' || ext === '.jsx' || ext === '.tsx') {
            res.setHeader('Content-Type', 'application/javascript');
          } else if (ext === '.css') {
            res.setHeader('Content-Type', 'text/css');
          } else if (filePath.endsWith('manifest.json')) {
            res.setHeader('Content-Type', 'application/manifest+json');
          } else if (ext === '.json') {
            res.setHeader('Content-Type', 'application/json');
          } else if (filePath.endsWith('service-worker.js') || filePath.endsWith('.worker.js')) {
            res.setHeader('Content-Type', 'application/javascript');
          } else if (ext === '.html') {
            res.setHeader('Content-Type', 'text/html');
          }
        }
      }));
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPublicDir, "index.html"));
    });
  } else if (isProduction) {
    // Production fallback - serve development files directly with production optimizations
    log("Production fallback mode - serving development files with optimizations");
    
    const clientDir = path.resolve(import.meta.dirname, "..", "client");
    
    // Create production-ready index.html handler
    const serveProductionHTML = (req: any, res: any) => {
      try {
        const indexPath = path.join(clientDir, "index.html");
        let html = fs.readFileSync(indexPath, "utf-8");
        
        // Inject production environment variables and optimizations
        html = html.replace(
          '<head>',
          `<head>
          <base href="/">
          <meta name="robots" content="index,follow">
          <script>
            window.__FLAVR_ENV__ = 'production';
            window.__PRODUCTION_FALLBACK__ = true;
            
            // Prevent refresh loops
            if (window.location.search.includes('refresh')) {
              window.history.replaceState({}, '', window.location.pathname);
            }
            
            // Enhanced error handling for production
            window.addEventListener('error', function(e) {
              console.error('Production error:', e.error);
            });
          </script>`
        );
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        console.error("Error serving production HTML:", error);
        res.status(500).send("Application temporarily unavailable");
      }
    };
    
    // Serve root route
    app.get("/", serveProductionHTML);
    
    // Serve static assets with proper headers
    app.use(express.static(clientDir, {
      maxAge: "1h",
      index: false,
      setHeaders: (res, filePath) => {
        const ext = path.extname(filePath);
        if (ext === '.js' || ext === '.jsx' || ext === '.ts' || ext === '.tsx') {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (ext === '.css') {
          res.setHeader('Content-Type', 'text/css');
        }
      }
    }));
    
    // Handle SPA routes (non-API routes)
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api/") || req.path.startsWith("/src/") || req.path.startsWith("/@")) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      serveProductionHTML(req, res);
    });
  } else {
    log("Development mode or no build found - using Vite dev server");
    await setupVite(app, server);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})().catch((error) => {
  console.error("Server startup error:", error);
  process.exit(1);
});