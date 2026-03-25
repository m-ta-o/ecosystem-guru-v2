'use client';


import React from 'react';
import { Flow, Entity, FlowType } from '@/lib/types/canvas';
import { DollarSign, ShoppingBag, Users, Database, ArrowUpRight, FileText, Zap, Layers, Leaf } from 'lucide-react';
import { getDynamicFlowColor } from '@/lib/utils/flowColors';

const flowIconMap: Record<FlowType, React.ReactNode> = {
  money: <DollarSign className="w-4 h-4" />,
  product: <ShoppingBag className="w-4 h-4" />,
  service: <Users className="w-4 h-4" />,
  data: <Database className="w-4 h-4" />,
  value: <ArrowUpRight className="w-4 h-4" />,
  knowledge: <FileText className="w-4 h-4" />,
  influence: <Zap className="w-4 h-4" />,
  resource: <Layers className="w-4 h-4" />,
  impact: <Leaf className="w-4 h-4" />
};

interface FlowCardProps {
  flow: Flow;
  entities: Entity[];
  relatedEntity: Entity | undefined;
  direction: "incoming" | "outgoing";
  relationshipText: "to" | "from";
}

const FlowCard: React.FC<FlowCardProps> = ({
  flow,
  entities,
  relatedEntity,
  relationshipText
}) => {
  const flowColorHex = getDynamicFlowColor(flow, entities);

  let bgColor, borderColor, iconColor, valueColor, valueBgColor;

  // Map hex colors from flow routing to Tailwind CSS classes
  if (flowColorHex === '#fca5a5') { // Red theme
    bgColor = "bg-red-50";
    borderColor = "border-red-100";
    iconColor = "text-red-600";
    valueColor = "text-red-700";
    valueBgColor = "border-red-200";
  } else if (flowColorHex === '#93c5fd') { // Blue theme
    bgColor = "bg-blue-50";
    borderColor = "border-blue-100";
    iconColor = "text-blue-600";
    valueColor = "text-blue-700";
    valueBgColor = "border-blue-200";
  } else { // Grey theme
    bgColor = "bg-gray-50";
    borderColor = "border-gray-100";
    iconColor = "text-gray-600";
    valueColor = "text-gray-700";
    valueBgColor = "border-gray-200";
  }

  return (
    <div className={`${bgColor} border ${borderColor} rounded-md p-2 transition-all duration-200 hover:shadow-sm`}>
      <div className="flex items-start gap-2">
        {/* Flow Type Icon */}
        <div className={`w-4 h-4 ${iconColor} flex-shrink-0 mt-0.5`}>
          {flowIconMap[flow.type]}
        </div>

        {/* Flow Information */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-xs text-foreground leading-snug">{flow.label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {relationshipText}{" "}
            <span className="font-medium text-foreground">
              {relatedEntity?.name || "Unknown"}
            </span>
          </div>
        </div>

        {/* Value Display */}
        {(flow.valueDescription || flow.value) && (
          <div className={`text-xs font-mono ${valueColor} bg-background/50 px-1.5 py-0.5 rounded border ${valueBgColor} flex-shrink-0`}>
            {flow.value ? `$${flow.value.toLocaleString()}` : flow.valueDescription}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlowCard;
