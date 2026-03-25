'use client';

import React from 'react';
import { X, Users, Activity, Package, Heart, UserCheck, Megaphone, Target, DollarSign, TrendingUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface BusinessModelCanvas {
  keyPartners: string;
  keyActivities: string;
  keyResources: string;
  valuePropositions: string;
  customerRelationships: string;
  channels: string;
  customerSegments: string;
  costStructure: string;
  revenueStreams: string;
}

interface BusinessModelCanvasDialogProps {
  isOpen: boolean;
  onClose: () => void;
  canvas: BusinessModelCanvas | null;
}

const BusinessModelCanvasDialog: React.FC<BusinessModelCanvasDialogProps> = ({
  isOpen,
  onClose,
  canvas
}) => {
  if (!canvas) return null;

  const getEmojiForContent = (content: string, sectionType: string) => {
    const cleanContent = content.toLowerCase().trim();
    
    // Content-specific emoji mapping
    const contentEmojiMap: { [key: string]: string } = {
      // Partners
      'amazon': '📦', 'marketplace': '🛒', 'health influencers': '💪', 'influencers': '📸',
      'contract manufacturers': '🏭', 'manufacturers': '⚙️', 'retail partners': '🏪', 
      'ingredient suppliers': '🌿', 'suppliers': '📋',
      
      // Activities
      'product development': '💡', 'development': '🔬', 'quality control': '✅', 
      'marketing': '📢', 'customer acquisition': '🎯', 'supply chain': '🚚', 
      'management': '📊',
      
      // Resources
      'proprietary': '🔐', 'gummy formulation': '🍬', 'brand': '🏷️', 'digital assets': '💻',
      'e-commerce': '🌐', 'infrastructure': '🔧',
      
      // Value Props
      'cognitive enhancement': '🧠', 'enhancement': '⚡', 'convenient': '😋', 
      'tasty format': '🍭', 'transparent': '💎', 'quality ingredients': '🌟',
      
      // Customer Relationships
      'personalized support': '🧑‍💼', 'support': '💬', 'community engagement': '🫂',
      'engagement': '👥', 'loyalty': '🎁', 'referral programs': '🔗',
      
      // Channels
      'direct-to-consumer': '🌐', 'website': '💻', 'amazon marketplace': '📦',
      'partners': '🤝',
      
      // Customer Segments
      'health-conscious': '🧑‍⚕️', 'adults': '👨‍👩‍👧‍👦', 'busy professionals': '👨‍🎓',
      'students': '📚', 'supplement enthusiasts': '💪', 'enthusiasts': '⭐',
      
      // Cost Structure
      'manufacturing costs': '🏭', 'manufacturing': '⚙️', 'ingredient procurement': '🛒',
      'procurement': '📋', 'marketing spend': '💰', 'influencer spend': '📸',
      
      // Revenue Streams
      'direct-to-consumer sales': '💰', 'sales': '💵', 'amazon sales': '📦',
      'retail revenue': '🏪', 'wholesale revenue': '📊'
    };
    
    // Find the best matching emoji
    for (const [keyword, emoji] of Object.entries(contentEmojiMap)) {
      if (cleanContent.includes(keyword)) {
        return emoji;
      }
    }
    
    // Fallback to section-based emojis
    const sectionEmojiMap: { [key: string]: string } = {
      keyPartners: '🤝', keyActivities: '⚡', keyResources: '🛠️',
      valuePropositions: '💎', customerRelationships: '❤️', channels: '📢',
      customerSegments: '🎯', costStructure: '💰', revenueStreams: '📈'
    };
    
    return sectionEmojiMap[sectionType] || '•';
  };

  const formatContent = (content: string, sectionType: string) => {
    const lines = content.split('\n').filter(line => line.trim()).slice(0, 3); // Limit to max 3 items

    return lines.map((line, index) => {
      const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
      
      // Extract just headers and values (dollar amounts, percentages, etc.)
      let simplifiedLine = '';
      if (cleanLine.includes(':')) {
        const [header, content] = cleanLine.split(':', 2);
        // Keep header and extract values like $, %, numbers
        const valueMatch = content.match(/[\$€£¥₹]\d+[\d,]*\.?\d*|^\s*\d+[\d,]*\.?\d*%?/);
        simplifiedLine = valueMatch 
          ? `${header.trim()}: ${valueMatch[0].trim()}`
          : header.trim();
      } else {
        // For lines without colons, keep only if they contain values
        const valueMatch = cleanLine.match(/[\$€£¥₹]\d+[\d,]*\.?\d*|\d+[\d,]*\.?\d*%/);
        simplifiedLine = valueMatch ? cleanLine : cleanLine.split(' ').slice(0, 3).join(' ');
      }

      const formattedLine = simplifiedLine.includes(':') 
        ? simplifiedLine.replace(/^([^:]+):/, '<strong>$1:</strong>')
        : simplifiedLine;

      // Get specific emoji for this content
      const emoji = getEmojiForContent(simplifiedLine, sectionType);

      return (
        <div key={index} className="flex items-start gap-3 mb-2">
          <span className="text-base leading-none mt-0.5 opacity-80">{emoji}</span>
          <span 
            className="text-sm leading-relaxed text-muted-foreground flex-1"
            dangerouslySetInnerHTML={{ __html: formattedLine }}
          />
        </div>
      );
    });
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[85vh] w-full h-auto p-0 bg-background">
        <div className="flex flex-col max-h-[85vh] apple-card">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Activity className="w-4 h-4 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground">
                Business Model Canvas
              </h2>
            </div>
            <Button
              onClick={onClose}
              size="sm"
              variant="ghost"
              className="h-7 w-7 rounded-full bg-muted hover:bg-muted/80 p-0"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>

          {/* Canvas Grid */}
          <div className="flex-1 p-6 overflow-auto custom-scrollbar">
            <div className="w-full max-w-7xl mx-auto">
              {/* BMC Grid Layout */}
              <div 
                className="grid gap-4 w-full h-[600px] rounded-xl overflow-hidden border border-border shadow-lg"
                style={{
                  gridTemplateColumns: '1.5fr 1.5fr 2fr 1.5fr 1.5fr',
                  gridTemplateRows: '1fr 1fr 1fr',
                  gridTemplateAreas: `
                    "keyPartners keyActivities valuePropositions customerRelationships customerSegments"
                    "keyResources keyResources valuePropositions channels customerSegments"
                    "costStructure costStructure costStructure revenueStreams revenueStreams"
                  `
                }}
              >
                {/* Key Partners */}
                <div 
                  className="bg-card/50 hover:bg-card/80 transition-colors border border-border p-6 overflow-y-auto custom-scrollbar rounded-lg"
                  style={{ gridArea: 'keyPartners' }}
                >
                  <h3 className="font-semibold text-base mb-4 text-foreground border-b border-border pb-3">
                    KEY PARTNERS
                  </h3>
                  <div className="space-y-3">
                    {formatContent(canvas.keyPartners, 'keyPartners')}
                  </div>
                </div>

                {/* Key Activities */}
                <div 
                  className="bg-card/50 hover:bg-card/80 transition-colors border border-border p-6 overflow-y-auto custom-scrollbar rounded-lg"
                  style={{ gridArea: 'keyActivities' }}
                >
                  <h3 className="font-semibold text-base mb-4 text-foreground border-b border-border pb-3">
                    KEY ACTIVITIES
                  </h3>
                  <div className="space-y-3">
                    {formatContent(canvas.keyActivities, 'keyActivities')}
                  </div>
                </div>

                {/* Value Propositions - Central & Prominent */}
                <div 
                  className="bg-primary/10 hover:bg-primary/15 transition-colors border-2 border-primary/30 p-8 overflow-y-auto custom-scrollbar rounded-lg shadow-sm"
                  style={{ gridArea: 'valuePropositions' }}
                >
                  <h3 className="font-bold text-lg mb-5 text-foreground text-center border-b-2 border-primary/40 pb-4">
                    VALUE PROPOSITIONS
                  </h3>
                  <div className="space-y-4">
                    {formatContent(canvas.valuePropositions, 'valuePropositions')}
                  </div>
                </div>

                {/* Customer Relationships */}
                <div 
                  className="bg-card/50 hover:bg-card/80 transition-colors border border-border p-6 overflow-y-auto custom-scrollbar rounded-lg"
                  style={{ gridArea: 'customerRelationships' }}
                >
                  <h3 className="font-semibold text-base mb-4 text-foreground border-b border-border pb-3">
                    CUSTOMER RELATIONSHIPS
                  </h3>
                  <div className="space-y-3">
                    {formatContent(canvas.customerRelationships, 'customerRelationships')}
                  </div>
                </div>

                {/* Customer Segments - Right tall column */}
                <div 
                  className="bg-card/50 hover:bg-card/80 transition-colors border border-border p-6 overflow-y-auto custom-scrollbar rounded-lg"
                  style={{ gridArea: 'customerSegments' }}
                >
                  <h3 className="font-semibold text-base mb-4 text-foreground border-b border-border pb-3">
                    CUSTOMER SEGMENTS
                  </h3>
                  <div className="space-y-3">
                    {formatContent(canvas.customerSegments, 'customerSegments')}
                  </div>
                </div>

                {/* Key Resources */}
                <div 
                  className="bg-card/50 hover:bg-card/80 transition-colors border border-border p-6 overflow-y-auto custom-scrollbar rounded-lg"
                  style={{ gridArea: 'keyResources' }}
                >
                  <h3 className="font-semibold text-base mb-4 text-foreground border-b border-border pb-3">
                    KEY RESOURCES
                  </h3>
                  <div className="space-y-3">
                    {formatContent(canvas.keyResources, 'keyResources')}
                  </div>
                </div>

                {/* Channels */}
                <div 
                  className="bg-card/50 hover:bg-card/80 transition-colors border border-border p-6 overflow-y-auto custom-scrollbar rounded-lg"
                  style={{ gridArea: 'channels' }}
                >
                  <h3 className="font-semibold text-base mb-4 text-foreground border-b border-border pb-3">
                    CHANNELS
                  </h3>
                  <div className="space-y-3">
                    {formatContent(canvas.channels, 'channels')}
                  </div>
                </div>

                {/* Cost Structure - Bottom left wide */}
                <div 
                  className="bg-card/50 hover:bg-card/80 transition-colors border border-border p-6 overflow-y-auto custom-scrollbar rounded-lg"
                  style={{ gridArea: 'costStructure' }}
                >
                  <h3 className="font-semibold text-base mb-4 text-foreground border-b border-border pb-3">
                    COST STRUCTURE
                  </h3>
                  <div className="space-y-3">
                    {formatContent(canvas.costStructure, 'costStructure')}
                  </div>
                </div>

                {/* Revenue Streams - Bottom right wide */}
                <div 
                  className="bg-card/50 hover:bg-card/80 transition-colors border border-border p-6 overflow-y-auto custom-scrollbar rounded-lg"
                  style={{ gridArea: 'revenueStreams' }}
                >
                  <h3 className="font-semibold text-base mb-4 text-foreground border-b border-border pb-3">
                    REVENUE STREAMS
                  </h3>
                  <div className="space-y-3">
                    {formatContent(canvas.revenueStreams, 'revenueStreams')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BusinessModelCanvasDialog;