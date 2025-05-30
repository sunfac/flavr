import React, { useState } from 'react';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Home, ChefHat, Bookmark, Star, Settings, Database, Menu, X, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function GlobalNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { user } = useAuth();

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const navigationItems = [
    { id: 'home', label: 'Home', href: '/', icon: Home },
    { id: 'modes', label: 'Recipe Modes', href: '/modes', icon: ChefHat },
    { id: 'my-recipes', label: 'My Recipes', href: '/my-recipes', icon: Bookmark },
    { id: 'flavr-plus', label: 'Flavr+', href: '/flavr-plus', icon: Star },
    { id: 'settings', label: 'Settings', href: '/settings', icon: Settings },
    { id: 'developer', label: 'Developer', href: '/developer', icon: Database },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <Link href="/">
            <div className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              Flavr
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </Button>

          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Welcome, {user.firstName || 'User'}
              </span>
              <Link href="/api/logout">
                <Button variant="outline" size="sm">
                  Logout
                </Button>
              </Link>
            </div>
          ) : (
            <Link href="/api/login">
              <Button size="sm">
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
          >
            <div className="p-4 space-y-2">
              {navigationItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link key={item.id} href={item.href}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                      onClick={() => setIsOpen(false)}
                    >
                      <IconComponent className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}