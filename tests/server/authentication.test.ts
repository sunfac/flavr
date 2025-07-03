import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { registerRoutes } from '../../server/routes/index';

// Mock bcrypt for password hashing
const mockBcrypt = {
  hash: jest.fn(),
  compare: jest.fn()
};
jest.mock('bcrypt', () => mockBcrypt);

// Mock storage
const mockStorage = {
  getUserByEmail: jest.fn(),
  createUser: jest.fn(),
  getUserById: jest.fn(),
  getDeveloperLogs: jest.fn().mockResolvedValue([]),
  getRecipesByUser: jest.fn().mockResolvedValue([]),
  deleteRecipe: jest.fn(),
  getRecipeByShareId: jest.fn(),
  updateRecipeSharing: jest.fn(),
  saveRecipe: jest.fn()
};

jest.mock('../../server/storage', () => ({
  storage: mockStorage
}));

// Mock other dependencies
jest.mock('openai');
jest.mock('replicate');
jest.mock('stripe');
jest.mock('../../server/googleLiveAudio', () => ({
  setupGoogleLiveAudioWebSocket: jest.fn(),
}));

describe('Authentication & User Management', () => {
  let app: express.Application;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    // Add session middleware for authentication tests
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

  describe('POST /api/register', () => {
    const validSignupData = {
      email: 'test@example.com',
      password: 'securePassword123',
      username: 'testuser'
    };

    it('should create new user with valid data', async () => {
      const hashedPassword = 'hashed_password_123';
      const newUser = {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        password: hashedPassword,
        hasFlavrPlus: false,
        createdAt: new Date()
      };

      mockStorage.getUserByEmail.mockResolvedValue(null); // User doesn't exist
      mockStorage.createUser.mockResolvedValue(newUser);

      const response = await request(app)
        .post('/api/register')
        .send(validSignupData)
        .expect(200);

      expect(response.body.user).toEqual({
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        hasFlavrPlus: false
      });
      
      expect(mockStorage.getUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockStorage.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        username: 'testuser',
        password: 'securePassword123'
      });
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        email: 'test@example.com'
        // Missing password and username
      };

      const response = await request(app)
        .post('/api/register')
        .send(incompleteData)
        .expect(400);

      expect(response.body.message).toContain('required');
      expect(mockStorage.getUserByEmail).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid email format', async () => {
      const invalidEmailData = {
        ...validSignupData,
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/signup')
        .send(invalidEmailData)
        .expect(400);

      expect(response.body.error).toContain('Invalid email format');
      expect(mockStorage.getUserByEmail).not.toHaveBeenCalled();
    });

    it('should return 400 for weak password', async () => {
      const weakPasswordData = {
        ...validSignupData,
        password: '123'
      };

      const response = await request(app)
        .post('/api/signup')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body.error).toContain('Password must be at least 6 characters');
      expect(mockStorage.getUserByEmail).not.toHaveBeenCalled();
    });

    it('should return 400 if user already exists', async () => {
      const existingUser = {
        id: 1,
        email: 'test@example.com',
        username: 'existinguser'
      };

      mockStorage.getUserByEmail.mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/api/register')
        .send(validSignupData)
        .expect(400);

      expect(response.body.message).toBe('User already exists');
      expect(mockStorage.createUser).not.toHaveBeenCalled();
    });

    it('should handle database errors during user creation', async () => {
      mockStorage.getUserByEmail.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashed_password');
      mockStorage.createUser.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/signup')
        .send(validSignupData)
        .expect(500);

      expect(response.body.error).toContain('Failed to create user');
    });
  });

  describe('POST /api/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'securePassword123'
    };

    const mockUser = {
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      password: 'hashed_password_123',
      hasFlavrPlus: false
    };

    it('should login user with valid credentials', async () => {
      mockStorage.getUserByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/login')
        .send(validLoginData)
        .expect(200);

      expect(response.body.user).toEqual({
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        hasFlavrPlus: false
      });
      expect(response.body.message).toBe('Login successful');
      
      expect(mockStorage.getUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockBcrypt.compare).toHaveBeenCalledWith('securePassword123', 'hashed_password_123');
    });

    it('should return 401 for non-existent user', async () => {
      mockStorage.getUserByEmail.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return 401 for incorrect password', async () => {
      mockStorage.getUserByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
      expect(mockBcrypt.compare).toHaveBeenCalledWith('securePassword123', 'hashed_password_123');
    });

    it('should return 400 for missing credentials', async () => {
      const incompleteData = {
        email: 'test@example.com'
        // Missing password
      };

      const response = await request(app)
        .post('/api/login')
        .send(incompleteData)
        .expect(400);

      expect(response.body.message).toContain('Email and password are required');
      expect(mockStorage.getUserByEmail).not.toHaveBeenCalled();
    });

    it('should handle database errors during login', async () => {
      mockStorage.getUserByEmail.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/login')
        .send(validLoginData)
        .expect(500);

      expect(response.body.error).toContain('Login failed');
    });
  });

  describe('GET /api/me', () => {
    it('should return current user when authenticated', async () => {
      const agent = request.agent(app);
      
      // First login to create session
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed_password',
        isPlus: true,
        monthlyUsage: 5
      };

      mockStorage.getUserByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);

      await agent
        .post('/api/login')
        .send({ email: 'test@example.com', password: 'password' })
        .expect(200);

      // Now check /api/me endpoint
      const response = await agent
        .get('/api/me')
        .expect(200);

      expect(response.body.user).toEqual({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isPlus: true,
        monthlyUsage: 5
      });
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/me')
        .expect(401);

      expect(response.body.message).toBe('Authentication required');
    });
  });

  describe('POST /api/logout', () => {
    it('should logout authenticated user', async () => {
      const agent = request.agent(app);
      
      // First login
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        isPlus: false,
        monthlyUsage: 0
      };

      mockStorage.getUserByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);

      await agent
        .post('/api/login')
        .send({ email: 'test@example.com', password: 'password' })
        .expect(200);

      // Now logout
      const response = await agent
        .post('/api/logout')
        .expect(200);

      expect(response.body.message).toBe('Logout successful');

      // Verify session is destroyed by checking /api/me
      await agent
        .get('/api/me')
        .expect(401);
    });

    it('should handle logout when not authenticated', async () => {
      const response = await request(app)
        .post('/api/logout')
        .expect(200);

      expect(response.body.message).toBe('Logout successful');
    });
  });

  describe('Session Management', () => {
    it('should maintain session across requests', async () => {
      const agent = request.agent(app);
      
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed_password',
        isPlus: false,
        monthlyUsage: 0
      };

      mockStorage.getUserByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockStorage.getRecipesByUser.mockResolvedValue([]);

      // Login
      await agent
        .post('/api/login')
        .send({ email: 'test@example.com', password: 'password' })
        .expect(200);

      // Make authenticated request
      await agent
        .get('/api/recipes')
        .expect(200);

      // Session should still be valid
      await agent
        .get('/api/me')
        .expect(200);
    });

    it('should reject requests with invalid session', async () => {
      const response = await request(app)
        .get('/api/recipes')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('Password Security', () => {
    it('should hash passwords during signup', async () => {
      const signupData = {
        email: 'test@example.com',
        password: 'plainTextPassword',
        name: 'Test User'
      };

      mockStorage.getUserByEmail.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('securely_hashed_password');
      mockStorage.createUser.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'securely_hashed_password',
        isPlus: false,
        monthlyUsage: 0
      });

      await request(app)
        .post('/api/signup')
        .send(signupData)
        .expect(201);

      expect(mockBcrypt.hash).toHaveBeenCalledWith('plainTextPassword', 10);
      expect(mockStorage.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: 'securely_hashed_password'
        })
      );
    });

    it('should verify passwords during login', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'userEnteredPassword'
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        passwordHash: 'stored_hashed_password',
        isPlus: false,
        monthlyUsage: 0
      };

      mockStorage.getUserByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);

      await request(app)
        .post('/api/login')
        .send(loginData)
        .expect(200);

      expect(mockBcrypt.compare).toHaveBeenCalledWith('userEnteredPassword', 'stored_hashed_password');
    });
  });
});