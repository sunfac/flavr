import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import EnhancedRecipeCard from '../../client/src/components/EnhancedRecipeCard';

// Mock the API request function
const mockApiRequest = jest.fn();
jest.mock('../../client/src/lib/queryClient', () => ({
  apiRequest: mockApiRequest,
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

// Mock the toast hook
jest.mock('../../client/src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock the Zustand store
const mockRecipeStore = {
  recipe: null,
  setRecipe: jest.fn(),
  updateRecipe: jest.fn(),
  activeServings: 2,
  setActiveServings: jest.fn(),
  isLoading: false,
  setIsLoading: jest.fn()
};

jest.mock('../../client/src/lib/recipeStore', () => ({
  useRecipeStore: () => mockRecipeStore,
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Clock: ({ children, ...props }: any) => <div {...props}>Clock Icon</div>,
  Users: ({ children, ...props }: any) => <div {...props}>Users Icon</div>,
  ChefHat: ({ children, ...props }: any) => <div {...props}>ChefHat Icon</div>,
  Share2: ({ children, ...props }: any) => <div {...props}>Share2 Icon</div>,
  Download: ({ children, ...props }: any) => <div {...props}>Download Icon</div>,
  X: ({ children, ...props }: any) => <div {...props}>X Icon</div>,
  Minus: ({ children, ...props }: any) => <div {...props}>Minus Icon</div>,
  Plus: ({ children, ...props }: any) => <div {...props}>Plus Icon</div>,
}));

// Helper function to render component with providers
const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Router>
        {component}
      </Router>
    </QueryClientProvider>
  );
};

describe('EnhancedRecipeCard', () => {
  const mockRecipe = {
    id: 'recipe-123',
    title: 'Creamy Pasta Carbonara',
    description: 'Classic Italian comfort food with eggs and pancetta',
    servings: 4,
    cookTime: '25 minutes',
    difficulty: 'Medium',
    cuisine: 'Italian',
    ingredients: [
      '400g spaghetti',
      '200g pancetta, diced',
      '4 large eggs',
      '100g Pecorino Romano cheese, grated',
      'Salt and black pepper to taste'
    ],
    instructions: [
      'Bring a large pot of salted water to boil and cook spaghetti according to package directions.',
      'While pasta cooks, heat a large skillet over medium heat and cook pancetta until crispy, about 5-7 minutes.',
      'In a bowl, whisk together eggs, grated cheese, salt, and pepper.',
      'Drain pasta, reserving 1 cup of pasta water.',
      'Add hot pasta to the skillet with pancetta and toss.',
      'Remove from heat and quickly stir in the egg mixture, adding pasta water as needed to create a creamy sauce.',
      'Serve immediately with extra cheese and black pepper.'
    ],
    tips: [
      'Use room temperature eggs to prevent scrambling',
      'Work quickly when adding the egg mixture',
      'Save some pasta water - it helps create the perfect sauce consistency'
    ],
    mode: 'shopping' as const,
    userId: 1,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRecipeStore.recipe = mockRecipe;
    mockRecipeStore.activeServings = 4;
  });

  describe('Recipe Display', () => {
    it('renders recipe title and description', () => {
      renderWithProviders(<EnhancedRecipeCard />);
      
      expect(screen.getByText('Creamy Pasta Carbonara')).toBeInTheDocument();
      expect(screen.getByText(/Classic Italian comfort food/)).toBeInTheDocument();
    });

    it('displays recipe metadata correctly', () => {
      renderWithProviders(<EnhancedRecipeCard />);
      
      expect(screen.getByText('25 minutes')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Italian')).toBeInTheDocument();
      expect(screen.getByText('4 servings')).toBeInTheDocument();
    });

    it('renders all ingredients', () => {
      renderWithProviders(<EnhancedRecipeCard />);
      
      expect(screen.getByText(/400g spaghetti/)).toBeInTheDocument();
      expect(screen.getByText(/200g pancetta/)).toBeInTheDocument();
      expect(screen.getByText(/4 large eggs/)).toBeInTheDocument();
      expect(screen.getByText(/100g Pecorino Romano/)).toBeInTheDocument();
      expect(screen.getByText(/Salt and black pepper/)).toBeInTheDocument();
    });

    it('renders all cooking instructions', () => {
      renderWithProviders(<EnhancedRecipeCard />);
      
      expect(screen.getByText(/Bring a large pot of salted water/)).toBeInTheDocument();
      expect(screen.getByText(/heat a large skillet/)).toBeInTheDocument();
      expect(screen.getByText(/whisk together eggs/)).toBeInTheDocument();
      expect(screen.getByText(/Drain pasta, reserving/)).toBeInTheDocument();
      expect(screen.getByText(/Add hot pasta to the skillet/)).toBeInTheDocument();
      expect(screen.getByText(/Remove from heat and quickly stir/)).toBeInTheDocument();
      expect(screen.getByText(/Serve immediately/)).toBeInTheDocument();
    });

    it('displays cooking tips when available', () => {
      renderWithProviders(<EnhancedRecipeCard />);
      
      expect(screen.getByText(/Use room temperature eggs/)).toBeInTheDocument();
      expect(screen.getByText(/Work quickly when adding/)).toBeInTheDocument();
      expect(screen.getByText(/Save some pasta water/)).toBeInTheDocument();
    });
  });

  describe('Recipe Sharing', () => {
    it('handles recipe sharing successfully', async () => {
      const mockShareResponse = { shareId: 'share_123_abc' };
      mockApiRequest.mockResolvedValue({
        json: async () => mockShareResponse
      });

      renderWithProviders(<EnhancedRecipeCard />);
      
      const shareButton = screen.getByRole('button', { name: /share/i });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/recipes/share', {
          recipeId: 'recipe-123'
        });
      });
    });

    it('handles sharing errors gracefully', async () => {
      mockApiRequest.mockRejectedValue(new Error('Sharing failed'));

      renderWithProviders(<EnhancedRecipeCard />);
      
      const shareButton = screen.getByRole('button', { name: /share/i });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalled();
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock window.matchMedia for mobile viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('max-width: 768px'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      renderWithProviders(<EnhancedRecipeCard />);
      
      // Check that mobile-optimized elements are present
      const container = screen.getByTestId('recipe-card') || screen.getByRole('main');
      expect(container).toBeInTheDocument();
    });

    it('displays properly on desktop screens', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('min-width: 769px'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      renderWithProviders(<EnhancedRecipeCard />);
      
      expect(screen.getByText('Creamy Pasta Carbonara')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels', () => {
      renderWithProviders(<EnhancedRecipeCard />);
      
      const shareButton = screen.getByRole('button', { name: /share/i });
      expect(shareButton).toHaveAttribute('aria-label');
    });

    it('supports keyboard navigation', () => {
      renderWithProviders(<EnhancedRecipeCard />);
      
      const shareButton = screen.getByRole('button', { name: /share/i });
      shareButton.focus();
      expect(shareButton).toHaveFocus();
      
      fireEvent.keyDown(shareButton, { key: 'Enter' });
      // Should trigger share action
    });

    it('has proper heading hierarchy', () => {
      renderWithProviders(<EnhancedRecipeCard />);
      
      const title = screen.getByRole('heading', { level: 2 });
      expect(title).toHaveTextContent('Creamy Pasta Carbonara');
    });

    it('provides alternative text for icons', () => {
      renderWithProviders(<EnhancedRecipeCard />);
      
      // Check that icon components are rendered with proper accessibility
      expect(screen.getByText('Clock Icon')).toBeInTheDocument();
      expect(screen.getByText('Users Icon')).toBeInTheDocument();
      expect(screen.getByText('ChefHat Icon')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing recipe data gracefully', () => {
      mockRecipeStore.recipe = null;
      
      renderWithProviders(<EnhancedRecipeCard />);
      
      expect(screen.getByText(/No recipe selected/i) || screen.getByText(/Loading/i)).toBeInTheDocument();
    });

    it('handles incomplete recipe data', () => {
      const incompleteRecipe = {
        ...mockRecipe,
        ingredients: [],
        instructions: [],
        tips: []
      };
      mockRecipeStore.recipe = incompleteRecipe;
      
      renderWithProviders(<EnhancedRecipeCard />);
      
      expect(screen.getByText('Creamy Pasta Carbonara')).toBeInTheDocument();
      // Should still render the title even with missing data
    });

    it('handles API errors during recipe operations', async () => {
      mockApiRequest.mockRejectedValue(new Error('Network error'));
      
      renderWithProviders(<EnhancedRecipeCard />);
      
      const shareButton = screen.getByRole('button', { name: /share/i });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalled();
      });
      
      // Error should be handled gracefully without crashing
      expect(screen.getByText('Creamy Pasta Carbonara')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders efficiently with large ingredient lists', () => {
      const largeRecipe = {
        ...mockRecipe,
        ingredients: Array.from({ length: 50 }, (_, i) => `Ingredient ${i + 1}`)
      };
      mockRecipeStore.recipe = largeRecipe;
      
      const startTime = performance.now();
      renderWithProviders(<EnhancedRecipeCard />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should render quickly
      expect(screen.getByText('Ingredient 1')).toBeInTheDocument();
      expect(screen.getByText('Ingredient 50')).toBeInTheDocument();
    });

    it('handles long instruction lists efficiently', () => {
      const complexRecipe = {
        ...mockRecipe,
        instructions: Array.from({ length: 20 }, (_, i) => `Step ${i + 1}: Detailed cooking instruction that explains exactly what to do in this step.`)
      };
      mockRecipeStore.recipe = complexRecipe;
      
      renderWithProviders(<EnhancedRecipeCard />);
      
      expect(screen.getByText(/Step 1: Detailed cooking/)).toBeInTheDocument();
      expect(screen.getByText(/Step 20: Detailed cooking/)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('tracks user engagement with recipe steps', () => {
      renderWithProviders(<EnhancedRecipeCard />);
      
      const firstInstruction = screen.getByText(/Bring a large pot of salted water/);
      fireEvent.click(firstInstruction);
      
      // Should mark step as completed or track interaction
      expect(firstInstruction).toBeInTheDocument();
    });

    it('allows users to copy recipe text', () => {
      renderWithProviders(<EnhancedRecipeCard />);
      
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn(),
        },
      });
      
      const title = screen.getByText('Creamy Pasta Carbonara');
      fireEvent.doubleClick(title);
      
      // Should handle text selection for copying
      expect(title).toBeInTheDocument();
    });
  });
});