import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as AppleStrategy } from 'passport-apple';
import { storage } from './storage';

// Initialize OAuth strategies
export function initializeOAuthStrategies() {
  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use('google', new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('🔍 Google OAuth callback triggered for profile:', profile.id);
        
        // Check if user exists by OAuth first, then by email
        let user = await storage.getUserByOAuth('google', profile.id);
        
        if (!user && profile.emails?.[0]?.value) {
          user = await storage.getUserByEmail(profile.emails[0].value);
          if (user) {
            console.log('📧 Found existing user by email, linking OAuth');
          }
        }
        
        if (!user) {
          console.log('👤 Creating new OAuth user');
          // Create new user
          user = await storage.createUser({
            email: profile.emails?.[0]?.value || '',
            username: profile.displayName || profile.emails?.[0]?.value?.split('@')[0] || `user_${profile.id}`,
            password: '', // OAuth users don't need passwords
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            profileImage: profile.photos?.[0]?.value || '',
            hasFlavrPlus: false,
            oauthProvider: 'google',
            oauthId: profile.id
          });
        }
        
        console.log('✅ Google OAuth authentication successful for user:', user.id);
        return done(null, user);
      } catch (error) {
        console.error('❌ Google OAuth error:', error);
        return done(error as Error, false);
      }
    }));
  }

  // Apple OAuth Strategy (temporarily disabled - needs proper configuration)
  // Note: Apple OAuth requires complex private key configuration
  console.log('🍎 Apple OAuth temporarily disabled - configuration needed');

  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: any, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
}