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

      // Check if this is the developer account
      const isDeveloper = email === "william@blycontracting.co.uk";
      
      const user = await storage.createUser({ 
        email, 
        password, 
        username,
        hasFlavrPlus: isDeveloper // Grant unlimited generations for developer
      });
      
      // Ensure session is properly saved
      req.session.userId = user.id;
      req.session.isPlus = user.hasFlavrPlus || isDeveloper;
      
      console.log(`Registration successful for user ${user.email}, session userId: ${req.session.userId}`);

      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
        } else {
          console.log('Session saved successfully');
        }
      });

      res.json({ user: { id: user.id, email: user.email, username: user.username, hasFlavrPlus: user.hasFlavrPlus || isDeveloper } });
    } catch (error: any) {
      console.error("Registration error:", error);
      
      // Handle specific database constraint errors
      if (error.code === '23505') {
        if (error.detail?.includes('email')) {
          return res.status(400).json({ message: "Email already exists" });
        } else if (error.detail?.includes('username')) {
          return res.status(400).json({ message: "Username already taken" });
        }
        return res.status(400).json({ message: "User already exists" });
      }
      
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email/username and password are required" });
      }

      const user = await storage.getUserByEmailOrUsername(email);
      if (!user) {
        console.log(`Login failed: user not found for email/username ${email}`);
        return res.status(401).json({ message: "Invalid email/username or password" });
      }

      console.log(`Login attempt for user ${user.email}, checking password...`);
      
      // Compare the provided password with the hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        console.log(`Login failed: invalid password for user ${user.email}`);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if this is the developer account
      const isDeveloper = user.email === "william@blycontracting.co.uk";
      
      // Ensure session is properly saved
      req.session.userId = user.id;
      req.session.isPlus = user.hasFlavrPlus || isDeveloper;
      
      console.log(`Login successful for user ${user.email}, session userId: ${req.session.userId}, isDeveloper: ${isDeveloper}`);

      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
        } else {
          console.log('Session saved successfully');
        }
      });

      res.json({ user: { id: user.id, email: user.email, username: user.username, hasFlavrPlus: user.hasFlavrPlus || isDeveloper } });
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
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isDeveloper = user.email === "william@blycontracting.co.uk";
      
      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          username: user.username, 
          hasFlavrPlus: user.hasFlavrPlus || isDeveloper 
        } 
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });
}