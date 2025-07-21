
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  ChefHat, 
  Bookmark, 
  Star, 
  Settings, 
  X,
  Moon,
  Sun,
  Heart,
  Database
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/providers/ThemeProvider";

interface GlobalNavigationProps {
  isOpen?: boolean;
  onClose?: () => void;
  onAuthRequired?: () => void;
}

export default function GlobalNavigation({ isOpen, onClose, onAuthRequired }: GlobalNavigationProps) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  // User query
  const { data: user } = useQuery({
    queryKey: ['/api/me'],
    retry: false,
  });

  const handleNavigation = (href: string, requiresAuth: boolean = false) => {
    if (requiresAuth && !user?.id) {
      onClose?.();
      alert("Please sign in to access this feature");
      return;
    }
    onClose?.();
  };

  const navigationItems = [
    {
      icon: Home,
      label: "Home", 
      href: user?.id ? "/app" : "/",
      requiresAuth: false
    },
    {
      icon: ChefHat,
      label: "Cooking Modes",
      href: "/app",
      requiresAuth: false
    },
    {
      icon: Bookmark,
      label: "My Cookbook",
      href: "/cookbook",
      requiresAuth: true
    },
    {
      icon: Star,
      label: "Flavr+",
      href: "/flavr-plus",
      requiresAuth: false
    },
    {
      icon: Settings,
      label: "Settings",
      href: "/settings",
      requiresAuth: true
    },
    {
      icon: Database,
      label: "Developer Logs",
      href: "/developer-logs",
      requiresAuth: true,
      adminOnly: true,
      developerOnly: true
    }
  ];

  // Don't render if isOpen is explicitly false
  if (isOpen === false) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[10000]"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white dark:bg-gray-900 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 py-6">
            <div className="space-y-1 px-4">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                
                // Hide developer logs if not developer email
                if (item.developerOnly && user?.user?.email !== "william@blycontracting.co.uk") {
                  return null;
                }
                
                if (item.requiresAuth && !user?.user?.id) {
                  return (
                    <motion.div
                      key={`auth-${item.href}`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="flex items-center space-x-4 p-4 rounded-xl transition-all duration-200 min-h-[44px] group hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer"
                      onClick={() => handleNavigation(item.href, item.requiresAuth)}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium text-sm sm:text-base">
                        {item.label}
                      </span>
                    </motion.div>
                  );
                }
                
                return (
                  <Link key={`nav-${item.href}`} href={item.href}>
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-200 min-h-[44px] group ${
                        isActive 
                          ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                      onClick={onClose}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium text-sm sm:text-base">
                        {item.label}
                      </span>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800">
            {/* Theme Toggle */}
            <div className="flex justify-end mb-4">
              <button
                onClick={toggleTheme}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
              </button>
            </div>
            
            {/* Footer Text */}
            <div className="text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center space-x-1">
                <span>Made with</span>
                <Heart className="w-3 h-3 text-red-400 fill-current" />
                <span>for home cooks</span>
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}