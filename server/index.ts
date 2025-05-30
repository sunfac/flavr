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

        // Production mode validation
        if (process.env.NODE_ENV === "production") {
          // Check if dist directory exists (where esbuild outputs the server)
          const distPath = path.resolve(import.meta.dirname, "..", "dist");
          if (!fs.existsSync(distPath)) {
            log("❌ Missing production build. Please run `npm run build` before starting.");
            log("Expected dist/ directory not found at:", distPath);
            process.exit(1);
          }
          
          // Ensure deployment files are ready
          const hasProductionBuild = ensureDeploymentReady();
          if (hasProductionBuild) {
            try {
              serveStatic(app);
              log("✅ Production mode: serving static files from server/public/");
            } catch (error) {
              log("❌ Production build found but failed to serve. Please rebuild.");
              log("Error:", error);
              process.exit(1);
            }
          } else {
            log("❌ Missing client build files. Please run `npm run build` before starting.");
            process.exit(1);
          }
        } else {
          // Development mode
          createMinimalBuild();
          await setupVite(app, server);
        }

        // Always run on exposed Replit port
        const port = 5000;
        server.listen(
          {
            port,
            host: "0.0.0.0",
            reusePort: true,
          },
          () => {
            log(`serving on port ${port}`);
          }
        );
      })();
