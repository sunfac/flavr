import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface GoogleJWTPayload {
  iss: string;  // Issuer (service account email)
  scope: string; // Requested scopes
  aud: string;  // Audience (Google's token endpoint)
  exp: number;  // Expiration time
  iat: number;  // Issued at time
}

export interface GoogleServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

/**
 * Creates a signed JWT for Google API authentication using service account credentials
 * @param scopes - Array of Google API scopes to request access for
 * @param expirationMinutes - JWT expiration time in minutes (default: 60)
 * @returns Signed JWT token string
 */
export function createGoogleJWT(
  scopes: string[] = ['https://www.googleapis.com/auth/cloud-platform'],
  expirationMinutes: number = 60
): string {
  try {
    // Get service account credentials from environment
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccountKey) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is required');
    }

    let credentials: GoogleServiceAccountCredentials;
    
    try {
      credentials = JSON.parse(serviceAccountKey);
    } catch (parseError) {
      throw new Error('Invalid JSON in GOOGLE_SERVICE_ACCOUNT_KEY environment variable');
    }

    // Validate required credential fields
    const requiredFields: (keyof GoogleServiceAccountCredentials)[] = [
      'client_email',
      'private_key',
      'token_uri'
    ];
    
    for (const field of requiredFields) {
      if (!credentials[field]) {
        throw new Error(`Missing required field '${field}' in service account credentials`);
      }
    }

    // Validate private key format
    if (!credentials.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
      throw new Error('Invalid private key format in service account credentials');
    }

    // Clean up private key formatting (handle escaped newlines)
    let privateKey = credentials.private_key;
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    // Create JWT payload
    const now = Math.floor(Date.now() / 1000);
    const expiration = now + (expirationMinutes * 60);
    
    const payload: GoogleJWTPayload = {
      iss: credentials.client_email,
      scope: scopes.join(' '),
      aud: credentials.token_uri,
      exp: expiration,
      iat: now
    };

    // Sign the JWT using the service account private key
    const token = jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      header: {
        alg: 'RS256',
        typ: 'JWT'
      }
    });

    return token;
    
  } catch (error) {
    console.error('Failed to create Google JWT:', error);
    throw new Error(`JWT creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Exchanges a signed JWT for a Google access token
 * @param signedJWT - The signed JWT token
 * @returns Google access token
 */
export async function exchangeJWTForAccessToken(signedJWT: string): Promise<string> {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
    
    const response = await fetch(credentials.token_uri || 'https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: signedJWT
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    const tokenData = await response.json();
    
    if (!tokenData.access_token) {
      throw new Error('No access token received from Google');
    }

    return tokenData.access_token;
    
  } catch (error) {
    console.error('Failed to exchange JWT for access token:', error);
    throw new Error(`Token exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates Google service account credentials format
 * @param credentials - Service account credentials object
 * @returns True if valid, throws error if invalid
 */
export function validateServiceAccountCredentials(credentials: any): credentials is GoogleServiceAccountCredentials {
  if (!credentials || typeof credentials !== 'object') {
    throw new Error('Service account credentials must be a valid object');
  }

  const requiredFields = [
    'type', 'project_id', 'private_key_id', 'private_key', 
    'client_email', 'client_id', 'auth_uri', 'token_uri'
  ];

  for (const field of requiredFields) {
    if (!credentials[field] || typeof credentials[field] !== 'string') {
      throw new Error(`Missing or invalid required field: ${field}`);
    }
  }

  if (credentials.type !== 'service_account') {
    throw new Error('Credential type must be "service_account"');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(credentials.client_email)) {
    throw new Error('Invalid client_email format');
  }

  // Validate private key format
  if (!credentials.private_key.includes('-----BEGIN PRIVATE KEY-----') ||
      !credentials.private_key.includes('-----END PRIVATE KEY-----')) {
    throw new Error('Invalid private key format');
  }

  return true;
}

/**
 * Creates a complete authentication flow for Google APIs
 * @param scopes - Required API scopes
 * @returns Google access token ready for API requests
 */
export async function authenticateWithGoogle(
  scopes: string[] = ['https://www.googleapis.com/auth/cloud-platform']
): Promise<string> {
  try {
    // Create signed JWT
    const signedJWT = createGoogleJWT(scopes);
    
    // Exchange JWT for access token
    const accessToken = await exchangeJWTForAccessToken(signedJWT);
    
    return accessToken;
    
  } catch (error) {
    console.error('Google authentication failed:', error);
    throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Mobile subscription specific authentication for Google Play and App Store APIs
 */
export class MobileSubscriptionManager {
  private static instance: MobileSubscriptionManager;
  
  public static getInstance(): MobileSubscriptionManager {
    if (!MobileSubscriptionManager.instance) {
      MobileSubscriptionManager.instance = new MobileSubscriptionManager();
    }
    return MobileSubscriptionManager.instance;
  }

  /**
   * Get authentication token for Google Play Billing API
   */
  async getGooglePlayToken(): Promise<string> {
    const scopes = [
      'https://www.googleapis.com/auth/androidpublisher'
    ];
    
    return await authenticateWithGoogle(scopes);
  }

  /**
   * Verify a Google Play subscription purchase
   * @param packageName - App package name
   * @param subscriptionId - Subscription product ID
   * @param purchaseToken - Purchase token from client
   */
  async verifyGooglePlaySubscription(
    packageName: string,
    subscriptionId: string,
    purchaseToken: string
  ): Promise<any> {
    try {
      const accessToken = await this.getGooglePlayToken();
      
      const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${subscriptionId}/tokens/${purchaseToken}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Play verification failed: ${response.status} ${errorText}`);
      }

      return await response.json();
      
    } catch (error) {
      console.error('Google Play subscription verification failed:', error);
      throw error;
    }
  }

  /**
   * Acknowledge a Google Play subscription purchase
   * @param packageName - App package name
   * @param subscriptionId - Subscription product ID
   * @param purchaseToken - Purchase token from client
   */
  async acknowledgeGooglePlaySubscription(
    packageName: string,
    subscriptionId: string,
    purchaseToken: string
  ): Promise<void> {
    try {
      const accessToken = await this.getGooglePlayToken();
      
      const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${subscriptionId}/tokens/${purchaseToken}:acknowledge`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Play acknowledgment failed: ${response.status} ${errorText}`);
      }
      
    } catch (error) {
      console.error('Google Play subscription acknowledgment failed:', error);
      throw error;
    }
  }
}