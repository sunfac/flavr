import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { registerRoutes } from '../../server/routes/index';

// Mock external services
jest.mock('openai');
jest.mock('replicate');
jest.mock('stripe');
jest.mock('bcrypt');

// Mock storage with realistic data
const mockStorage = {
  getUserByEmail: jest.fn(),
  createUser: jest.fn(),
  getUserById: jest.fn(),
  saveRecipe: jest.fn(),
  getRecipesByUser: jest.fn(),
  getRecipeById: jest.fn(),
  deleteRecipe: jest.fn(),
  updateRecipeSharing: jest.fn(),
  getRecipeByShareId: jest.fn(),
  getDeveloperLogs: jest.fn().mockResolvedValue([]),
  saveChatMessage: jest.fn(),
  getChatHistory: jest.fn().mockResolvedValue([]),
  resetMonthlyUsage: jest.fn()
};

jest.mock('../../server/storage', () => ({
  storage: mockStorage
}));

jest.mock('../../server/googleLiveAudio', () => ({
  setupGoogleLiveAudioWebSocket: jest.fn(),
}));

jest.mock('../../server/developerLogger', () => ({
  logGPTInteraction: jest.fn(),
}));

jest.mock('../../server/vision', () => ({
  processFridgeImage: jest.fn(),
}));

const mockBcrypt = require('bcrypt');
const mockOpenAI = require('openai');

describe('End-to-End Recipe Workflow', () => {
  let app: express.Application;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    // Add session middleware
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }
    }));

    await registerRoutes(app);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Recipe Generation Workflow', () => {
    it('should complete full user journey from signup to recipe generation', async () => {
      // Step 1: User Signup
      const userData = {
        email: 'chef@example.com',
        password: 'securePassword123',
        name: 'Chef User'
      };

      const hashedPassword = 'hashed_password_123';
      const newUser = {
        id: 1,
        email: 'chef@example.com',
        name: 'Chef User',
        passwordHash: hashedPassword,
        isPlus: false,
        monthlyUsage: 0,
        createdAt: new Date()
      };

      mockStorage.getUserByEmail.mockResolvedValue(null);
      mockBcrypt.hash = jest.fn().mockResolvedValue(hashedPassword);
      mockStorage.createUser.mockResolvedValue(newUser);

      const signupResponse = await request(app)
        .post('/api/signup')
        .send(userData)
        .expect(201);

      expect(signupResponse.body.user.email).toBe('chef@example.com');

      // Step 2: User Login
      mockStorage.getUserByEmail.mockResolvedValue(newUser);
      mockBcrypt.compare = jest.fn().mockResolvedValue(true);

      const agent = request.agent(app);
      const loginResponse = await agent
        .post('/api/login')
        .send({
          email: 'chef@example.com',
          password: 'securePassword123'
        })
        .expect(200);

      expect(loginResponse.body.user.id).toBe(1);

      // Step 3: Generate Recipe Ideas
      const recipeRequest = {
        portions: '4',
        timeAvailable: '30 minutes',
        equipment: ['stove', 'oven'],
        mood: 'comfort',
        ambition: 'medium',
        budget: 'moderate',
        cuisines: ['italian'],
        dietaryRestrictions: [],
        supermarket: 'whole-foods'
      };

      const mockRecipeIdeas = {
        choices: [{
          message: {
            content: JSON.stringify({
              recipes: [
                {
                  title: 'Creamy Pasta Carbonara',
                  description: 'Classic Italian comfort food',
                  cookTime: '25 minutes',
                  difficulty: 'Medium',
                  cuisine: 'Italian'
                }
              ]
            })
          }
        }]
      };

      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockRecipeIdeas)
          }
        }
      };
      mockOpenAI.mockImplementation(() => mockOpenAIInstance);

      const recipeIdeasResponse = await agent
        .post('/api/recipe-ideas')
        .send(recipeRequest)
        .expect(200);

      expect(recipeIdeasResponse.body.recipes).toHaveLength(1);
      expect(recipeIdeasResponse.body.recipes[0].title).toBe('Creamy Pasta Carbonara');

      // Verify complete workflow
      expect(mockStorage.createUser).toHaveBeenCalledTimes(1);
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it('should handle authentication failures appropriately', async () => {
      mockStorage.getUserByEmail.mockResolvedValue(null);

      const invalidLoginResponse = await request(app)
        .post('/api/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(invalidLoginResponse.body.error).toBe('Invalid email or password');
    });
  });
});