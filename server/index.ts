import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ensureDeploymentReady, createMinimalBuild } from "./deploymentHelper";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  
  // Check if we can serve static files, otherwise use Vite development server
  const hasProductionBuild = ensureDeploymentReady();
  const isProduction = app.get("env") === "production";
  
  if (isProduction && hasProductionBuild) {
    // In production, check if we have proper build assets
    const publicDir = path.resolve(import.meta.dirname, "public");
    const assetsDir = path.join(publicDir, "assets");
    
    if (fs.existsSync(assetsDir) && fs.readdirSync(assetsDir).some(file => file.endsWith('.js'))) {
      try {
        serveStatic(app);
        log("Serving production build with static assets");
      } catch (error) {
        log("Static serving failed, using development server");
        await setupVite(app, server);
      }
    } else {
      log("No compiled assets found, using development server for production");
      await setupVite(app, server);
    }
  } else {
    await setupVite(app, server);
    log("Using Vite development server for module compilation");
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
