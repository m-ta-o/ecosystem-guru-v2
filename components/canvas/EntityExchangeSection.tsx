'use client';

import React from 'react';
import { Entity, Flow, EntityType } from '@/lib/types/canvas';
import { Building, Users, Handshake, Truck, Cpu, Landmark, Globe, Heart, Briefcase, Megaphone } from 'lucide-react';
import FlowCard from '@/components/canvas/FlowCard';

const entityIconMap: Record<EntityType, React.ReactNode> = {
  organization: <Building className="w-4 h-4" />,
  customer: <Users className="w-4 h-4" />,
  partner: <Handshake className="w-4 h-4" />,
  supplier: <Truck className="w-4 h-4" />,
  technology: <Cpu className="w-4 h-4" />,
  government: <Landmark className="w-4 h-4" />,
  community: <Globe className="w-4 h-4" />,
  ngo: <Heart className="w-4 h-4" />,
  investor: <Briefcase className="w-4 h-4" />,
  media: <Megaphone className="w-4 h-4" />
};

interface EntityExchangeSectionProps {
  entity: Entity;
  entities: Entity[];
  incomingFlows: Flow[];
  outgoingFlows: Flow[];
}

const EntityExchangeSection: React.FC<EntityExchangeSectionProps> = ({
  entity,
  entities,
  incomingFlows,
  outgoingFlows
}) => {
  // Don't render if no flows
  if (incomingFlows.length === 0 && outgoingFlows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Entity Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground"
          style={{ backgroundColor: `${entity.color}20` }}
        >
          {entityIconMap[entity.type]}
        </div>
        <h4 className="font-semibold text-sm text-foreground">{entity.name}</h4>
      </div>

      {/* What Entity Gives (Outgoing Flows) */}
      {outgoingFlows.length > 0 && (
        <div className="space-y-1.5">
          <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
            GIVES
          </h5>
          <div className="space-y-1.5">
            {outgoingFlows.map((flow) => {
              const targetEntity = entities.find(e => e.id === flow.targetId);
              return (
                <FlowCard
                  key={flow.id}
                  flow={flow}
                  entities={entities}
                  relatedEntity={targetEntity}
                  direction="outgoing"
                  relationshipText="to"
                />
              );
            })}
          </div>
        </div>
      )}

      {/* What Entity Gets (Incoming Flows) */}
      {incomingFlows.length > 0 && (
        <div className="space-y-1.5">
          <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
            GETS
          </h5>
          <div className="space-y-1.5">
            {incomingFlows.map((flow) => {
              const sourceEntity = entities.find(e => e.id === flow.sourceId);
              return (
                <FlowCard
                  key={flow.id}
                  flow={flow}
                  entities={entities}
                  relatedEntity={sourceEntity}
                  direction="incoming"
                  relationshipText="from"
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default EntityExchangeSection;
