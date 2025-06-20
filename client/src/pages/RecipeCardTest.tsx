import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import EnhancedRecipeCard from '@/components/recipe/EnhancedRecipeCard';

// Sample recipe data for testing
const sampleRecipe = {
  id: 'test-recipe-1',
  title: 'Creamy Garlic Parmesan Pasta',
  description: 'A rich and creamy pasta dish perfect for dinner',
  cookTime: 25,
  servings: 4,
  difficulty: 'Easy',
  cuisine: 'Italian',
  image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=800&h=600&fit=crop',
  ingredients: [
    '1 lb fettuccine pasta',
    '1/2 cup butter',
    '4 cloves garlic, minced',
    '1 cup heavy cream',
    '1 1/2 cups grated Parmesan cheese',
    '1/4 cup fresh parsley, chopped',
    'Salt and pepper to taste',
    '2 tbsp olive oil'
  ],
  instructions: [
    'Bring a large pot of salted water to boil. Cook pasta according to package directions until al dente.',
    'In a large skillet, melt butter over medium heat. Add minced garlic and cook for 2 minutes until fragrant.',
    'Pour in heavy cream and bring to a gentle simmer. Cook for 3-4 minutes until slightly thickened.',
    'Remove from heat and gradually whisk in Parmesan cheese until smooth and creamy.',
    'Drain pasta and add to the cream sauce. Toss until well coated.',
    'Season with salt and pepper. Garnish with fresh parsley and serve immediately.'
  ],
  tips: 'For best results, use freshly grated Parmesan cheese and serve immediately while hot. You can add grilled chicken or shrimp for extra protein.'
};

export default function RecipeCardTest() {
  const { toast } = useToast();

  const handleBack = () => {
    toast({
      title: "Navigation",
      description: "Back button clicked - would navigate to previous page",
    });
  };

  const handleShare = () => {
    toast({
      title: "Share Recipe",
      description: "Share functionality would be implemented here",
    });
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Test Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
          <Button
            onClick={handleBack}
            variant="outline"
            size="sm"
            className="bg-slate-800 border-slate-600 text-slate-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to App
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Enhanced RecipeCard Test</h1>
            <p className="text-slate-400 text-sm">Testing the new structured recipe card components</p>
          </div>
        </div>
      </div>

      {/* Enhanced RecipeCard */}
      <motion.div
        className="p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <EnhancedRecipeCard
          recipe={sampleRecipe}
          onBack={handleBack}
          onShare={handleShare}
        />
      </motion.div>

      {/* Test Notes */}
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Test Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
            <div>
              <h4 className="font-medium text-orange-400 mb-2">Desktop Features:</h4>
              <ul className="space-y-1">
                <li>• Sidebar ingredient panel with checkboxes</li>
                <li>• Inline serving adjustment slider</li>
                <li>• Fixed progress bar at top</li>
                <li>• Side-by-side layout with CSS Grid</li>
                <li>• Timer functionality in step cards</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-orange-400 mb-2">Mobile Features:</h4>
              <ul className="space-y-1">
                <li>• Horizontal scrolling ingredient chips</li>
                <li>• Collapsible serving adjustment sheet</li>
                <li>• Dot progress indicator</li>
                <li>• Stacked layout with scroll snap</li>
                <li>• Cook mode modal with large timer</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}