'use client';


import React, { useState } from 'react';
import { X, ArrowUpRight, FileBarChart, Loader2 } from 'lucide-react';
import { Entity, Flow } from '@/lib/types/canvas';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import EntityExchangeSection from '@/components/canvas/EntityExchangeSection';
import BusinessModelCanvasDialog from '@/components/canvas/BusinessModelCanvasDialog';

interface ValueExchangePopupProps {
  entities: Entity[];
  flows: Flow[];
  onClose: () => void;
}

const ValueExchangePopup: React.FC<ValueExchangePopupProps> = ({
  entities,
  flows,
  onClose
}) => {
  const [isGeneratingCanvas, setIsGeneratingCanvas] = useState(false);
  const [businessCanvas, setBusinessCanvas] = useState(null);
  const [canvasDialogOpen, setCanvasDialogOpen] = useState(false);

  // Filter entities that have flows
  const entitiesWithFlows = entities.filter(entity => {
    const hasIncoming = flows.some(f => f.targetId === entity.id);
    const hasOutgoing = flows.some(f => f.sourceId === entity.id);
    return hasIncoming || hasOutgoing;
  });

  const generateBusinessCanvas = async () => {
    setIsGeneratingCanvas(true);
    try {
      // Find the main organization or use the first entity as the company context
      const mainCompany = entities.find(e => e.type === 'organization')?.name || 
                          entities[0]?.name || 
                          'Current Business';

      const ecosystemContext = {
        entities: entities.map(e => ({
          name: e.name,
          type: e.type,
          description: e.description
        })),
        flows: flows.map(f => ({
          source: entities.find(e => e.id === f.sourceId)?.name,
          target: entities.find(e => e.id === f.targetId)?.name,
          type: f.type,
          label: f.label,
          valueDescription: f.valueDescription
        }))
      };

      const { data, error } = await supabase.functions.invoke('generate-business-canvas', {
        body: { 
          company: mainCompany,
          ecosystemContext 
        }
      });

      if (error) throw error;

      setBusinessCanvas(data.canvas);
      setCanvasDialogOpen(true);
      toast({
        title: "Business Model Canvas Generated",
        description: "Your canvas has been created based on the current ecosystem."
      });
    } catch (error) {
      console.error('Error generating canvas:', error);
      toast({
        title: "Generation Failed",
        description: "Unable to generate the business model canvas. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingCanvas(false);
    }
  };

  return (
    <div
      className="fixed bottom-6 left-6 z-50 apple-card p-3 w-[340px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-8rem)] overflow-y-auto animate-slide-in-up custom-scrollbar shadow-2xl"
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      role="dialog"
      aria-labelledby="value-exchanges-title"
    >
      {/* Header Section */}
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center">
            <ArrowUpRight className="w-3.5 h-3.5 text-white" />
          </div>
          <h3 id="value-exchanges-title" className="font-semibold text-base text-gray-900">
            Value Exchanges
          </h3>
        </div>
        <Button
          onClick={onClose}
          size="sm"
          variant="ghost"
          className="h-6 w-6 rounded-full hover:bg-gray-100 p-0"
        >
          <X className="h-3.5 w-3.5 text-gray-500" />
        </Button>
      </div>

      {/* Content Section */}
      <div className="space-y-3">
        {entitiesWithFlows.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <p className="text-xs">No value exchanges found.</p>
            <p className="text-xs mt-1 text-gray-400">Create flows between entities</p>
          </div>
        ) : (
          entitiesWithFlows.map((entity) => {
            const incomingFlows = flows.filter(f => f.targetId === entity.id);
            const outgoingFlows = flows.filter(f => f.sourceId === entity.id);

            return (
              <EntityExchangeSection
                key={entity.id}
                entity={entity}
                entities={entities}
                incomingFlows={incomingFlows}
                outgoingFlows={outgoingFlows}
              />
            );
          })
        )}
      </div>

      {/* Summary Footer */}
      {entitiesWithFlows.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-100 space-y-2">
          <div className="text-xs text-gray-400 text-center">
            {flows.length} flow{flows.length !== 1 ? 's' : ''} • {entitiesWithFlows.length} entit{entitiesWithFlows.length !== 1 ? 'ies' : 'y'}
          </div>

          <div className="flex justify-center">
            <Button
              onClick={generateBusinessCanvas}
              disabled={isGeneratingCanvas}
              size="sm"
              className="bg-blue-500 hover:bg-blue-600 text-white text-xs h-8 px-3"
            >
              {isGeneratingCanvas ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileBarChart className="w-3 h-3 mr-1.5" />
                  Generate BMC
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <BusinessModelCanvasDialog
        isOpen={canvasDialogOpen}
        onClose={() => setCanvasDialogOpen(false)}
        canvas={businessCanvas}
      />
    </div>
  );
};

export default ValueExchangePopup;
