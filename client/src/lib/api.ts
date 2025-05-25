import { apiRequest } from "./queryClient";

export interface RecipeGenerationRequest {
  mode: "shopping" | "fridge" | "chef";
  quizData: any;
  prompt: string;
  selectedRecipe?: any;
}

export interface ChatRequest {
  message: string;
  currentRecipe?: {
    title: string;
    description: string;
    ingredients: string[];
    instructions: string[];
    cookTime?: number;
    servings?: number;
    difficulty?: string;
    cuisine?: string;
    imageUrl?: string;
    shoppingList?: string[];
  };
  mode?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  isPlus: boolean;
  recipesThisMonth: number;
  imagesThisMonth: number;
}

export interface Recipe {
  id: number;
  userId: number;
  title: string;
  description: string;
  cookTime: number;
  servings: number;
  difficulty: string;
  cuisine: string;
  mood: string;
  mode: string;
  ingredients: string[];
  instructions: string[];
  tips: string;
  imageUrl?: string;
  shoppingList?: string[];
  originalPrompt: string;
  createdAt: Date;
}

export const api = {
  // Authentication
  async login(email: string, password: string) {
    const response = await apiRequest("POST", "/api/login", { email, password });
    return response.json();
  },

  async register(username: string, email: string, password: string) {
    const response = await apiRequest("POST", "/api/register", { username, email, password });
    return response.json();
  },

  async logout() {
    const response = await apiRequest("POST", "/api/logout");
    return response.json();
  },

  async getCurrentUser(): Promise<{ user: User }> {
    const response = await apiRequest("GET", "/api/me");
    return response.json();
  },

  // Recipe Generation
  async generateRecipeIdeas(data: RecipeGenerationRequest) {
    const response = await apiRequest("POST", "/api/generate-recipe-ideas", data);
    return response.json();
  },

  async generateFullRecipe(data: RecipeGenerationRequest) {
    const response = await apiRequest("POST", "/api/generate-full-recipe", data);
    return response.json();
  },

  // Recipes
  async getRecipes(): Promise<{ recipes: Recipe[] }> {
    const response = await apiRequest("GET", "/api/recipes");
    return response.json();
  },

  async getRecipe(id: number): Promise<{ recipe: Recipe }> {
    const response = await apiRequest("GET", `/api/recipes/${id}`);
    return response.json();
  },

  // Chat
  async sendChatMessage(data: ChatRequest) {
    const response = await apiRequest("POST", "/api/chat", data);
    return response.json();
  },

  async getChatHistory() {
    const response = await apiRequest("GET", "/api/chat/history");
    return response.json();
  },

  // Stripe/Subscription
  async createSubscription() {
    const response = await apiRequest("POST", "/api/create-subscription");
    return response.json();
  },
};

export default api;
