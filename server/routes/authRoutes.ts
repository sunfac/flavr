import type { Express } from "express";
import { storage } from "../storage";
import bcrypt from "bcrypt";

// Authentication middleware
export const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    console.log("Authentication failed - no session userId");
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

export function registerAuthRoutes(app: Express) {
  // Register endpoint
  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, username } = req.body;
      
      if (!email || !password || !username) {
        return res.status(400).json({ message: "Email, password, and username are required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const user = await storage.createUser({ email, password, username });
      req.session.userId = user.id;
      req.session.isPlus = user.hasFlavrPlus || false;

      res.json({ user: { id: user.id, email: user.email, username: user.username, hasFlavrPlus: user.hasFlavrPlus } });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare the provided password with the hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.userId = user.id;
      req.session.isPlus = user.hasFlavrPlus || false;

      res.json({ user: { id: user.id, email: user.email, username: user.username, hasFlavrPlus: user.hasFlavrPlus } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout endpoint  
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) console.error("Logout error:", err);
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user endpoint
  app.get("/api/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          username: user.username, 
          hasFlavrPlus: user.hasFlavrPlus 
        } 
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });
}