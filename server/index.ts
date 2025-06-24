import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ensureDeploymentReady, createMinimalBuild } from "./deploymentHelper";
import { setupVoiceChat } from "./voiceChat";

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

  // Setup deployment configuration
  createMinimalBuild();

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Check for production build first in dist/public (standard Vite build)
    const distPublicDir = path.resolve(import.meta.dirname, "..", "dist", "public");
    const serverPublicDir = path.resolve(import.meta.dirname, "public");

    if (fs.existsSync(distPublicDir) && fs.existsSync(path.join(distPublicDir, "index.html"))) {
      log("Using standard production build from dist/public");
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
    } else if (fs.existsSync(serverPublicDir) && fs.existsSync(path.join(serverPublicDir, "index.html"))) {
      log("Using fallback production build from server/public");
      app.use(express.static(serverPublicDir, {
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
        res.sendFile(path.resolve(serverPublicDir, "index.html"));
      });
    } else {
      log("No production build found, forcing development mode in production");
      // Force development mode even in production when build is missing
      process.env.NODE_ENV = "development";
      app.set("env", "development");
      await setupVite(app, server);
    }
  }



  // Initialize Simple Voice Chat WebSocket endpoint
  try {
    const { setupSimpleVoiceChat } = await import('./simpleVoiceChat');
    const simpleVoiceWss = setupSimpleVoiceChat(server);
    console.log('🎤 Simple voice chat WebSocket initialized on /ws/simple-voice endpoint');
    
    simpleVoiceWss.on('error', (error) => {
      console.error('❌ Simple voice WebSocket server error:', error);
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize simple voice chat:', error);
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
})();