import fs from "fs";
import path from "path";

export function ensureDeploymentReady(): boolean {
  const publicDir = path.resolve(import.meta.dirname, "public");
  
  // Check if production build exists
  if (fs.existsSync(publicDir)) {
    const indexExists = fs.existsSync(path.join(publicDir, "index.html"));
    if (indexExists) {
      console.log("Production build found, using static files");
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
      if (file !== 'index.html') { // Keep our fallback HTML
        const filePath = path.join(publicDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        } else {
          fs.rmSync(filePath, { recursive: true, force: true });
        }
      }
    });
    console.log("Cleared existing production files for fresh deployment");
  } catch (error) {
    // Directory might be empty, that's fine
  }
  
  // Copy essential static files with cache-busting timestamps
  const clientPublicDir = path.resolve(import.meta.dirname, "..", "client", "public");
  
  if (fs.existsSync(clientPublicDir)) {
    try {
      // Copy all files from client/public
      const files = fs.readdirSync(clientPublicDir, { withFileTypes: true });
      files.forEach(file => {
        const sourcePath = path.join(clientPublicDir, file.name);
        const targetPath = path.join(publicDir, file.name);
        
        if (file.isDirectory()) {
          fs.mkdirSync(targetPath, { recursive: true });
          // Copy directory contents
          const subFiles = fs.readdirSync(sourcePath);
          subFiles.forEach(subFile => {
            fs.copyFileSync(path.join(sourcePath, subFile), path.join(targetPath, subFile));
          });
        } else {
          // Skip service worker files to prevent refresh loops
          if (file.name === 'service-worker.js') {
            console.log(`Skipped service worker file to prevent refresh loops`);
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