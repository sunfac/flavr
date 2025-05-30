import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center">
          <AlertCircle className="w-16 h-16 text-red-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">404</h1>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Page Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="flex gap-4 justify-center">
          <Link href="/">
            <Button>
              Go Home
            </Button>
          </Link>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}