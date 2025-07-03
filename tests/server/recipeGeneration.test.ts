import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes/index';

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
};
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn(() => mockOpenAI)
}));

// Mock Replicate
const mockReplicate = {
  run: jest.fn()
};
jest.mock('replicate', () => ({
  __esModule: true,
  default: jest.fn(() => mockReplicate)
}));

// Mock storage
const mockStorage = {
  saveRecipe: jest.fn(),
  getDeveloperLogs: jest.fn().mockResolvedValue([]),
  getRecipesByUser: jest.fn().mockResolvedValue([]),
  deleteRecipe: jest.fn(),
  getRecipeByShareId: jest.fn(),
  updateRecipeSharing: jest.fn(),
  getUserByEmail: jest.fn(),
  createUser: jest.fn()
};

jest.mock('../../server/storage', () => ({
  storage: mockStorage
}));

// Mock other dependencies
jest.mock('../../server/googleLiveAudio', () => ({
  setupGoogleLiveAudioWebSocket: jest.fn(),
}));

jest.mock('../../server/developerLogger', () => ({
  logGPTInteraction: jest.fn(),
}));

jest.mock('../../server/vision', () => ({
  processFridgeImage: jest.fn(),
}));

describe('Recipe Generation API', () => {
  let app: express.Application;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    // Mock session middleware
    app.use((req, res, next) => {
      req.session = {
        userId: 1,
        isPlus: false,
        save: jest.fn(),
        destroy: jest.fn(),
        reload: jest.fn(),
        regenerate: jest.fn(),
        touch: jest.fn()
      } as any;
      next();
    });

    await registerRoutes(app);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/recipe-ideas', () => {
    const validRecipeRequest = {
      portions: '2',
      timeAvailable: '30 minutes',
      equipment: ['stove', 'oven'],
      mood: 'comfort',
      ambition: 'medium',
      budget: 'moderate',
      cuisines: ['italian'],
      dietaryRestrictions: [],
      supermarket: 'whole-foods'
    };

    it('should generate recipe ideas with valid input', async () => {
      const mockRecipeResponse = {
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
                },
                {
                  title: 'Chicken Parmesan',
                  description: 'Crispy breaded chicken with marinara',
                  cookTime: '35 minutes',
                  difficulty: 'Medium',
                  cuisine: 'Italian'
                }
              ]
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockRecipeResponse);

      const response = await request(app)
        .post('/api/recipe-ideas')
        .send(validRecipeRequest)
        .expect(200);

      expect(response.body.recipes).toHaveLength(2);
      expect(response.body.recipes[0]).toHaveProperty('title', 'Creamy Pasta Carbonara');
      expect(response.body.recipes[1]).toHaveProperty('title', 'Chicken Parmesan');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for missing required fields', async () => {
      const invalidRequest = {
        portions: '2',
        timeAvailable: '30 minutes'
        // Missing other required fields
      };

      const response = await request(app)
        .post('/api/recipe-ideas')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
      expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
    });

    it('should handle OpenAI API errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('OpenAI API Error'));

      const response = await request(app)
        .post('/api/recipe-ideas')
        .send(validRecipeRequest)
        .expect(500);

      expect(response.body.error).toContain('Failed to generate recipe ideas');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it('should handle malformed OpenAI response', async () => {
      const malformedResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON content'
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(malformedResponse);

      const response = await request(app)
        .post('/api/recipe-ideas')
        .send(validRecipeRequest)
        .expect(500);

      expect(response.body.error).toContain('Failed to generate recipe ideas');
    });

    it('should validate equipment array format', async () => {
      const invalidEquipmentRequest = {
        ...validRecipeRequest,
        equipment: 'stove' // Should be array, not string
      };

      const response = await request(app)
        .post('/api/recipe-ideas')
        .send(invalidEquipmentRequest)
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
    });

    it('should validate cuisines array format', async () => {
      const invalidCuisinesRequest = {
        ...validRecipeRequest,
        cuisines: 'italian' // Should be array, not string
      };

      const response = await request(app)
        .post('/api/recipe-ideas')
        .send(invalidCuisinesRequest)
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
    });
  });

  describe('POST /api/generate-full-recipe', () => {
    const fullRecipeRequest = {
      selectedRecipe: {
        title: 'Creamy Pasta Carbonara',
        description: 'Classic Italian comfort food'
      },
      quizData: {
        portions: '2',
        timeAvailable: '30 minutes',
        equipment: ['stove'],
        mood: 'comfort'
      }
    };

    it('should generate full recipe with detailed instructions', async () => {
      const mockFullRecipeResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Creamy Pasta Carbonara',
              description: 'Classic Italian comfort food',
              servings: 2,
              cookTime: '25 minutes',
              difficulty: 'Medium',
              ingredients: [
                '200g spaghetti',
                '100g pancetta',
                '2 eggs',
                '50g pecorino cheese'
              ],
              instructions: [
                'Boil water for pasta',
                'Cook pancetta until crispy',
                'Beat eggs with cheese',
                'Toss hot pasta with egg mixture'
              ],
              tips: ['Use room temperature eggs', 'Work quickly to avoid scrambling']
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockFullRecipeResponse);
      mockStorage.saveRecipe.mockResolvedValue({ id: 'recipe-123' });

      const response = await request(app)
        .post('/api/generate-full-recipe')
        .send(fullRecipeRequest)
        .expect(200);

      expect(response.body).toHaveProperty('title', 'Creamy Pasta Carbonara');
      expect(response.body).toHaveProperty('ingredients');
      expect(response.body).toHaveProperty('instructions');
      expect(response.body.ingredients).toHaveLength(4);
      expect(response.body.instructions).toHaveLength(4);
      expect(mockStorage.saveRecipe).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for missing selectedRecipe', async () => {
      const invalidRequest = {
        quizData: fullRecipeRequest.quizData
        // Missing selectedRecipe
      };

      const response = await request(app)
        .post('/api/generate-full-recipe')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toContain('Selected recipe is required');
      expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
    });

    it('should handle recipe storage errors', async () => {
      const mockRecipeResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Test Recipe',
              ingredients: ['ingredient1'],
              instructions: ['step1']
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockRecipeResponse);
      mockStorage.saveRecipe.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/generate-full-recipe')
        .send(fullRecipeRequest)
        .expect(500);

      expect(response.body.error).toContain('Failed to generate full recipe');
    });
  });

  describe('POST /api/recipes/share', () => {
    it('should create share link for valid recipe', async () => {
      mockStorage.updateRecipeSharing.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/recipes/share')
        .send({ recipeId: 'recipe-123' })
        .expect(200);

      expect(response.body).toHaveProperty('shareId');
      expect(response.body.shareId).toMatch(/^share_\d+_[a-z0-9]+$/);
      expect(mockStorage.updateRecipeSharing).toHaveBeenCalledWith(
        'recipe-123',
        expect.stringMatching(/^share_\d+_[a-z0-9]+$/)
      );
    });

    it('should return 400 for missing recipe ID', async () => {
      const response = await request(app)
        .post('/api/recipes/share')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Recipe ID is required');
      expect(mockStorage.updateRecipeSharing).not.toHaveBeenCalled();
    });

    it('should handle database errors during sharing', async () => {
      mockStorage.updateRecipeSharing.mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .post('/api/recipes/share')
        .send({ recipeId: 'recipe-123' })
        .expect(500);

      expect(response.body.error).toContain('Failed to share recipe');
    });
  });

  describe('GET /api/recipes/shared/:shareId', () => {
    it('should return shared recipe for valid share ID', async () => {
      const mockSharedRecipe = {
        id: 'recipe-123',
        title: 'Shared Pasta Recipe',
        ingredients: ['pasta', 'sauce'],
        instructions: ['cook pasta', 'add sauce'],
        shareId: 'share_123_abc'
      };

      mockStorage.getRecipeByShareId.mockResolvedValue(mockSharedRecipe);

      const response = await request(app)
        .get('/api/recipes/shared/share_123_abc')
        .expect(200);

      expect(response.body).toEqual(mockSharedRecipe);
      expect(mockStorage.getRecipeByShareId).toHaveBeenCalledWith('share_123_abc');
    });

    it('should return 404 for non-existent share ID', async () => {
      mockStorage.getRecipeByShareId.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/recipes/shared/invalid_share_id')
        .expect(404);

      expect(response.body.error).toBe('Recipe not found');
    });
  });
});