# Flavr - Technical Specification
*Version 1.0 - January 23, 2025*

## System Architecture Overview

Flavr is built as a modern full-stack web application using a microservices-oriented architecture with the following core components:

- **Frontend**: React 18 with TypeScript, Vite build system
- **Backend**: Node.js Express server with modular route architecture
- **Database**: PostgreSQL with Drizzle ORM for type-safe operations
- **AI Services**: OpenAI GPT models, Google Gemini for conversations
- **Payment**: Stripe integration for subscription management
- **Deployment**: Replit platform with production build optimization

## Frontend Architecture

### Technology Stack
```typescript
// Core Dependencies
- React 18.2.0 with TypeScript 5.x
- Vite 5.x for build tooling and HMR
- Tailwind CSS 3.x for styling
- shadcn/ui component library
- Wouter for lightweight routing
- TanStack Query v5 for server state
- Zustand for client state management
- Framer Motion for animations
```

### Project Structure
```
client/
├── src/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── recipe/             # Recipe-specific components
│   │   ├── chat/               # Chat and voice components
│   │   └── GlobalNavigation.tsx
│   ├── pages/                  # Route components
│   │   ├── ModeSelection.tsx   # Cooking mode selection
│   │   ├── ShoppingMode.tsx    # Shopping mode implementation
│   │   ├── FridgeMode.tsx      # Fridge mode implementation
│   │   ├── ChefAssistMode.tsx  # Chef assist mode
│   │   ├── BudgetPlannerMode.tsx # Budget planning mode
│   │   └── DigitalCookbook.tsx # My Cookbook page
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utility functions
│   ├── providers/              # Context providers
│   └── stores/                 # Zustand stores
```

### Key Components

#### EnhancedRecipeCard
```typescript
interface EnhancedRecipeCardProps {
  recipe: Recipe;
  showFullRecipe?: boolean;
  onClose?: () => void;
  isPreview?: boolean;
}

// Features:
- Responsive CSS Grid layout
- Mobile-first design with 16:10 aspect ratio images
- Ingredient substitution buttons with AI integration
- Save/favorite functionality with heart icon
- Social sharing via getflavr.ai domain
- Step-by-step cooking instructions
```

#### ChatBot (Zest AI Assistant)
```typescript
// OpenAI Function Calling Integration
- Real-time recipe modifications via streaming
- Ingredient substitution with instruction updates
- Conversation context retention
- Voice integration with Google Live Audio API
- Smart suggestion chips for common queries
```

#### Theme System
```typescript
// Dark/Light Theme Implementation
- localStorage persistence
- CSS custom properties for theming
- Tailwind dark: variants throughout
- Default dark theme for cooking scenarios
```

### State Management

#### Recipe Store (Zustand)
```typescript
interface RecipeStore {
  currentRecipe: Recipe | null;
  isLoading: boolean;
  error: string | null;
  setCurrentRecipe: (recipe: Recipe) => void;
  updateRecipe: (updates: Partial<Recipe>) => void;
  clearRecipe: () => void;
}
```

#### Query Client Configuration
```typescript
// TanStack Query Setup
- Default stale time: 5 minutes
- Retry logic for failed requests
- Cache invalidation strategies
- Error boundary integration
```

### API Integration
```typescript
// Client-side API layer
interface APIClient {
  // Recipe Generation
  generateRecipeIdeas(quizData: QuizData): Promise<RecipeIdea[]>;
  generateFullRecipe(selectedRecipe: RecipeIdea): Promise<Recipe>;
  
  // Recipe Management
  saveRecipe(recipe: Recipe): Promise<void>;
  getRecipes(): Promise<Recipe[]>;
  deleteRecipe(id: number): Promise<void>;
  
  // AI Chat
  sendChatMessage(message: string, context?: any): Promise<ChatResponse>;
  substituteIngredient(ingredient: string, recipe: Recipe): Promise<Recipe>;
  
  // User Management
  getCurrentUser(): Promise<User>;
  updateSubscription(plan: string): Promise<SubscriptionStatus>;
}
```

## Backend Architecture

### Technology Stack
```typescript
// Core Dependencies
- Node.js 18+ with TypeScript
- Express.js 4.x for HTTP server
- Drizzle ORM with PostgreSQL
- express-session for authentication
- WebSocket for real-time features
- OpenAI SDK for AI integration
- Stripe SDK for payments
```

### Modular Route Architecture
```
server/
├── routes/
│   ├── index.ts              # Route registration
│   ├── authRoutes.ts         # Authentication endpoints
│   ├── recipeRoutes.ts       # Recipe generation/management
│   ├── chatRoutes.ts         # AI chat endpoints
│   ├── subscriptionRoutes.ts # Stripe integration
│   └── interactionRoutes.ts  # Analytics logging
├── storage.ts                # Database abstraction layer
├── db.ts                     # Database connection
├── geminiChat.ts             # Google Gemini integration
├── imageGeneration.ts        # Recipe image generation
└── index.ts                  # Server entry point
```

### Core API Endpoints

#### Recipe Generation
```typescript
// Shopping Mode
POST /api/generate-shopping-recipe
Body: {
  quizData: {
    cuisines: string[];
    dietaryRestrictions: string[];
    cookingTime: number;
    servings: number;
    supermarket: string;
  }
}
Response: {
  recipes: RecipeIdea[];
  sessionId: string;
}

// Full Recipe Generation
POST /api/generate-full-recipe
Body: {
  selectedRecipe: RecipeIdea;
  mode: 'shopping' | 'fridge' | 'chef' | 'budget';
  context: any;
}
Response: {
  recipe: Recipe;
  imageUrl?: string;
}
```

#### AI Chat Integration
```typescript
// Streaming Chat Endpoint
POST /api/chat/stream
Body: {
  message: string;
  conversationHistory: ChatMessage[];
  recipeContext?: Recipe;
}
Response: Server-Sent Events stream with:
- text: string (chat response)
- function_call?: {
    name: string;
    arguments: any;
  }

// Ingredient Substitution
POST /api/ingredient-substitute
Body: {
  ingredient: string;
  substitute: string;
  recipe: Recipe;
}
Response: {
  updatedRecipe: Recipe;
  changes: string[];
}
```

#### User Management
```typescript
// Authentication
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
GET /api/me

// Recipe Management
GET /api/recipes                # Get user's saved recipes
POST /api/save-recipe          # Save recipe to cookbook
DELETE /api/recipes/:id        # Delete saved recipe
GET /api/recipes/shared/:shareId # Get shared recipe
```

#### Subscription Management
```typescript
// Stripe Integration
POST /api/create-subscription   # Create Flavr+ subscription
POST /api/cancel-subscription   # Cancel subscription
POST /api/reactivate-subscription # Reactivate subscription
GET /api/subscription-status    # Get current status
POST /api/stripe-webhook        # Handle Stripe events
```

### Database Schema

#### Core Tables
```sql
-- Users table with subscription tracking
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR UNIQUE,
  username VARCHAR UNIQUE,
  password_hash VARCHAR NOT NULL,
  first_name VARCHAR,
  last_name VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Subscription fields
  stripe_customer_id VARCHAR,
  stripe_subscription_id VARCHAR,
  subscription_status VARCHAR DEFAULT 'free',
  subscription_expires_at TIMESTAMP,
  has_flavr_plus BOOLEAN DEFAULT FALSE,
  
  -- Usage tracking
  recipes_generated_this_month INTEGER DEFAULT 0,
  last_recipe_reset TIMESTAMP DEFAULT NOW()
);

-- Recipes table with comprehensive metadata
CREATE TABLE recipes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR NOT NULL,
  description TEXT,
  ingredients JSONB NOT NULL,
  instructions JSONB NOT NULL,
  
  -- Recipe metadata
  cuisine VARCHAR,
  difficulty VARCHAR,
  cook_time INTEGER,
  prep_time INTEGER,
  servings INTEGER,
  
  -- Generation context
  mode VARCHAR, -- 'shopping', 'fridge', 'chef', 'budget'
  quiz_data JSONB,
  ai_model VARCHAR,
  generation_cost DECIMAL,
  
  -- Sharing
  is_shared BOOLEAN DEFAULT FALSE,
  share_id VARCHAR UNIQUE,
  share_count INTEGER DEFAULT 0,
  
  -- Media
  image_url VARCHAR,
  image_prompt VARCHAR,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat messages for conversation history
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  recipe_id INTEGER REFERENCES recipes(id),
  message TEXT NOT NULL,
  response TEXT,
  ai_model VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Developer and analytics logging
CREATE TABLE developer_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  endpoint VARCHAR,
  prompt TEXT,
  response TEXT,
  ai_model VARCHAR,
  tokens_used INTEGER,
  cost DECIMAL,
  processing_time INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Behavioral profiling for B2B insights
CREATE TABLE interaction_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  session_id VARCHAR,
  interaction_type VARCHAR, -- 'recipe_generation', 'ingredient_substitution', etc.
  data JSONB, -- Structured interaction data
  timestamp TIMESTAMP DEFAULT NOW()
);
```

### AI Integration Architecture

#### OpenAI Integration
```typescript
// Recipe Generation Pipeline
class RecipeGenerator {
  async generateRecipeIdeas(quizData: QuizData): Promise<RecipeIdea[]> {
    const prompt = this.buildPrompt(quizData);
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.9, // High creativity for diversity
      max_tokens: 1500
    });
    
    return this.parseRecipeIdeas(response.choices[0].message.content);
  }
  
  async generateFullRecipe(idea: RecipeIdea, context: any): Promise<Recipe> {
    const prompt = this.buildFullRecipePrompt(idea, context);
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.7,
      max_tokens: 2500
    });
    
    return this.parseFullRecipe(response.choices[0].message.content);
  }
}

// Function Calling for Recipe Modifications
const chatFunctions = [
  {
    name: "update_recipe",
    description: "Update recipe with modifications",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        ingredients: { type: "array" },
        instructions: { type: "array" },
        servings: { type: "number" },
        cookTime: { type: "number" }
      }
    }
  }
];
```

#### Google Gemini Integration
```typescript
// Conversational AI with Context Retention
class GeminiChat {
  async processMessage(
    message: string, 
    history: ChatMessage[], 
    recipeContext?: Recipe
  ): Promise<ChatResponse> {
    const contextPrompt = this.buildContextPrompt(history, recipeContext);
    
    const response = await genai.generateContent({
      model: "gemini-1.5-pro",
      contents: [
        { role: "user", parts: [{ text: contextPrompt + "\n\n" + message }] }
      ],
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens: 1000
      }
    });
    
    return this.parseResponse(response);
  }
}
```

#### Image Generation
```typescript
// Recipe Image Generation via Replicate
class ImageGenerator {
  async generateRecipeImage(recipe: Recipe): Promise<string | null> {
    try {
      const prompt = this.buildImagePrompt(recipe);
      
      const response = await replicate.run(
        "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
        {
          input: {
            prompt: prompt,
            width: 768,
            height: 512,
            num_inference_steps: 25,
            guidance_scale: 7.5
          }
        }
      );
      
      return response[0]; // URL to generated image
    } catch (error) {
      console.error('Image generation failed:', error);
      return null;
    }
  }
  
  private buildImagePrompt(recipe: Recipe): string {
    return `Professional food photography of ${recipe.title}, ${recipe.cuisine} cuisine, beautifully plated, natural lighting, high resolution, appetizing, restaurant quality`;
  }
}
```

### Authentication & Security

#### Session Management
```typescript
// Express Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Authentication Middleware
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};
```

#### Password Security
```typescript
// Bcrypt Integration
import bcrypt from 'bcrypt';

class AuthService {
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }
  
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }
}
```

### Payment Integration

#### Stripe Configuration
```typescript
// Subscription Management
class SubscriptionService {
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  
  async createSubscription(userId: number, email: string): Promise<SubscriptionResult> {
    // Create Stripe customer
    const customer = await this.stripe.customers.create({
      email,
      metadata: { userId: userId.toString() }
    });
    
    // Create subscription
    const subscription = await this.stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.STRIPE_MONTHLY_PRICE_ID }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent']
    });
    
    // Update user record
    await storage.updateUser(userId, {
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
      subscription_status: 'pending'
    });
    
    return {
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret
    };
  }
  
  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;
    }
  }
}
```

### Real-time Features

#### WebSocket Integration
```typescript
// Google Live Audio WebSocket
export function setupGoogleLiveAudioWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server, 
    path: '/api/google-live-audio' 
  });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('🎤 Google Live Audio connection established');
    
    ws.on('message', async (data: Buffer) => {
      try {
        // Process audio data for voice chat
        const audioBuffer = new ArrayBuffer(data.byteLength);
        const uint8Array = new Uint8Array(audioBuffer);
        uint8Array.set(data);
        
        // Send to Google Gemini Live API
        const response = await processVoiceMessage(audioBuffer);
        ws.send(JSON.stringify({
          type: 'voice_response',
          text: response.text,
          audio: response.audioData
        }));
      } catch (error) {
        console.error('Voice processing error:', error);
      }
    });
  });
}
```

### Analytics & Behavioral Profiling

#### Data Collection Strategy
```typescript
// Interaction Logging for B2B Insights
interface InteractionData {
  // User Journey Stage
  stage: 'discovery' | 'generation' | 'modification' | 'saving' | 'sharing';
  
  // Recipe Preferences
  cuisinePreferences: string[];
  difficultyProgression: string[];
  ingredientSubstitutions: Array<{
    original: string;
    substitute: string;
    reason: string;
  }>;
  
  // Shopping Behavior
  supermarketPreference: string;
  budgetRange: string;
  cookingFrequency: string;
  
  // Engagement Metrics
  sessionDuration: number;
  recipesGenerated: number;
  modificationsRequested: number;
  recipesShared: number;
}

class AnalyticsService {
  async logInteraction(userId: number, data: InteractionData): Promise<void> {
    await storage.createInteractionLog({
      userId,
      sessionId: this.getSessionId(),
      interactionType: data.stage,
      data: JSON.stringify(data),
      timestamp: new Date()
    });
  }
}
```

### Performance Optimization

#### Caching Strategy
```typescript
// Recipe Generation Caching
interface CacheStrategy {
  // Cache recipe ideas for similar quiz inputs
  recipeIdeasCache: Map<string, RecipeIdea[]>;
  
  // Cache full recipes by hash of inputs
  fullRecipeCache: Map<string, Recipe>;
  
  // Image URL caching to reduce Replicate API calls
  imageCache: Map<string, string>;
  
  // User data caching for session optimization
  userCache: Map<number, User>;
}

// Database Query Optimization
class OptimizedStorage {
  // Batch recipe fetching with pagination
  async getRecipesByUserPaginated(
    userId: number, 
    offset: number = 0, 
    limit: number = 20
  ): Promise<{ recipes: Recipe[]; total: number }> {
    const [recipes, [{ count }]] = await Promise.all([
      db.select().from(recipes)
        .where(eq(recipes.userId, userId))
        .orderBy(desc(recipes.createdAt))
        .offset(offset)
        .limit(limit),
      db.select({ count: sql`count(*)` }).from(recipes)
        .where(eq(recipes.userId, userId))
    ]);
    
    return { recipes, total: parseInt(count) };
  }
}
```

### Error Handling & Monitoring

#### Comprehensive Error Management
```typescript
// Global Error Handler
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  // Log error with context
  console.error('Server Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userId: req.session?.userId,
    timestamp: new Date().toISOString()
  });
  
  // Send appropriate response
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  } else {
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

// AI Service Error Handling
class AIServiceErrorHandler {
  async handleOpenAIError(error: any): Promise<string> {
    if (error.code === 'rate_limit_exceeded') {
      return 'AI service is temporarily busy. Please try again in a moment.';
    } else if (error.code === 'insufficient_quota') {
      return 'AI service quota exceeded. Please contact support.';
    } else {
      return 'Unable to generate recipe at this time. Please try again.';
    }
  }
}
```

### Deployment & DevOps

#### Production Configuration
```typescript
// Environment Variables
interface EnvironmentConfig {
  // Database
  DATABASE_URL: string;
  
  // AI Services
  OPENAI_API_KEY: string;
  GOOGLE_CLOUD_PROJECT_ID: string;
  GOOGLE_CLOUD_CREDENTIALS: string;
  REPLICATE_API_TOKEN: string;
  
  // Payment
  STRIPE_SECRET_KEY: string;
  STRIPE_MONTHLY_PRICE_ID: string;
  STRIPE_WEBHOOK_SECRET: string;
  
  // Security
  SESSION_SECRET: string;
  
  // Features
  NODE_ENV: 'development' | 'production';
}

// Build Process
{
  "scripts": {
    "build": "vite build && tsc -p tsconfig.server.json",
    "start": "NODE_ENV=production node dist/server/index.js",
    "dev": "NODE_ENV=development tsx server/index.ts",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

#### Health Monitoring
```typescript
// Health Check Endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await db.select().from(users).limit(1);
    
    // Check AI service availability
    const openaiStatus = await checkOpenAIHealth();
    const geminiStatus = await checkGeminiHealth();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        openai: openaiStatus,
        gemini: geminiStatus
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

## Testing Strategy

### Testing Architecture
```typescript
// Jest Configuration
{
  "preset": "ts-jest",
  "testEnvironment": "node",
  "setupFilesAfterEnv": ["<rootDir>/tests/setup.ts"],
  "testMatch": ["<rootDir>/tests/**/*.test.ts"],
  "collectCoverageFrom": [
    "server/**/*.ts",
    "client/src/**/*.{ts,tsx}",
    "!**/*.d.ts"
  ]
}

// Test Categories
interface TestSuite {
  unit: {
    server: string[];      // Storage, services, utilities
    client: string[];      // Components, hooks, stores
  };
  integration: {
    api: string[];         // Full endpoint testing
    database: string[];    // CRUD operations
    auth: string[];        // Authentication flows
  };
  e2e: {
    userFlows: string[];   // Complete user journeys
    payment: string[];     // Stripe integration
    ai: string[];          // AI service integration
  };
}
```

This technical specification provides comprehensive documentation of Flavr's current implementation, covering all architectural components, API designs, database schemas, and integration patterns. The system is designed for scalability, maintainability, and extensibility while providing a robust foundation for the AI-powered culinary platform.

---

*This specification reflects the current technical implementation as of January 23, 2025, and serves as the authoritative reference for development and maintenance activities.*