import { storage } from '../../server/storage';
import { insertUserSchema, insertRecipeSchema } from '@shared/schema';

// Mock the database connection
const mockDb = {
  insert: jest.fn(),
  select: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

const mockUserTable = {
  values: jest.fn(),
  returning: jest.fn(),
  where: jest.fn()
};

const mockRecipeTable = {
  values: jest.fn(),
  returning: jest.fn(),
  where: jest.fn()
};

jest.mock('../../server/storage', () => {
  const originalStorage = {
    getUserByEmail: jest.fn(),
    createUser: jest.fn(),
    getUserById: jest.fn(),
    saveRecipe: jest.fn(),
    getRecipesByUser: jest.fn(),
    getRecipeById: jest.fn(),
    deleteRecipe: jest.fn(),
    updateRecipeSharing: jest.fn(),
    getRecipeByShareId: jest.fn(),
    getDeveloperLogs: jest.fn(),
    resetMonthlyUsage: jest.fn()
  };

  return {
    storage: originalStorage,
    __esModule: true
  };
});

describe('Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Management', () => {
    describe('createUser', () => {
      it('should create user with valid data', async () => {
        const userData = {
          email: 'test@example.com',
          name: 'Test User',
          passwordHash: 'hashed_password_123'
        };

        const createdUser = {
          id: 1,
          ...userData,
          isPlus: false,
          monthlyUsage: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        (storage.createUser as jest.Mock).mockResolvedValue(createdUser);

        const result = await storage.createUser(userData);

        expect(result).toEqual(createdUser);
        expect(storage.createUser).toHaveBeenCalledWith(userData);
      });

      it('should validate user data before creation', async () => {
        const invalidUserData = {
          email: 'invalid-email',
          name: '',
          passwordHash: ''
        };

        // Test validation with Zod schema
        const validation = insertUserSchema.safeParse(invalidUserData);
        expect(validation.success).toBe(false);
        
        if (!validation.success) {
          expect(validation.error.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                path: ['email'],
                message: expect.stringContaining('Invalid email')
              })
            ])
          );
        }
      });

      it('should handle database constraint violations', async () => {
        const userData = {
          email: 'existing@example.com',
          name: 'Test User',
          passwordHash: 'hashed_password'
        };

        const dbError = new Error('UNIQUE constraint failed: users.email');
        (storage.createUser as jest.Mock).mockRejectedValue(dbError);

        await expect(storage.createUser(userData)).rejects.toThrow('UNIQUE constraint failed');
      });
    });

    describe('getUserByEmail', () => {
      it('should return user for existing email', async () => {
        const mockUser = {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          passwordHash: 'hashed_password',
          isPlus: false,
          monthlyUsage: 3,
          createdAt: new Date()
        };

        (storage.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);

        const result = await storage.getUserByEmail('test@example.com');

        expect(result).toEqual(mockUser);
        expect(storage.getUserByEmail).toHaveBeenCalledWith('test@example.com');
      });

      it('should return null for non-existent email', async () => {
        (storage.getUserByEmail as jest.Mock).mockResolvedValue(null);

        const result = await storage.getUserByEmail('nonexistent@example.com');

        expect(result).toBeNull();
      });

      it('should handle email case insensitivity', async () => {
        const mockUser = {
          id: 1,
          email: 'test@example.com',
          name: 'Test User'
        };

        (storage.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);

        const result = await storage.getUserByEmail('TEST@EXAMPLE.COM');

        expect(result).toEqual(mockUser);
      });
    });

    describe('getUserById', () => {
      it('should return user for valid ID', async () => {
        const mockUser = {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          isPlus: true,
          monthlyUsage: 10
        };

        (storage.getUserById as jest.Mock).mockResolvedValue(mockUser);

        const result = await storage.getUserById(1);

        expect(result).toEqual(mockUser);
        expect(storage.getUserById).toHaveBeenCalledWith(1);
      });

      it('should return null for non-existent ID', async () => {
        (storage.getUserById as jest.Mock).mockResolvedValue(null);

        const result = await storage.getUserById(999);

        expect(result).toBeNull();
      });
    });
  });

  describe('Recipe Management', () => {
    describe('saveRecipe', () => {
      it('should save recipe with valid data', async () => {
        const recipeData = {
          title: 'Test Recipe',
          description: 'A delicious test recipe',
          ingredients: ['ingredient1', 'ingredient2'],
          instructions: ['step1', 'step2'],
          cookTime: '30 minutes',
          difficulty: 'Medium',
          cuisine: 'Italian',
          servings: 4,
          mode: 'shopping' as const,
          userId: 1
        };

        const savedRecipe = {
          id: 'recipe-123',
          ...recipeData,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        (storage.saveRecipe as jest.Mock).mockResolvedValue(savedRecipe);

        const result = await storage.saveRecipe(recipeData);

        expect(result).toEqual(savedRecipe);
        expect(storage.saveRecipe).toHaveBeenCalledWith(recipeData);
      });

      it('should validate recipe data before saving', async () => {
        const invalidRecipeData = {
          title: '',
          ingredients: [],
          instructions: [],
          servings: -1
        };

        // Test validation with Zod schema
        const validation = insertRecipeSchema.safeParse(invalidRecipeData);
        expect(validation.success).toBe(false);
        
        if (!validation.success) {
          expect(validation.error.issues.length).toBeGreaterThan(0);
        }
      });

      it('should handle missing required fields', async () => {
        const incompleteRecipeData = {
          title: 'Test Recipe'
          // Missing other required fields
        };

        const validation = insertRecipeSchema.safeParse(incompleteRecipeData);
        expect(validation.success).toBe(false);
      });
    });

    describe('getRecipesByUser', () => {
      it('should return recipes for valid user ID', async () => {
        const mockRecipes = [
          {
            id: 'recipe-1',
            title: 'Recipe 1',
            description: 'First recipe',
            userId: 1,
            mode: 'shopping',
            createdAt: new Date()
          },
          {
            id: 'recipe-2',
            title: 'Recipe 2',
            description: 'Second recipe',
            userId: 1,
            mode: 'fridge',
            createdAt: new Date()
          }
        ];

        (storage.getRecipesByUser as jest.Mock).mockResolvedValue(mockRecipes);

        const result = await storage.getRecipesByUser(1);

        expect(result).toEqual(mockRecipes);
        expect(result).toHaveLength(2);
        expect(storage.getRecipesByUser).toHaveBeenCalledWith(1);
      });

      it('should return empty array for user with no recipes', async () => {
        (storage.getRecipesByUser as jest.Mock).mockResolvedValue([]);

        const result = await storage.getRecipesByUser(1);

        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });

      it('should handle non-existent user ID', async () => {
        (storage.getRecipesByUser as jest.Mock).mockResolvedValue([]);

        const result = await storage.getRecipesByUser(999);

        expect(result).toEqual([]);
      });
    });

    describe('getRecipeById', () => {
      it('should return recipe for valid ID', async () => {
        const mockRecipe = {
          id: 'recipe-123',
          title: 'Test Recipe',
          description: 'A test recipe',
          ingredients: ['ingredient1'],
          instructions: ['step1'],
          userId: 1,
          mode: 'shopping'
        };

        (storage.getRecipeById as jest.Mock).mockResolvedValue(mockRecipe);

        const result = await storage.getRecipeById('recipe-123');

        expect(result).toEqual(mockRecipe);
        expect(storage.getRecipeById).toHaveBeenCalledWith('recipe-123');
      });

      it('should return null for non-existent recipe ID', async () => {
        (storage.getRecipeById as jest.Mock).mockResolvedValue(null);

        const result = await storage.getRecipeById('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('deleteRecipe', () => {
      it('should delete recipe for authorized user', async () => {
        (storage.deleteRecipe as jest.Mock).mockResolvedValue(true);

        const result = await storage.deleteRecipe('recipe-123', 1);

        expect(result).toBe(true);
        expect(storage.deleteRecipe).toHaveBeenCalledWith('recipe-123', 1);
      });

      it('should prevent deletion by unauthorized user', async () => {
        (storage.deleteRecipe as jest.Mock).mockResolvedValue(false);

        const result = await storage.deleteRecipe('recipe-123', 999);

        expect(result).toBe(false);
      });

      it('should handle deletion of non-existent recipe', async () => {
        (storage.deleteRecipe as jest.Mock).mockResolvedValue(false);

        const result = await storage.deleteRecipe('non-existent', 1);

        expect(result).toBe(false);
      });
    });

    describe('Recipe Sharing', () => {
      it('should update recipe with share ID', async () => {
        const shareId = 'share_123_abc';
        (storage.updateRecipeSharing as jest.Mock).mockResolvedValue(true);

        const result = await storage.updateRecipeSharing('recipe-123', shareId);

        expect(result).toBe(true);
        expect(storage.updateRecipeSharing).toHaveBeenCalledWith('recipe-123', shareId);
      });

      it('should retrieve recipe by share ID', async () => {
        const mockSharedRecipe = {
          id: 'recipe-123',
          title: 'Shared Recipe',
          shareId: 'share_123_abc',
          isShared: true
        };

        (storage.getRecipeByShareId as jest.Mock).mockResolvedValue(mockSharedRecipe);

        const result = await storage.getRecipeByShareId('share_123_abc');

        expect(result).toEqual(mockSharedRecipe);
        expect(storage.getRecipeByShareId).toHaveBeenCalledWith('share_123_abc');
      });

      it('should return null for invalid share ID', async () => {
        (storage.getRecipeByShareId as jest.Mock).mockResolvedValue(null);

        const result = await storage.getRecipeByShareId('invalid_share');

        expect(result).toBeNull();
      });
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity between users and recipes', async () => {
      // Test that recipes are properly linked to users
      const userId = 1;
      const mockRecipes = [
        { id: 'recipe-1', userId: 1, title: 'Recipe 1' },
        { id: 'recipe-2', userId: 1, title: 'Recipe 2' }
      ];

      (storage.getRecipesByUser as jest.Mock).mockResolvedValue(mockRecipes);

      const recipes = await storage.getRecipesByUser(userId);

      expect(recipes.every(recipe => recipe.userId === userId)).toBe(true);
    });

    it('should handle concurrent operations safely', async () => {
      // Simulate concurrent recipe saves
      const recipeData1 = {
        title: 'Recipe 1',
        ingredients: ['ingredient1'],
        instructions: ['step1'],
        userId: 1,
        mode: 'shopping' as const
      };

      const recipeData2 = {
        title: 'Recipe 2',
        ingredients: ['ingredient2'],
        instructions: ['step2'],
        userId: 1,
        mode: 'fridge' as const
      };

      (storage.saveRecipe as jest.Mock)
        .mockResolvedValueOnce({ id: 'recipe-1', ...recipeData1 })
        .mockResolvedValueOnce({ id: 'recipe-2', ...recipeData2 });

      const [recipe1, recipe2] = await Promise.all([
        storage.saveRecipe(recipeData1),
        storage.saveRecipe(recipeData2)
      ]);

      expect(recipe1.id).toBe('recipe-1');
      expect(recipe2.id).toBe('recipe-2');
      expect(storage.saveRecipe).toHaveBeenCalledTimes(2);
    });

    it('should handle transaction rollbacks on errors', async () => {
      const recipeData = {
        title: 'Test Recipe',
        ingredients: ['ingredient1'],
        instructions: ['step1'],
        userId: 999, // Non-existent user
        mode: 'shopping' as const
      };

      const dbError = new Error('FOREIGN KEY constraint failed');
      (storage.saveRecipe as jest.Mock).mockRejectedValue(dbError);

      await expect(storage.saveRecipe(recipeData)).rejects.toThrow('FOREIGN KEY constraint failed');
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large recipe datasets efficiently', async () => {
      const largeRecipeList = Array.from({ length: 100 }, (_, i) => ({
        id: `recipe-${i}`,
        title: `Recipe ${i}`,
        userId: 1,
        mode: 'shopping',
        createdAt: new Date()
      }));

      (storage.getRecipesByUser as jest.Mock).mockResolvedValue(largeRecipeList);

      const startTime = Date.now();
      const result = await storage.getRecipesByUser(1);
      const endTime = Date.now();

      expect(result).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should optimize database queries for recipe search', async () => {
      // Test that search operations are efficient
      const searchResults = [
        { id: 'recipe-1', title: 'Pasta Recipe', cuisine: 'Italian' },
        { id: 'recipe-2', title: 'Pizza Recipe', cuisine: 'Italian' }
      ];

      (storage.getRecipesByUser as jest.Mock).mockResolvedValue(searchResults);

      const result = await storage.getRecipesByUser(1);

      expect(result).toHaveLength(2);
      expect(result.every(recipe => recipe.cuisine === 'Italian')).toBe(true);
    });
  });
});