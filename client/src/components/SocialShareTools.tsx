import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Twitter, Instagram, Facebook, MessageCircle, Printer, FileText, ExternalLink, Copy } from "lucide-react";

interface SocialShareToolsProps {
  id: string;
  shareId?: string;
  recipe?: {
    title: string;
    description?: string;
    image?: string;
  };
  className?: string;
}

export default function SocialShareTools({ 
  id, 
  shareId = '', 
  recipe,
  className = '' 
}: SocialShareToolsProps) {
  const { toast } = useToast();

  const handleSocialClick = async (platform: string) => {
    const shareUrl = `${window.location.origin}/shared/${shareId || id}`;
    const text = recipe ? `Check out this amazing recipe: ${recipe.title}` : 'Check out this recipe from Flavr!';
    
    let url = '';
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'instagram':
        toast({
          title: "Instagram Sharing",
          description: "Please copy the link and share manually on Instagram",
        });
        navigator.clipboard?.writeText(shareUrl);
        return;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`;
        break;
    }
    
    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
    }
  };

  const handleAction = async (action: string) => {
    const shareUrl = `${window.location.origin}/shared/${shareId || id}`;
    
    switch (action) {
      case 'copy':
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast({
            title: "Copied!",
            description: "Recipe link copied to clipboard",
          });
        } catch (err) {
          toast({
            title: "Copy Failed",
            description: "Please copy the link manually",
            variant: "destructive",
          });
        }
        break;
      case 'print':
        window.print();
        break;
      case 'pdf':
        toast({
          title: "PDF Export",
          description: "Use your browser's print to PDF feature",
        });
        break;
      case 'link':
        window.open(shareUrl, '_blank');
        break;
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Share Recipe</h3>
            <Badge variant="secondary">Social</Badge>
          </div>

          <div className="grid grid-cols-2 gap-2">
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

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('print')}
              className="flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('pdf')}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Save PDF
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('link')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Link
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('copy')}
              className="flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}