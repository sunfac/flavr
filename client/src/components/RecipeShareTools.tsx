import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
  const pdfRef = useRef<HTMLDivElement>(null);
  
  const publicUrl = shareId ? `${window.location.origin}/share/${shareId}` : `${window.location.origin}/recipe/${id}`;
  const caption = `Just made this with Flavr AI:
🔥 "${title}"
${description}

#FlavrRecipe #AIChef #FlavorBombs #MoodFood
${publicUrl}`;

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
    const fullText = `Recipe: ${title}\n\n${description}\n\nCreated with Flavr AI\nLink: ${publicUrl}`;
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

  const handlePrint = () => {
    window.print();
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

    if (platform === 'instagram') {
      await handleCopy();
      toast({
        title: "Caption copied!",
        description: "Instagram doesn't support direct sharing – paste into your post!",
      });
    } else {
      window.open(urlMap[platform], '_blank');
    }
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
      const options = {
        margin: 0.5,
        filename: `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-flavr-recipe.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      html2pdf()
        .set(options)
        .from(pdfRef.current)
        .save()
        .then(() => {
          toast({
            title: "PDF downloaded!",
            description: "Your recipe is ready to print or share",
          });
        })
        .catch(() => {
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
      {/* PDF Content - positioned off screen but visible for PDF generation */}
      <div ref={pdfRef} className="fixed -top-[9999px] left-0 bg-white text-black p-8 font-sans w-[8.5in]">
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

          {/* Social Media Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
              onClick={() => handleSocialClick('instagram')}
              className="flex items-center gap-2 hover:bg-pink-500/10 hover:border-pink-500/50"
            >
              <iconMap.share className="w-4 h-4" />
              Instagram
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-2 hover:bg-slate-500/10 hover:border-slate-500/50"
            >
              <iconMap.share className="w-4 h-4" />
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
              onClick={downloadPDF}
              className="flex items-center gap-2 hover:bg-red-500/10 hover:border-red-500/50"
            >
              <FileDown className="w-4 h-4" />
              PDF
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={downloadQRCode}
              className="flex items-center gap-2 hover:bg-purple-500/10 hover:border-purple-500/50"
            >
              <QrCode className="w-4 h-4" />
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
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecipeShareTools;