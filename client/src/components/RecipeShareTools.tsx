import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { iconMap } from "@/lib/iconMap";
import { QRCodeSVG as QRCode } from 'qrcode.react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface RecipeShareToolsProps {
  id: string;
  shareId?: string;
  title: string;
  description: string;
  imageUrl?: string;
  isShared: boolean;
  onShareToggle?: () => void;
  recipe?: any; // Full recipe data for PDF
}

const RecipeShareTools: React.FC<RecipeShareToolsProps> = ({
  id,
  shareId,
  title,
  description,
  imageUrl,
  isShared,
  onShareToggle,
  recipe
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pdfRef = useRef<HTMLDivElement>(null);
  
  // Generate share URL - if no shareId exists, create one by toggling sharing
  const getShareUrl = () => {
    if (shareId) {
      return `https://getflavr.ai/share/${shareId}`;
    }
    return `https://getflavr.ai/recipe/${id}`;
  };
  
  const publicUrl = getShareUrl();
  const caption = `Just made this with Flavr AI:
🔥 "${title}"
${description}

#FlavrRecipe #AIChef #FlavorBombs #MoodFood
${publicUrl}`;

  // Mutation to enable/disable sharing
  const shareToggleMutation = useMutation({
    mutationFn: async ({ recipeId, shouldShare }: { recipeId: string; shouldShare: boolean }) => {
      const response = await apiRequest("POST", `/api/recipe/${recipeId}/share`, { isShared: shouldShare });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes/history"] });
      
      if (data.shareUrl) {
        // Copy the new share URL immediately
        navigator.clipboard.writeText(data.shareUrl).then(() => {
          toast({
            title: "Recipe shared!",
            description: "Share link copied to clipboard - recipe is now public",
          });
        });
      } else {
        toast({
          title: "Sharing disabled",
          description: "Recipe is no longer publicly shared",
        });
      }
      
      if (onShareToggle) onShareToggle();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update sharing settings",
        variant: "destructive",
      });
    },
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      toast({
        title: "Copied!",
        description: "Recipe caption copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleCopyFullRecipe = async () => {
    // Format ingredients
    const ingredientsList = recipe?.ingredients ? 
      recipe.ingredients.map((ing: string, idx: number) => `${idx + 1}. ${ing}`).join('\n') : '';
    
    // Format instructions
    const instructionsList = recipe?.instructions ? 
      recipe.instructions.map((inst: string, idx: number) => `${idx + 1}. ${inst}`).join('\n') : '';
    
    const fullText = `${title}

${description}

Servings: ${recipe?.servings || 4}
Cook Time: ${recipe?.cookTime || '30 min'}
Difficulty: ${recipe?.difficulty || 'Medium'}
${recipe?.cuisine ? `Cuisine: ${recipe.cuisine}` : ''}

INGREDIENTS:
${ingredientsList}

INSTRUCTIONS:
${instructionsList}

${recipe?.tips ? `\nTIPS:\n${recipe.tips}\n` : ''}
Created with Flavr AI
Link: ${publicUrl}`;
    
    try {
      await navigator.clipboard.writeText(fullText);
      toast({
        title: "Recipe copied!",
        description: "Perfect for pasting into Apple Notes or anywhere",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy recipe",
        variant: "destructive",
      });
    }
  };

  const handleCopyIngredients = async () => {
    const ingredients = recipe?.ingredients || [];
    
    const ingredientsText = `${title} - Shopping List

📝 Ingredients:
${ingredients.map((ing: any) => `• ${ing}`).join('\n')}

Servings: ${recipe?.servings || 4}`;
    
    try {
      await navigator.clipboard.writeText(ingredientsText);
      toast({
        title: "Shopping list copied!",
        description: "Ready to paste into your notes app",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy shopping list",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    // Create a new window with the recipe content for printing
    const printWindow = window.open('', '_blank');
    if (printWindow && pdfRef.current) {
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Print Recipe - ${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; margin-bottom: 10px; }
            .description { color: #666; font-size: 18px; margin-bottom: 20px; }
            .meta { display: flex; gap: 20px; margin-bottom: 20px; }
            .meta-item { background: #f5f5f5; padding: 8px 12px; border-radius: 6px; }
            .ingredients { margin-bottom: 30px; }
            .instructions { margin-bottom: 30px; }
            .ingredients h2, .instructions h2 { color: #333; border-bottom: 2px solid #ff6b35; padding-bottom: 5px; }
            .ingredients ul { list-style: none; padding: 0; }
            .ingredients li { padding: 8px 0; border-bottom: 1px solid #eee; }
            .instructions ol { padding-left: 20px; }
            .instructions li { margin-bottom: 15px; line-height: 1.6; }
            .tips { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px; }
            img { max-width: 100%; height: auto; margin: 20px 0; border-radius: 8px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${pdfRef.current.innerHTML}
        </body>
        </html>
      `;
      
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
      
      toast({
        title: "Recipe sent to printer",
        description: "Print dialog should be open",
      });
    }
  };

  const handleShare = async () => {
    // If recipe isn't shared yet, enable sharing first
    if (!isShared || !shareId) {
      shareToggleMutation.mutate({ recipeId: id, shouldShare: true });
      return;
    }
    
    // If already shared, just copy the link
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast({
        title: "Share link copied!",
        description: "Perfect for social media or messaging",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy share link",
        variant: "destructive",
      });
    }
  };

  const handleToggleSharing = () => {
    shareToggleMutation.mutate({ 
      recipeId: id, 
      shouldShare: !isShared 
    });
  };

  const ensureShared = async () => {
    if (!isShared && onShareToggle) {
      await onShareToggle();
      toast({
        title: "Recipe is now public!",
        description: "Your recipe can now be shared with others",
      });
    }
  };

  const handleSocialClick = async (platform: string) => {
    await ensureShared();
    const encoded = encodeURIComponent(caption);
    const urlMap: { [key: string]: string } = {
      twitter: `https://twitter.com/intent/tweet?text=${encoded}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${publicUrl}`,
      whatsapp: `https://api.whatsapp.com/send?text=${encoded}`
    };

    window.open(urlMap[platform], '_blank');
  };

  const downloadQRCode = () => {
    const svg = document.querySelector('#recipe-qr svg') as SVGElement;
    if (svg) {
      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      canvas.width = 120;
      canvas.height = 120;
      
      img.onload = () => {
        ctx?.drawImage(img, 0, 0);
        const link = document.createElement('a');
        link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-flavr-qr.png`;
        link.href = canvas.toDataURL();
        link.click();
        toast({
          title: "QR code downloaded!",
          description: "Share the QR code to let others scan and view your recipe",
        });
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(source);
    }
  };

  const downloadPDF = () => {
    if (pdfRef.current) {
      // Temporarily make the element visible for PDF generation
      const element = pdfRef.current;
      const originalPosition = element.style.position;
      const originalTop = element.style.top;
      const originalLeft = element.style.left;
      const originalZIndex = element.style.zIndex;
      
      // Position element in visible area temporarily
      element.style.position = 'absolute';
      element.style.top = '0px';
      element.style.left = '0px';
      element.style.zIndex = '10000';
      
      const options = {
        margin: 0.5,
        filename: `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-flavr-recipe.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      html2pdf()
        .set(options)
        .from(element)
        .save()
        .then(() => {
          // Restore original positioning
          element.style.position = originalPosition;
          element.style.top = originalTop;
          element.style.left = originalLeft;
          element.style.zIndex = originalZIndex;
          
          toast({
            title: "PDF downloaded!",
            description: "Your recipe is ready to print or share",
          });
        })
        .catch((error: any) => {
          // Restore original positioning on error
          element.style.position = originalPosition;
          element.style.top = originalTop;
          element.style.left = originalLeft;
          element.style.zIndex = originalZIndex;
          
          console.error('PDF generation error:', error);
          toast({
            title: "Download failed",
            description: "Could not generate PDF",
            variant: "destructive",
          });
        });
    }
  };

  return (
    <div className="space-y-6">
      {/* PDF Content - hidden but properly structured for generation */}
      <div ref={pdfRef} className="opacity-0 pointer-events-none absolute -z-10 bg-white text-black p-8 font-sans w-[8.5in]">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-gray-600 text-lg">{description}</p>
          <div className="mt-4 text-sm text-gray-500">
            Created with Flavr AI • {publicUrl}
          </div>
        </div>
        
        {imageUrl && (
          <div className="mb-6 text-center">
            <img 
              src={imageUrl} 
              alt={title} 
              className="max-w-full h-auto rounded-lg mx-auto"
              style={{ maxHeight: '400px' }}
            />
          </div>
        )}

        {recipe && (
          <div className="mb-8">
            {/* Recipe Meta Info */}
            {(recipe.cookTime || recipe.servings || recipe.difficulty) && (
              <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                {recipe.cookTime && (
                  <div>
                    <p className="text-sm text-gray-500">Cook Time</p>
                    <p className="font-semibold">{recipe.cookTime} min</p>
                  </div>
                )}
                {recipe.servings && (
                  <div>
                    <p className="text-sm text-gray-500">Servings</p>
                    <p className="font-semibold">{recipe.servings}</p>
                  </div>
                )}
                {recipe.difficulty && (
                  <div>
                    <p className="text-sm text-gray-500">Difficulty</p>
                    <p className="font-semibold">{recipe.difficulty}</p>
                  </div>
                )}
              </div>
            )}

            {/* Ingredients */}
            {recipe.ingredients && recipe.ingredients.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-3">Ingredients</h2>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span className="text-gray-700">{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Instructions */}
            {recipe.instructions && recipe.instructions.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-3">Instructions</h2>
                <ol className="space-y-3">
                  {recipe.instructions.map((instruction: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="w-6 h-6 bg-orange-500 text-white rounded-full text-sm font-bold flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-gray-700 leading-relaxed">{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Tips */}
            {recipe.tips && (
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-3">Chef's Tips</h2>
                <p className="text-gray-700 italic bg-gray-50 p-4 rounded-lg">{recipe.tips}</p>
              </div>
            )}
          </div>
        )}
        
        <div className="text-center mt-8">
          <div id="pdf-qr">
            <QRCode value={publicUrl} size={100} />
          </div>
          <p className="text-xs text-gray-500 mt-2">Scan to view online</p>
        </div>
      </div>

      {/* Share Tools Card */}
      <Card className="bg-card/90 backdrop-blur-xl border border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <iconMap.share className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-semibold text-foreground">Share Recipe</h3>
            {isShared && (
              <Badge variant="secondary" className="bg-orange-500/20 text-orange-300">
                Public
              </Badge>
            )}
          </div>

          {/* Social Media Buttons - Only platforms that support URL sharing */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSocialClick('twitter')}
              className="flex items-center gap-2 hover:bg-blue-500/10 hover:border-blue-500/50"
            >
              <iconMap.share className="w-4 h-4" />
              Twitter
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSocialClick('facebook')}
              className="flex items-center gap-2 hover:bg-blue-600/10 hover:border-blue-600/50"
            >
              <iconMap.share className="w-4 h-4" />
              Facebook
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSocialClick('whatsapp')}
              className="flex items-center gap-2 hover:bg-green-500/10 hover:border-green-500/50"
            >
              <iconMap.messageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
          </div>

          {/* Utility Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-2 hover:bg-slate-500/10 hover:border-slate-500/50"
            >
              <iconMap.copy className="w-4 h-4" />
              Print
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyFullRecipe}
              className="flex items-center gap-2 hover:bg-orange-500/10 hover:border-orange-500/50"
            >
              <iconMap.share className="w-4 h-4" />
              Copy Recipe
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyIngredients}
              className="flex items-center gap-2 hover:bg-green-500/10 hover:border-green-500/50"
            >
              <iconMap.shoppingBag className="w-4 h-4" />
              Copy List
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={downloadPDF}
              className="flex items-center gap-2 hover:bg-red-500/10 hover:border-red-500/50"
            >
              <iconMap.download className="w-4 h-4" />
              PDF
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={downloadQRCode}
              className="flex items-center gap-2 hover:bg-purple-500/10 hover:border-purple-500/50"
            >
              <iconMap.share className="w-4 h-4" />
              QR Code
            </Button>
          </div>

          {/* QR Code Display */}
          <div className="text-center">
            <div id="recipe-qr" className="inline-block p-4 bg-white rounded-lg">
              <QRCode value={publicUrl} size={120} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Scan to share this recipe instantly
            </p>
          </div>

          {/* Copy Link Section */}
          <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-orange-300 mb-1">Share Link</p>
                <p className="text-xs text-orange-200 truncate">{publicUrl}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigator.clipboard.writeText(publicUrl)}
                className="ml-3 hover:bg-orange-500/20"
              >
                <iconMap.copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecipeShareTools;