import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { animations } from '@/styles/tokens';

interface FooterSectionProps {
  recipeId: string;
  onRate: (recipeId: string, rating: number) => void;
  className?: string;
}

export default function FooterSection({ 
  recipeId, 
  onRate, 
  className = '' 
}: FooterSectionProps) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [notes, setNotes] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Load notes from localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem(`notes-${recipeId}`);
    if (savedNotes) {
      setNotes(savedNotes);
    }
  }, [recipeId]);

  // Auto-save notes on blur
  const handleNotesBlur = () => {
    localStorage.setItem(`notes-${recipeId}`, notes);
  };

  const handleRating = (newRating: number) => {
    setRating(newRating);
    onRate(recipeId, newRating);
  };

  return (
    <div className={`bg-slate-800/30 rounded-b-xl ${className}`}>
      {/* Desktop: Always Visible */}
      <div className="hidden md:block p-6 border-t border-slate-700/50">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rating Section */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3">Rate this recipe</h4>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarButton
                  key={star}
                  star={star}
                  rating={rating}
                  hoveredStar={hoveredStar}
                  onRate={handleRating}
                  onHover={setHoveredStar}
                />
              ))}
              {rating > 0 && (
                <span className="ml-3 text-sm text-slate-400">
                  {rating} star{rating !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Notes Section */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3">Save notes</h4>
            <Textarea
              placeholder="Add your cooking notes, modifications, or tips..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              className="min-h-20 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-orange-400 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Mobile: Collapsible */}
      <div className="md:hidden">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-4 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-none border-t border-slate-700/50"
            >
              <span className="text-sm font-medium">Rate & Save Notes</span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <motion.div
              className="p-4 space-y-6"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Mobile Rating */}
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">Rate this recipe</h4>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarButton
                      key={star}
                      star={star}
                      rating={rating}
                      hoveredStar={hoveredStar}
                      onRate={handleRating}
                      onHover={setHoveredStar}
                      size="lg"
                    />
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-center mt-2 text-sm text-slate-400">
                    {rating} star{rating !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Mobile Notes */}
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">Save notes</h4>
                <Textarea
                  placeholder="Add your cooking notes, modifications, or tips..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  className="min-h-24 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-orange-400 resize-none"
                />
              </div>
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

function StarButton({
  star,
  rating,
  hoveredStar,
  onRate,
  onHover,
  size = 'default'
}: {
  star: number;
  rating: number;
  hoveredStar: number;
  onRate: (rating: number) => void;
  onHover: (star: number) => void;
  size?: 'default' | 'lg';
}) {
  const isActive = star <= (hoveredStar || rating);
  const sizeClass = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';

  return (
    <motion.button
      className={`${sizeClass} transition-colors duration-200 focus:outline-none`}
      onClick={() => onRate(star)}
      onMouseEnter={() => onHover(star)}
      onMouseLeave={() => onHover(0)}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.15 }}
    >
      <Star
        className={`w-full h-full ${
          isActive 
            ? 'fill-orange-400 text-orange-400' 
            : 'text-slate-600 hover:text-slate-500'
        }`}
      />
    </motion.button>
  );
}