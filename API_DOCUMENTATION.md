# Flavr API Documentation
*Version 1.0 - January 23, 2025*

## Base URL
- **Development**: `http://localhost:5000`
- **Production**: `https://getflavr.ai`

## Authentication
Flavr uses session-based authentication with HTTP-only cookies. All authenticated endpoints require a valid session.

### Authentication Headers
```
Cookie: connect.sid=<session-id>
Content-Type: application/json
```

## Authentication Endpoints

### Register User
**POST** `/api/auth/signup`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "cookingfan",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "cookingfan",
    "firstName": "John",
    "lastName": "Doe",
    "hasFlavrPlus": false,
    "recipesGeneratedThisMonth": 0
  }
}
```

**Error Responses:**
- `400` - Validation error (missing fields, invalid email)
- `409` - Email or username already exists

### Login User
**POST** `/api/auth/login`

Authenticate user with email/username and password.

**Request Body:**
```json
{
  "emailOrUsername": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "cookingfan",
    "hasFlavrPlus": false,
    "subscriptionStatus": "free"
  }
}
```

**Error Responses:**
- `400` - Missing credentials
- `401` - Invalid credentials

### Logout User
**POST** `/api/auth/logout`

End user session.

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### Get Current User
**GET** `/api/me`

Get authenticated user information.

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "cookingfan",
  "hasFlavrPlus": true,
  "recipesGeneratedThisMonth": 15,
  "subscriptionStatus": "active",
  "subscriptionExpiresAt": "2025-02-23T00:00:00Z"
}
```

**Error Responses:**
- `401` - Not authenticated

## Recipe Generation Endpoints

### Generate Recipe Ideas
**POST** `/api/generate-shopping-recipe`

Generate recipe suggestions based on quiz inputs.

**Request Body:**
```json
{
  "quizData": {
    "cuisines": ["Italian", "Mexican"],
    "dietaryRestrictions": ["vegetarian"],
    "cookingTime": 45,
    "servings": 4,
    "supermarket": "tesco",
    "mood": "comfort",
    "equipment": ["oven", "stovetop"]
  }
}
```

**Response:**
```json
{
  "recipes": [
    {
      "id": "recipe_001",
      "title": "Creamy Mushroom Risotto",
      "description": "Rich and creamy Arborio rice with wild mushrooms",
      "cuisine": "Italian",
      "difficulty": "medium",
      "cookTime": 35,
      "servings": 4,
      "ingredients": ["arborio rice", "mushrooms", "parmesan"],
      "imageUrl": "https://example.com/risotto.jpg"
    }
  ],
  "sessionId": "sess_abc123"
}
```

### Generate Full Recipe
**POST** `/api/generate-full-recipe`

Generate complete recipe with detailed instructions.

**Request Body:**
```json
{
  "selectedRecipe": {
    "title": "Creamy Mushroom Risotto",
    "cuisine": "Italian"
  },
  "mode": "shopping",
  "quizData": {
    "servings": 4,
    "cookingTime": 45,
    "supermarket": "tesco"
  }
}
```

**Response:**
```json
{
  "recipe": {
    "id": 123,
    "title": "Creamy Mushroom Risotto",
    "description": "Rich and creamy Arborio rice with wild mushrooms",
    "ingredients": [
      {
        "name": "Arborio rice",
        "amount": "300g",
        "section": "grains"
      },
      {
        "name": "Mixed mushrooms",
        "amount": "400g",
        "section": "vegetables"
      }
    ],
    "instructions": [
      {
        "step": 1,
        "instruction": "Heat olive oil in a large pan over medium heat",
        "duration": 2
      }
    ],
    "cuisine": "Italian",
    "difficulty": "medium",
    "cookTime": 35,
    "prepTime": 10,
    "servings": 4,
    "imageUrl": "https://example.com/risotto.jpg",
    "shareId": "abc123xyz"
  }
}
```

### Generate Budget Planner
**POST** `/api/generate-budget-planner`

Generate weekly meal plan with budget optimization.

**Request Body:**
```json
{
  "quizData": {
    "budget": 50,
    "people": 2,
    "dietaryRestrictions": ["gluten-free"],
    "difficulty": "easy",
    "cuisinePreferences": ["Mediterranean"]
  }
}
```

**Response:**
```json
{
  "mealPlan": {
    "totalBudget": 50,
    "estimatedCost": 47.50,
    "meals": [
      {
        "day": "Monday",
        "recipe": "Greek Chicken Bowl",
        "cost": 8.75,
        "ingredients": ["chicken breast", "quinoa", "cucumber"]
      }
    ],
    "shoppingList": [
      {
        "item": "Chicken breast",
        "amount": "1kg",
        "cost": 12.99,
        "section": "meat"
      }
    ]
  }
}
```

## Recipe Management Endpoints

### Save Recipe
**POST** `/api/save-recipe` 🔒

Save recipe to user's cookbook.

**Request Body:**
```json
{
  "recipe": {
    "title": "Creamy Mushroom Risotto",
    "ingredients": [...],
    "instructions": [...],
    "cuisine": "Italian",
    "difficulty": "medium"
  }
}
```

**Response:**
```json
{
  "success": true,
  "recipeId": 123,
  "message": "Recipe saved successfully"
}
```

### Get User Recipes
**GET** `/api/recipes` 🔒

Get all saved recipes for authenticated user.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20)
- `cuisine`: Filter by cuisine
- `difficulty`: Filter by difficulty

**Response:**
```json
{
  "recipes": [
    {
      "id": 123,
      "title": "Creamy Mushroom Risotto",
      "cuisine": "Italian",
      "difficulty": "medium",
      "cookTime": 35,
      "imageUrl": "https://example.com/risotto.jpg",
      "createdAt": "2025-01-23T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### Delete Recipe
**DELETE** `/api/recipes/:id` 🔒

Delete a saved recipe.

**Parameters:**
- `id`: Recipe ID to delete

**Response:**
```json
{
  "success": true,
  "message": "Recipe deleted successfully"
}
```

**Error Responses:**
- `404` - Recipe not found or doesn't belong to user

### Get Shared Recipe
**GET** `/api/recipes/shared/:shareId`

Get recipe by share ID (public endpoint).

**Parameters:**
- `shareId`: Public share identifier

**Response:**
```json
{
  "recipe": {
    "title": "Creamy Mushroom Risotto",
    "ingredients": [...],
    "instructions": [...],
    "cuisine": "Italian",
    "difficulty": "medium",
    "cookTime": 35,
    "imageUrl": "https://example.com/risotto.jpg"
  }
}
```

## AI Chat Endpoints

### Send Chat Message
**POST** `/api/chat/stream` 🔒

Send message to Zest AI assistant with streaming response.

**Request Body:**
```json
{
  "message": "Can you make this recipe dairy-free?",
  "conversationHistory": [
    {
      "role": "user",
      "content": "I'm making risotto tonight"
    }
  ],
  "recipeContext": {
    "title": "Creamy Mushroom Risotto",
    "ingredients": [...],
    "instructions": [...]
  }
}
```

**Response:** Server-Sent Events stream
```
data: {"type": "text", "content": "I can definitely help make this dairy-free! "}

data: {"type": "function_call", "name": "update_recipe", "arguments": {"ingredients": [...]}}

data: {"type": "text", "content": "I've updated the recipe to use coconut milk instead of cream."}

data: [DONE]
```

### Substitute Ingredient
**POST** `/api/ingredient-substitute` 🔒

Replace ingredient with AI-powered substitution.

**Request Body:**
```json
{
  "ingredient": "heavy cream",
  "substitute": "coconut milk",
  "recipe": {
    "title": "Creamy Mushroom Risotto",
    "ingredients": [...],
    "instructions": [...]
  }
}
```

**Response:**
```json
{
  "updatedRecipe": {
    "title": "Creamy Mushroom Risotto",
    "ingredients": [...], // Updated with substitution
    "instructions": [...] // Updated cooking instructions
  },
  "changes": [
    "Replaced heavy cream with coconut milk in ingredients",
    "Updated step 5 to account for different liquid consistency"
  ]
}
```

## Subscription Endpoints

### Create Subscription
**POST** `/api/create-subscription` 🔒

Create Flavr+ subscription via Stripe.

**Request Body:**
```json
{
  "priceId": "price_1Rn2uZHjAEdAA7N8GqRuhPQ0"
}
```

**Response:**
```json
{
  "subscriptionId": "sub_abc123",
  "clientSecret": "pi_abc123_secret_xyz",
  "status": "incomplete"
}
```

### Cancel Subscription
**POST** `/api/cancel-subscription` 🔒

Cancel active subscription.

**Response:**
```json
{
  "success": true,
  "message": "Subscription canceled successfully",
  "endsAt": "2025-02-23T00:00:00Z"
}
```

### Reactivate Subscription
**POST** `/api/reactivate-subscription` 🔒

Reactivate canceled subscription.

**Response:**
```json
{
  "success": true,
  "message": "Subscription reactivated successfully",
  "status": "active"
}
```

### Get Subscription Status
**GET** `/api/subscription-status` 🔒

Get current subscription information.

**Response:**
```json
{
  "status": "active",
  "plan": "monthly",
  "amount": 499,
  "currency": "gbp",
  "currentPeriodStart": "2025-01-23T00:00:00Z",
  "currentPeriodEnd": "2025-02-23T00:00:00Z",
  "cancelAtPeriodEnd": false
}
```

### Stripe Webhook
**POST** `/api/stripe-webhook`

Handle Stripe webhook events (internal endpoint).

**Headers:**
```
Stripe-Signature: <webhook-signature>
```

**Events Handled:**
- `invoice.payment_succeeded`
- `customer.subscription.deleted`
- `customer.subscription.updated`

## Analytics Endpoints

### Log User Interaction
**POST** `/api/log-interaction` 🔒

Log user behavior for analytics.

**Request Body:**
```json
{
  "interactionType": "recipe_generation",
  "data": {
    "mode": "shopping",
    "cuisineSelected": "Italian",
    "timeToGenerate": 3500,
    "supermarket": "tesco"
  }
}
```

**Response:**
```json
{
  "success": true,
  "logId": 456
}
```

### Get Interaction Logs
**GET** `/api/interactions` 🔒

Get user's interaction history (admin/developer only).

**Query Parameters:**
- `limit`: Number of records (default: 100)
- `type`: Filter by interaction type

**Response:**
```json
{
  "logs": [
    {
      "id": 456,
      "interactionType": "recipe_generation",
      "data": {...},
      "timestamp": "2025-01-23T10:00:00Z"
    }
  ]
}
```

## Utility Endpoints

### Health Check
**GET** `/health`

System health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-23T10:00:00Z",
  "services": {
    "database": "connected",
    "openai": "operational",
    "gemini": "operational",
    "stripe": "operational"
  }
}
```

### Developer Logs
**GET** `/api/developer/logs` 🔒

Get AI service logs (developer access only).

**Response:**
```json
{
  "logs": [
    {
      "id": 789,
      "endpoint": "/api/generate-full-recipe",
      "aiModel": "gpt-4",
      "tokensUsed": 1250,
      "cost": 0.025,
      "processingTime": 2300,
      "createdAt": "2025-01-23T10:00:00Z"
    }
  ]
}
```

## WebSocket Endpoints

### Google Live Audio Chat
**WebSocket** `/api/google-live-audio`

Real-time voice chat with Gemini AI.

**Connection:**
```javascript
const ws = new WebSocket('wss://getflavr.ai/api/google-live-audio');
```

**Message Types:**

**Audio Input:**
```json
{
  "type": "audio_input",
  "audioData": "<base64-encoded-audio>",
  "format": "webm"
}
```

**Text Query:**
```json
{
  "type": "text_query",
  "message": "How do I make this recipe spicier?",
  "recipeContext": {...}
}
```

**AI Response:**
```json
{
  "type": "voice_response",
  "text": "To make it spicier, add red pepper flakes...",
  "audioData": "<base64-encoded-audio>"
}
```

## Error Handling

### Standard Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation error details"
  }
}
```

### Common Error Codes
- `AUTH_REQUIRED` (401) - Authentication required
- `INSUFFICIENT_QUOTA` (403) - Free tier limit exceeded
- `VALIDATION_ERROR` (400) - Invalid request data
- `NOT_FOUND` (404) - Resource not found
- `RATE_LIMITED` (429) - Too many requests
- `AI_SERVICE_ERROR` (503) - AI service unavailable

### Rate Limiting
- **Free users**: 10 requests per minute
- **Flavr+ users**: 100 requests per minute
- **Recipe generation**: 5 per minute (free), 20 per minute (premium)

## SDK Examples

### JavaScript/TypeScript
```typescript
// Initialize Flavr API client
const flavr = new FlavrAPI({
  baseURL: 'https://getflavr.ai',
  credentials: 'include' // For session cookies
});

// Generate recipe
const recipes = await flavr.generateRecipeIdeas({
  cuisines: ['Italian'],
  cookingTime: 30,
  servings: 4
});

// Save recipe
await flavr.saveRecipe(selectedRecipe);

// Get saved recipes
const myRecipes = await flavr.getRecipes();
```

### curl Examples
```bash
# Login
curl -X POST https://getflavr.ai/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername": "user@example.com", "password": "password"}' \
  -c cookies.txt

# Generate recipe
curl -X POST https://getflavr.ai/api/generate-shopping-recipe \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"quizData": {"cuisines": ["Italian"], "servings": 4}}'

# Get saved recipes
curl -X GET https://getflavr.ai/api/recipes \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

---

**Legend:**
- 🔒 Requires authentication
- All endpoints return JSON unless otherwise specified
- Timestamps are in ISO 8601 format (UTC)
- Monetary amounts are in smallest currency unit (pence for GBP)

*This API documentation reflects the current implementation as of January 23, 2025.*