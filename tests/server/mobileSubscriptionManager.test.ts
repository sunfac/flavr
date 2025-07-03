import jwt from 'jsonwebtoken';
import {
  createGoogleJWT,
  exchangeJWTForAccessToken,
  validateServiceAccountCredentials,
  authenticateWithGoogle,
  MobileSubscriptionManager,
  GoogleServiceAccountCredentials
} from '../../server/mobileSubscriptionManager';

// Mock environment variables and external dependencies
const mockServiceAccountCredentials: GoogleServiceAccountCredentials = {
  type: 'service_account',
  project_id: 'test-project-123',
  private_key_id: 'key123',
  private_key: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC8Q7HgL7dGOlbK
wRhO8H4L6/jSBdW9dHKf8u9QGAr6rUl3cOjX4VH5z9Qf4v7H9GQq2k3Y5L1Pqw3g
Hf2Gt8n9vVs7rGjEQ1Qk6Y8nIq3m5K6t9RFe7Jh8S1Zv2xMc4tXn7kYr5g8Wq1w
A3dVt6n2e9Zb5a8G7m1k9LvPqE3nZtWr8YzFi6dQpN2bH5nJq8g1Kp7xB9Ef0cz
K9mVt2qW3rDf5yG8L6Nj1vEs4aRp9q7Xb0oW2hK6fMd8Hc1uLj9tKz6YeW4r3Nx
Vq5b2Pf8Gt7yR1zD0M5mJw9q8L3cF2aE4uQpH7fK1sT6GvBr0W8D9FaO5mP2QbC
t8KzA9q1wIDAQABAoIBAHv3fGBhzY9o5Lk6r2Yb1Q3dH7fWzX4oPq8JmT1C9vNr
-----END PRIVATE KEY-----`,
  client_email: 'test@test-project-123.iam.gserviceaccount.com',
  client_id: '123456789',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/test%40test-project-123.iam.gserviceaccount.com'
};

// Mock fetch for testing token exchange
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Google JWT Creation and Mobile Subscription Manager', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
      ...originalEnv,
      GOOGLE_SERVICE_ACCOUNT_KEY: JSON.stringify(mockServiceAccountCredentials)
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createGoogleJWT', () => {
    it('should create a valid JWT token with default parameters', () => {
      const token = createGoogleJWT();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts separated by dots
      
      // Decode the token to verify payload
      const decoded = jwt.decode(token) as any;
      expect(decoded).toBeDefined();
      expect(decoded.iss).toBe(mockServiceAccountCredentials.client_email);
      expect(decoded.scope).toBe('https://www.googleapis.com/auth/cloud-platform');
      expect(decoded.aud).toBe(mockServiceAccountCredentials.token_uri);
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(decoded.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
    });

    it('should create JWT with custom scopes', () => {
      const customScopes = [
        'https://www.googleapis.com/auth/androidpublisher',
        'https://www.googleapis.com/auth/cloud-platform'
      ];
      
      const token = createGoogleJWT(customScopes);
      const decoded = jwt.decode(token) as any;
      
      expect(decoded.scope).toBe(customScopes.join(' '));
    });

    it('should create JWT with custom expiration time', () => {
      const expirationMinutes = 30;
      const token = createGoogleJWT(undefined, expirationMinutes);
      const decoded = jwt.decode(token) as any;
      
      const expectedExpiration = Math.floor(Date.now() / 1000) + (expirationMinutes * 60);
      expect(decoded.exp).toBeCloseTo(expectedExpiration, -2); // Allow 1 minute variance
    });

    it('should throw error when GOOGLE_SERVICE_ACCOUNT_KEY is missing', () => {
      delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      
      expect(() => createGoogleJWT()).toThrow('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is required');
    });

    it('should throw error when GOOGLE_SERVICE_ACCOUNT_KEY is invalid JSON', () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = 'invalid-json';
      
      expect(() => createGoogleJWT()).toThrow('Invalid JSON in GOOGLE_SERVICE_ACCOUNT_KEY environment variable');
    });

    it('should throw error when required fields are missing', () => {
      const incompleteCredentials = { ...mockServiceAccountCredentials };
      delete incompleteCredentials.client_email;
      
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify(incompleteCredentials);
      
      expect(() => createGoogleJWT()).toThrow("Missing required field 'client_email' in service account credentials");
    });

    it('should throw error when private key format is invalid', () => {
      const invalidCredentials = {
        ...mockServiceAccountCredentials,
        private_key: 'invalid-private-key'
      };
      
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify(invalidCredentials);
      
      expect(() => createGoogleJWT()).toThrow('Invalid private key format in service account credentials');
    });

    it('should verify JWT signature with the private key', () => {
      const token = createGoogleJWT();
      
      // Verify the token was signed with the correct private key
      expect(() => {
        jwt.verify(token, mockServiceAccountCredentials.private_key, { algorithms: ['RS256'] });
      }).not.toThrow();
    });
  });

  describe('exchangeJWTForAccessToken', () => {
    it('should exchange JWT for access token successfully', async () => {
      const mockAccessToken = 'mock-access-token-123';
      const mockResponse = {
        access_token: mockAccessToken,
        expires_in: 3600,
        token_type: 'Bearer'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const jwt = createGoogleJWT();
      const accessToken = await exchangeJWTForAccessToken(jwt);

      expect(accessToken).toBe(mockAccessToken);
      expect(mockFetch).toHaveBeenCalledWith(
        mockServiceAccountCredentials.token_uri,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: expect.any(URLSearchParams)
        })
      );
    });

    it('should throw error when token exchange fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValueOnce('Invalid assertion')
      });

      const jwt = createGoogleJWT();
      await expect(exchangeJWTForAccessToken(jwt)).rejects.toThrow('Token exchange failed: 400 Invalid assertion');
    });

    it('should throw error when no access token is received', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ error: 'invalid_grant' })
      });

      const jwt = createGoogleJWT();
      await expect(exchangeJWTForAccessToken(jwt)).rejects.toThrow('No access token received from Google');
    });
  });

  describe('validateServiceAccountCredentials', () => {
    it('should validate correct service account credentials', () => {
      expect(() => validateServiceAccountCredentials(mockServiceAccountCredentials)).not.toThrow();
      expect(validateServiceAccountCredentials(mockServiceAccountCredentials)).toBe(true);
    });

    it('should throw error for non-object credentials', () => {
      expect(() => validateServiceAccountCredentials('invalid')).toThrow('Service account credentials must be a valid object');
      expect(() => validateServiceAccountCredentials(null)).toThrow('Service account credentials must be a valid object');
    });

    it('should throw error for missing required fields', () => {
      const invalidCredentials = { ...mockServiceAccountCredentials };
      delete invalidCredentials.project_id;
      
      expect(() => validateServiceAccountCredentials(invalidCredentials)).toThrow('Missing or invalid required field: project_id');
    });

    it('should throw error for invalid credential type', () => {
      const invalidCredentials = { ...mockServiceAccountCredentials, type: 'user' };
      
      expect(() => validateServiceAccountCredentials(invalidCredentials)).toThrow('Credential type must be "service_account"');
    });

    it('should throw error for invalid email format', () => {
      const invalidCredentials = { ...mockServiceAccountCredentials, client_email: 'invalid-email' };
      
      expect(() => validateServiceAccountCredentials(invalidCredentials)).toThrow('Invalid client_email format');
    });

    it('should throw error for invalid private key format', () => {
      const invalidCredentials = { ...mockServiceAccountCredentials, private_key: 'invalid-key-format' };
      
      expect(() => validateServiceAccountCredentials(invalidCredentials)).toThrow('Invalid private key format');
    });
  });

  describe('authenticateWithGoogle', () => {
    it('should complete full authentication flow', async () => {
      const mockAccessToken = 'mock-access-token-456';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          access_token: mockAccessToken,
          expires_in: 3600,
          token_type: 'Bearer'
        })
      });

      const accessToken = await authenticateWithGoogle();
      expect(accessToken).toBe(mockAccessToken);
    });

    it('should handle authentication failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValueOnce('Unauthorized')
      });

      await expect(authenticateWithGoogle()).rejects.toThrow('Authentication failed: Token exchange failed: 401 Unauthorized');
    });
  });

  describe('MobileSubscriptionManager', () => {
    let manager: MobileSubscriptionManager;

    beforeEach(() => {
      manager = MobileSubscriptionManager.getInstance();
    });

    it('should return singleton instance', () => {
      const manager1 = MobileSubscriptionManager.getInstance();
      const manager2 = MobileSubscriptionManager.getInstance();
      expect(manager1).toBe(manager2);
    });

    describe('getGooglePlayToken', () => {
      it('should get Google Play authentication token', async () => {
        const mockAccessToken = 'google-play-token-789';
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce({
            access_token: mockAccessToken,
            expires_in: 3600,
            token_type: 'Bearer'
          })
        });

        const token = await manager.getGooglePlayToken();
        expect(token).toBe(mockAccessToken);
      });
    });

    describe('verifyGooglePlaySubscription', () => {
      it('should verify Google Play subscription successfully', async () => {
        const mockSubscriptionData = {
          kind: 'androidpublisher#subscriptionPurchase',
          startTimeMillis: '1234567890123',
          expiryTimeMillis: '1234567899999',
          autoRenewing: true,
          orderId: 'GPA.1234-5678-9012-34567'
        };

        // Mock token exchange
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce({
            access_token: 'google-play-token',
            expires_in: 3600,
            token_type: 'Bearer'
          })
        });

        // Mock subscription verification
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce(mockSubscriptionData)
        });

        const result = await manager.verifyGooglePlaySubscription(
          'com.flavr.app',
          'flavr_plus_monthly',
          'purchase-token-123'
        );

        expect(result).toEqual(mockSubscriptionData);
        expect(mockFetch).toHaveBeenCalledTimes(2); // Token + verification
      });

      it('should handle verification failure', async () => {
        // Mock token exchange
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce({
            access_token: 'google-play-token',
            expires_in: 3600,
            token_type: 'Bearer'
          })
        });

        // Mock failed verification
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: jest.fn().mockResolvedValueOnce('Purchase not found')
        });

        await expect(manager.verifyGooglePlaySubscription(
          'com.flavr.app',
          'flavr_plus_monthly',
          'invalid-token'
        )).rejects.toThrow('Google Play verification failed: 404 Purchase not found');
      });
    });

    describe('acknowledgeGooglePlaySubscription', () => {
      it('should acknowledge Google Play subscription successfully', async () => {
        // Mock token exchange
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce({
            access_token: 'google-play-token',
            expires_in: 3600,
            token_type: 'Bearer'
          })
        });

        // Mock successful acknowledgment
        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValueOnce('')
        });

        await expect(manager.acknowledgeGooglePlaySubscription(
          'com.flavr.app',
          'flavr_plus_monthly',
          'purchase-token-123'
        )).resolves.not.toThrow();

        expect(mockFetch).toHaveBeenCalledTimes(2); // Token + acknowledgment
      });

      it('should handle acknowledgment failure', async () => {
        // Mock token exchange
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce({
            access_token: 'google-play-token',
            expires_in: 3600,
            token_type: 'Bearer'
          })
        });

        // Mock failed acknowledgment
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: jest.fn().mockResolvedValueOnce('Invalid purchase token')
        });

        await expect(manager.acknowledgeGooglePlaySubscription(
          'com.flavr.app',
          'flavr_plus_monthly',
          'invalid-token'
        )).rejects.toThrow('Google Play acknowledgment failed: 400 Invalid purchase token');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const jwt = createGoogleJWT();
      await expect(exchangeJWTForAccessToken(jwt)).rejects.toThrow('Token exchange failed: Network error');
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockRejectedValueOnce(new Error('Invalid JSON'))
      });

      const jwt = createGoogleJWT();
      await expect(exchangeJWTForAccessToken(jwt)).rejects.toThrow('Token exchange failed: Invalid JSON');
    });

    it('should handle very short expiration times', () => {
      const token = createGoogleJWT(undefined, 1); // 1 minute
      const decoded = jwt.decode(token) as any;
      
      const expectedExpiration = Math.floor(Date.now() / 1000) + 60;
      expect(decoded.exp).toBeCloseTo(expectedExpiration, -1);
    });

    it('should handle empty scopes array', () => {
      const token = createGoogleJWT([]);
      const decoded = jwt.decode(token) as any;
      
      expect(decoded.scope).toBe('');
    });
  });
});