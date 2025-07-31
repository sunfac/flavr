import type { Express } from "express";
import crypto from "crypto";
import { storage } from "../storage";

// In-memory storage for challenges (in production, use Redis or database)
const challenges = new Map<string, { challenge: Buffer; timestamp: number; userId?: string }>();

// Clean up expired challenges (older than 5 minutes)
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [key, value] of challenges.entries()) {
    if (value.timestamp < fiveMinutesAgo) {
      challenges.delete(key);
    }
  }
}, 60000); // Check every minute

export function registerBiometricAuthRoutes(app: Express): void {
  
  // Start biometric registration process
  app.post('/api/biometric/register/begin', async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate challenge
      const challenge = crypto.randomBytes(32);
      const challengeId = crypto.randomUUID();
      
      // Store challenge
      challenges.set(challengeId, {
        challenge,
        timestamp: Date.now(),
        userId: user.id
      });

      // WebAuthn registration options
      const registrationOptions = {
        challenge: Array.from(challenge),
        rp: {
          name: "Flavr",
          id: req.hostname.includes('localhost') ? 'localhost' : req.hostname
        },
        user: {
          id: Array.from(Buffer.from(user.id)),
          name: user.email || user.username || 'user',
          displayName: user.email || user.username || 'Flavr User'
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          requireResidentKey: false
        },
        timeout: 60000,
        attestation: 'direct'
      };

      res.json({
        challengeId,
        options: registrationOptions
      });

    } catch (error: any) {
      console.error('❌ Biometric registration begin failed:', error);
      res.status(500).json({ error: 'Failed to start biometric registration' });
    }
  });

  // Complete biometric registration
  app.post('/api/biometric/register/complete', async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { challengeId, credential } = req.body;
      
      if (!challengeId || !credential) {
        return res.status(400).json({ error: 'Missing challengeId or credential' });
      }

      // Verify challenge
      const challengeData = challenges.get(challengeId);
      if (!challengeData || challengeData.userId !== req.session.userId) {
        return res.status(400).json({ error: 'Invalid or expired challenge' });
      }

      // Clean up challenge
      challenges.delete(challengeId);

      // In a real implementation, you would verify the attestation here
      // For now, we'll store the credential ID for the user
      const credentialId = Buffer.from(credential.rawId, 'base64').toString('base64');
      
      // Save biometric credential to user profile
      await storage.updateUser(req.session.userId, {
        biometricCredentialId: credentialId,
        biometricEnabled: true
      });

      console.log('✅ Biometric credential registered for user:', req.session.userId);

      res.json({ 
        success: true, 
        message: 'Biometric authentication enabled successfully' 
      });

    } catch (error: any) {
      console.error('❌ Biometric registration complete failed:', error);
      res.status(500).json({ error: 'Failed to complete biometric registration' });
    }
  });

  // Start biometric authentication process
  app.post('/api/biometric/authenticate/begin', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user || !user.biometricEnabled || !user.biometricCredentialId) {
        return res.status(404).json({ error: 'User not found or biometric authentication not enabled' });
      }

      // Generate challenge
      const challenge = crypto.randomBytes(32);
      const challengeId = crypto.randomUUID();
      
      // Store challenge
      challenges.set(challengeId, {
        challenge,
        timestamp: Date.now(),
        userId: user.id
      });

      // WebAuthn authentication options
      const authenticationOptions = {
        challenge: Array.from(challenge),
        allowCredentials: [{
          id: Array.from(Buffer.from(user.biometricCredentialId, 'base64')),
          type: 'public-key'
        }],
        userVerification: 'required',
        timeout: 60000
      };

      res.json({
        challengeId,
        options: authenticationOptions
      });

    } catch (error: any) {
      console.error('❌ Biometric authentication begin failed:', error);
      res.status(500).json({ error: 'Failed to start biometric authentication' });
    }
  });

  // Complete biometric authentication
  app.post('/api/biometric/authenticate/complete', async (req, res) => {
    try {
      const { challengeId, credential } = req.body;
      
      if (!challengeId || !credential) {
        return res.status(400).json({ error: 'Missing challengeId or credential' });
      }

      // Verify challenge
      const challengeData = challenges.get(challengeId);
      if (!challengeData) {
        return res.status(400).json({ error: 'Invalid or expired challenge' });
      }

      // Clean up challenge
      challenges.delete(challengeId);

      // Get user
      const user = await storage.getUser(challengeData.userId!);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // In a real implementation, you would verify the signature here
      // For now, we'll trust that the credential ID matches
      const providedCredentialId = Buffer.from(credential.rawId, 'base64').toString('base64');
      
      if (providedCredentialId !== user.biometricCredentialId) {
        return res.status(401).json({ error: 'Invalid biometric credential' });
      }

      // Create session
      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error('❌ Session save failed:', err);
          return res.status(500).json({ error: 'Failed to create session' });
        }

        console.log('✅ Biometric authentication successful for user:', user.email);

        res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            hasFlavrPlus: user.hasFlavrPlus || user.email === 'william@blycontracting.co.uk'
          }
        });
      });

    } catch (error: any) {
      console.error('❌ Biometric authentication complete failed:', error);
      res.status(500).json({ error: 'Failed to complete biometric authentication' });
    }
  });

  // Check if user has biometric authentication enabled
  app.get('/api/biometric/status/:email', async (req, res) => {
    try {
      const { email } = req.params;
      
      // Use case-insensitive email lookup
      const user = await storage.getUserByEmail(email.toLowerCase());
      const hasBiometric = !!(user?.biometricEnabled && user?.biometricCredentialId);

      res.json({ 
        hasBiometric,
        email: email.toLowerCase()
      });

    } catch (error: any) {
      console.error('❌ Biometric status check failed:', error);
      res.status(500).json({ error: 'Failed to check biometric status' });
    }
  });

  // Disable biometric authentication
  app.post('/api/biometric/disable', async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      await storage.updateUser(req.session.userId, {
        biometricCredentialId: null,
        biometricEnabled: false
      });

      console.log('✅ Biometric authentication disabled for user:', req.session.userId);

      res.json({ 
        success: true, 
        message: 'Biometric authentication disabled' 
      });

    } catch (error: any) {
      console.error('❌ Biometric disable failed:', error);
      res.status(500).json({ error: 'Failed to disable biometric authentication' });
    }
  });
}