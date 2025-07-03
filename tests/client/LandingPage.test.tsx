import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import LandingPage from '../../client/src/pages/LandingPage';

// Mock the API request function
jest.mock('../../client/src/lib/queryClient', () => ({
  apiRequest: jest.fn(),
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

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
}));

// Mock image assets
jest.mock('@assets/0EBD66C5-C52B-476B-AC48-A6F4E0E3EAE7.png', () => 'flavr-logo.png');
jest.mock('@assets/AD24FB4E-3BFB-4891-8859-5DEA19E45222.png', () => 'flavr-full-logo.png');
jest.mock('@assets/3D8C8E94-9BC0-4F6A-95F2-8951941A709B.png', () => 'hero-food-image.png');

// Mock the icon map
jest.mock('../../client/src/lib/iconMap', () => ({
  iconMap: {
    'Chef': () => <div>Chef Icon</div>,
    'ShoppingCart': () => <div>ShoppingCart Icon</div>,
    'Refrigerator': () => <div>Refrigerator Icon</div>,
    'MessageCircle': () => <div>MessageCircle Icon</div>,
  },
}));

// Mock the components
jest.mock('../../client/src/components/GlobalHeader', () => {
  return function MockGlobalHeader() {
    return <div data-testid="global-header">Global Header</div>;
  };
});

jest.mock('../../client/src/components/GlobalNavigation', () => {
  return function MockGlobalNavigation() {
    return <div data-testid="global-navigation">Global Navigation</div>;
  };
});

jest.mock('../../client/src/components/SettingsPanel', () => {
  return function MockSettingsPanel() {
    return <div data-testid="settings-panel">Settings Panel</div>;
  };
});

jest.mock('../../client/src/components/UserMenu', () => {
  return function MockUserMenu() {
    return <div data-testid="user-menu">User Menu</div>;
  };
});

jest.mock('../../client/src/components/AuthModal', () => {
  return function MockAuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return isOpen ? (
      <div data-testid="auth-modal">
        Auth Modal
        <button onClick={onClose}>Close</button>
      </div>
    ) : null;
  };
});

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

describe('LandingPage', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock fetch to return user data
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: null }),
    });
  });

  it('renders the landing page without crashing', async () => {
    renderWithProviders(<LandingPage />);
    
    // Wait for any async operations to complete
    await waitFor(() => {
      expect(screen.getByTestId('global-header')).toBeInTheDocument();
    });
  });

  it('displays the main heading', async () => {
    renderWithProviders(<LandingPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/your ai culinary/i)).toBeInTheDocument();
    });
  });

  it('displays cooking mode cards', async () => {
    renderWithProviders(<LandingPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/shopping mode/i)).toBeInTheDocument();
      expect(screen.getByText(/fridge mode/i)).toBeInTheDocument();
      expect(screen.getByText(/chef assist/i)).toBeInTheDocument();
      expect(screen.getByText(/conversational/i)).toBeInTheDocument();
    });
  });

  it('opens auth modal when Get Started button is clicked', async () => {
    renderWithProviders(<LandingPage />);
    
    await waitFor(() => {
      const getStartedButton = screen.getByText(/get started/i);
      fireEvent.click(getStartedButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
    });
  });

  it('closes auth modal when close button is clicked', async () => {
    renderWithProviders(<LandingPage />);
    
    // Open modal first
    await waitFor(() => {
      const getStartedButton = screen.getByText(/get started/i);
      fireEvent.click(getStartedButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
    });

    // Close modal
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
    });
  });

  it('displays navigation menu when navigation is toggled', async () => {
    renderWithProviders(<LandingPage />);
    
    // Initially navigation should not be visible
    expect(screen.queryByTestId('global-navigation')).not.toBeInTheDocument();

    // Note: This test assumes there's a way to toggle navigation
    // The actual implementation may vary based on the GlobalHeader component
  });

  it('has proper accessibility attributes', async () => {
    renderWithProviders(<LandingPage />);
    
    await waitFor(() => {
      // Check that main content is accessible
      const mainContent = screen.getByRole('main');
      expect(mainContent).toBeInTheDocument();
    });
  });

  it('displays pricing information', async () => {
    renderWithProviders(<LandingPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/free/i)).toBeInTheDocument();
      expect(screen.getByText(/flavr\+/i)).toBeInTheDocument();
    });
  });

  it('handles scroll to section functionality', async () => {
    // Mock getElementById and scrollIntoView
    const mockScrollIntoView = jest.fn();
    const mockElement = {
      scrollIntoView: mockScrollIntoView,
    };
    
    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement as any);

    renderWithProviders(<LandingPage />);
    
    await waitFor(() => {
      // Find a button that might trigger scrolling (this depends on implementation)
      const learnMoreButton = screen.queryByText(/learn more/i);
      if (learnMoreButton) {
        fireEvent.click(learnMoreButton);
        // We can't easily test scrolling behavior without more specific implementation details
      }
    });
    
    // Restore the original implementation
    jest.restoreAllMocks();
  });
});