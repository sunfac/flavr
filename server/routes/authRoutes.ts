import type { Express } from "express";
import { storage } from "../storage";
import bcrypt from "bcrypt";
import passport from "passport";
// OAuth strategies are now initialized in routes/index.ts

// Simple rate limiter for developer endpoints
const developerRateLimit = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration for developer endpoints
const DEVELOPER_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100 // 100 requests per 15 minutes for developer
};

// Developer rate limiting middleware
const rateLimitDeveloper = (req: any, res: any, next: any) => {
  const key = `dev-${req.session.userId}`;
  const now = Date.now();
  const userLimit = developerRateLimit.get(key);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new limit window
    developerRateLimit.set(key, {
      count: 1,
      resetTime: now + DEVELOPER_RATE_LIMIT.windowMs
    });
    next();
  } else if (userLimit.count >= DEVELOPER_RATE_LIMIT.maxRequests) {
    // Rate limit exceeded
    console.log(`🚫 Developer rate limit exceeded for user ${req.session.userId}`);
    res.status(429).json({
      message: "Rate limit exceeded",
      error: "Too many developer API requests. Please try again later.",
      retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
    });
  } else {
    // Increment count
    userLimit.count++;
    next();
  }
};

// Session type extension
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    isPlus?: boolean;
  }
}

// Authentication middleware
export const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    console.log("Authentication failed - no session userId");
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

// Developer access middleware - requires authentication first
export const requireDeveloper = async (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    console.log("Developer access failed - no session userId");
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      console.log("Developer access failed - user not found");
      return res.status(401).json({ message: "Authentication required" });
    }

    const isDeveloper = user.email === "william@blycontracting.co.uk";
    if (!isDeveloper) {
      console.log(`Developer access denied for user ${user.email} - not developer account`);
      return res.status(403).json({ 
        message: "Developer access required", 
        error: "This endpoint is restricted to developer accounts only" 
      });
    }

    console.log(`Developer access granted for ${user.email}`);
    next();
  } catch (error) {
    console.error("Developer access check error:", error);
    return res.status(500).json({ message: "Access verification failed" });
  }
};

// Combined developer middleware with rate limiting
export const requireDeveloperWithRateLimit = [rateLimitDeveloper, requireDeveloper];

// Input validation helpers for developer endpoints
export const validateQueryLimit = (req: any, res: any, next: any) => {
  const { limit } = req.query;
  if (limit) {
    const parsedLimit = parseInt(limit as string, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 10000) {
      return res.status(400).json({
        message: "Invalid limit parameter",
        error: "Limit must be a number between 1 and 10000"
      });
    }
    req.validatedQuery = { ...req.query, limit: parsedLimit };
  }
  next();
};

export const validateNumericId = (req: any, res: any, next: any) => {
  const { id } = req.params;
  if (id) {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId) || parsedId < 1) {
      return res.status(400).json({
        message: "Invalid ID parameter",
        error: "ID must be a positive number"
      });
    }
    req.validatedParams = { ...req.params, id: parsedId };
  }
  next();
};

export function registerAuthRoutes(app: Express) {
  // OAuth strategies are configured in routes/index.ts
  // Register endpoint
  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, username } = req.body;
      
      if (!email || !password || !username) {
        return res.status(400).json({ message: "Email, password, and username are required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        // For test users, provide a helpful message with suggested alternatives
        if (email.includes('@test.') || email.includes('test@')) {
          return res.status(400).json({ 
            message: "Test user already exists", 
            suggestion: "Try a different test email like test2@test.com or test@example.org" 
          });
        }
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

  // OAuth Routes
  
  // Google OAuth
  app.get('/api/auth/google', passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  }));
  
  app.get('/api/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login?error=google' }),
    async (req, res) => {
      try {
        // Set session data
        const user = req.user as any;
        req.session.userId = user.id;
        req.session.isPlus = user.hasFlavrPlus;
        
        console.log(`Google OAuth login successful for user ${user.email}`);
        
        // Save session and redirect
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            return res.redirect('/login?error=session');
          }
          res.redirect('/'); // Redirect to home page
        });
      } catch (error) {
        console.error('Google OAuth callback error:', error);
        res.redirect('/login?error=callback');
      }
    }
  );
  
  // Apple OAuth
  app.get('/api/auth/apple', passport.authenticate('apple'));
  
  app.post('/api/auth/apple/callback',
    passport.authenticate('apple', { failureRedirect: '/login?error=apple' }),
    async (req, res) => {
      try {
        // Set session data
        const user = req.user as any;
        req.session.userId = user.id;
        req.session.isPlus = user.hasFlavrPlus;
        
        console.log(`Apple OAuth login successful for user ${user.email}`);
        
        // Save session and redirect
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            return res.redirect('/login?error=session');
          }
          res.redirect('/'); // Redirect to home page
        });
      } catch (error) {
        console.error('Apple OAuth callback error:', error);
        res.redirect('/login?error=callback');
      }
    }
  );

  // Logout endpoint  
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy((err) => {
        if (err) console.error("Session destroy error:", err);
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  // Get current user endpoint
  app.get("/api/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
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

  // Frontend expects this endpoint
  app.get('/api/auth/user', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isDeveloper = user.email === "william@blycontracting.co.uk";
      
      res.json({ 
        id: user.id, 
        email: user.email, 
        username: user.username, 
        hasFlavrPlus: user.hasFlavrPlus || isDeveloper 
      });
    } catch (error) {
      console.error("Get auth user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Check usage limit endpoint
  app.get("/api/check-usage-limit", async (req, res) => {
    try {
      const userId = req.session?.userId;
      const pseudoId = req.headers['x-pseudo-user-id'] as string || req.session?.id || 'anonymous';
      
      console.log('Check usage limit - userId:', userId, 'pseudoId:', pseudoId);
      
      if (userId) {
        // Check authenticated user
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        
        return res.json({
          canGenerate: user.hasFlavrPlus || (user.recipesThisMonth || 0) < 3,
          recipesUsed: user.recipesThisMonth || 0,
          recipesLimit: user.hasFlavrPlus ? 999 : 3,
          hasFlavrPlus: user.hasFlavrPlus || false
        });
      } else {
        // Check pseudo user
        let pseudoUser = await storage.getPseudoUser(pseudoId);
        if (!pseudoUser) {
          // Create new pseudo user
          pseudoUser = await storage.createPseudoUser({ pseudoId });
        }
        
        return res.json({
          canGenerate: (pseudoUser.recipesThisMonth || 0) < 3,
          recipesUsed: pseudoUser.recipesThisMonth || 0,
          recipesLimit: 3,
          hasFlavrPlus: false
        });
      }
    } catch (error) {
      console.error("Check usage limit error:", error);
      res.status(500).json({ error: "Failed to check usage limit" });
    }
  });
}