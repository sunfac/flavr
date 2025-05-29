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
  
  // Copy essential static files if they don't exist
  const essentialFiles = [
    "manifest.json",
    "service-worker.js"
  ];
  
  essentialFiles.forEach(file => {
    const sourcePath = path.resolve(import.meta.dirname, "..", "client", "public", file);
    const targetPath = path.join(publicDir, file);
    
    if (fs.existsSync(sourcePath) && !fs.existsSync(targetPath)) {
      try {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`Copied ${file} to production directory`);
      } catch (error: any) {
        console.log(`Could not copy ${file}:`, error.message);
      }
    }
  });
}