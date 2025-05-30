import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { iconMap } from "@/lib/iconMap";

interface SocialShareToolsProps {
  id: string;
  shareId?: string;
  title: string;
  description: string;
  imageUrl?: string;
  isShared: boolean;
  onShareToggle?: () => void;
}

const SocialShareTools: React.FC<SocialShareToolsProps> = ({
  id,
  shareId,
  title,
  description,
  imageUrl,
  isShared,
  onShareToggle
}) => {
  const { toast } = useToast();
  
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

  return (
    <Card className="bg-card/90 backdrop-blur-xl border border-border/50">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
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
            <Twitter className="w-4 h-4" />
            Twitter
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSocialClick('instagram')}
            className="flex items-center gap-2 hover:bg-pink-500/10 hover:border-pink-500/50"
          >
            <Instagram className="w-4 h-4" />
            Instagram
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSocialClick('facebook')}
            className="flex items-center gap-2 hover:bg-blue-600/10 hover:border-blue-600/50"
          >
            <Facebook className="w-4 h-4" />
            Facebook
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSocialClick('whatsapp')}
            className="flex items-center gap-2 hover:bg-green-500/10 hover:border-green-500/50"
          >
            <MessageCircle className="w-4 h-4" />
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
            <Printer className="w-4 h-4" />
            Print
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyFullRecipe}
            className="flex items-center gap-2 hover:bg-orange-500/10 hover:border-orange-500/50"
          >
            <FileText className="w-4 h-4" />
            Copy Recipe
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigator.clipboard.writeText(publicUrl)}
            className="flex items-center gap-2 hover:bg-purple-500/10 hover:border-purple-500/50"
          >
            <ExternalLink className="w-4 h-4" />
            Copy Link
          </Button>
        </div>

        {/* Share Link Section */}
        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
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
  );
};

export default SocialShareTools;