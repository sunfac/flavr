import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes/index';

// Mock the external dependencies that would normally require API keys
jest.mock('openai');
jest.mock('replicate');
jest.mock('stripe');

// Mock the storage module
jest.mock('../../server/storage', () => ({
  storage: {
    getUserByEmail: jest.fn(),
    createUser: jest.fn(),
    getUserById: jest.fn(),
    getDeveloperLogs: jest.fn().mockResolvedValue([]),
    getRecipesByUser: jest.fn().mockResolvedValue([]),
    deleteRecipe: jest.fn(),
    getRecipeByShareId: jest.fn(),
  },
}));

// Mock the Google Live Audio setup
jest.mock('../../server/googleLiveAudio', () => ({
  setupGoogleLiveAudioWebSocket: jest.fn(),
}));

describe('Server API Routes', () => {
  let app: express.Application;

  beforeAll(async () => {
    // Create Express app
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Register routes
    await registerRoutes(app);
  });

  describe('GET /api/test', () => {
    it('should return expected JSON response', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Recipe API is working!',
        timestamp: expect.any(String),
        environment: 'test'
      });

      // Validate timestamp is a valid ISO string
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should return correct content type', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('GET /api/gemini-key', () => {
    it('should return Gemini API key when configured', async () => {
      // Mock environment variable
      const originalGeminiKey = process.env.VITE_GEMINI_API_KEY;
      process.env.VITE_GEMINI_API_KEY = 'test-gemini-key';

      const response = await request(app)
        .get('/api/gemini-key')
        .expect(200);

      expect(response.body).toEqual({
        key: 'test-gemini-key'
      });

      // Restore original value
      process.env.VITE_GEMINI_API_KEY = originalGeminiKey;
    });

    it('should return error when Gemini API key is not configured', async () => {
      // Temporarily remove the environment variable
      const originalGeminiKey = process.env.VITE_GEMINI_API_KEY;
      delete process.env.VITE_GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const response = await request(app)
        .get('/api/gemini-key')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Gemini API key not configured'
      });

      // Restore original value
      if (originalGeminiKey) {
        process.env.VITE_GEMINI_API_KEY = originalGeminiKey;
      }
    });
  });

  describe('Authentication Routes', () => {
    it('should require authentication for protected routes', async () => {
      const response = await request(app)
        .get('/api/me')
        .expect(401);

      expect(response.body).toEqual({
        message: 'Authentication required'
      });
    });
  });

  describe('Recipe Routes', () => {
    it('should validate required fields for recipe generation', async () => {
      const response = await request(app)
        .post('/api/recipe-ideas')
        .send({
          // Missing required fields
          portions: '2'
        })
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
    });
  });

  describe('Chat Routes', () => {
    it('should validate message field for chat endpoints', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          // Missing message field
          conversationHistory: []
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Message is required'
      });
    });
  });
});