import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as AppleStrategy } from 'passport-apple';
import { storage } from './storage';

// Configure Google OAuth Strategy
export function configureOAuthStrategies() {
  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists by OAuth first, then by email
        let user = await storage.getUserByOAuth('google', profile.id);
        
        if (!user && profile.emails?.[0]?.value) {
          user = await storage.getUserByEmail(profile.emails[0].value);
        }
        
        if (!user) {
          // Create new user
          user = await storage.createUser({
            email: profile.emails?.[0]?.value || '',
            username: profile.displayName || profile.emails?.[0]?.value?.split('@')[0] || '',
            password: '', // OAuth users don't need passwords
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            profileImage: profile.photos?.[0]?.value || '',
            hasFlavrPlus: false,
            oauthProvider: 'google',
            oauthId: profile.id
          });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }));
  }

  // Apple OAuth Strategy
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
    passport.use(new AppleStrategy({
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKey: process.env.APPLE_PRIVATE_KEY,
      callbackURL: '/api/auth/apple/callback'
    }, async (accessToken, refreshToken, idToken, profile, done) => {
      try {
        // Check if user exists by OAuth first, then by email
        let user = await storage.getUserByOAuth('apple', profile.sub);
        
        if (!user && profile.email) {
          user = await storage.getUserByEmail(profile.email);
        }
        
        if (!user) {
          // Create new user
          user = await storage.createUser({
            email: profile.email || '',
            username: profile.name?.firstName || profile.email?.split('@')[0] || '',
            password: '', // OAuth users don't need passwords
            firstName: profile.name?.firstName || '',
            lastName: profile.name?.lastName || '',
            profileImage: '',
            hasFlavrPlus: false,
            oauthProvider: 'apple',
            oauthId: profile.sub
          });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }));
  }
}