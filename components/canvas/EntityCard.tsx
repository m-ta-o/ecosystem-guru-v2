'use client';

import React, { useRef, useLayoutEffect, useState } from 'react';
import { Entity, ENTITY_TYPES } from '@/lib/types/canvas';
import { Sparkles, TrendingUp } from 'lucide-react';

interface EntityCardProps {
  entity: Entity;
  isSelected: boolean;
  isDragged: boolean;
  onMouseDown: (e: React.MouseEvent, entityId: string) => void;
  onUpdateEntity: (id: string, updates: Partial<Entity>) => void;
  onAIAction?: (entityId: string, action: 'expand' | 'analyze') => void;
  children: React.ReactNode; // For connection points
}

const EntityCard: React.FC<EntityCardProps> = ({
  entity,
  isSelected,
  isDragged,
  onMouseDown,
  onUpdateEntity,
  onAIAction,
  children
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showAIMenu, setShowAIMenu] = useState(false);

  useLayoutEffect(() => {
    if (cardRef.current) {
      const requiredHeight = cardRef.current.scrollHeight;

      // Update height only if it has changed significantly to avoid loops
      if (Math.abs(requiredHeight - entity.height) > 1) {
        onUpdateEntity(entity.id, { height: requiredHeight });
      }
    }
  }, [entity.components, entity.description, entity.name, entity.width, onUpdateEntity, entity.id, entity.height]);

  const isOrganization = entity.type === 'organization';

  return (
    <div style={{ position: 'relative' }} className="group">
      <div
        ref={cardRef}
        className={`entity no-select ${isSelected ? 'selected' : ''} ${isDragged ? 'dragging' : ''} ${isOrganization ? 'main-organization' : ''}`}
        style={{
          left: entity.x,
          top: entity.y,
          width: entity.width,
          minHeight: entity.height,
          zIndex: isDragged ? 1000 : 10,
          position: 'absolute',
          cursor: 'pointer',
          transition: isDragged
            ? 'box-shadow 0.2s ease, border-color 0.2s ease'
            : 'left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, border-color 0.2s ease',
          backgroundColor: 'white',
          borderRadius: '20px',
          userSelect: 'none'
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onMouseDown(e, entity.id);
        }}
        onMouseEnter={() => setShowAIMenu(true)}
        onMouseLeave={() => setShowAIMenu(false)}
      >
        {/* AI Quick Actions - appears on hover */}
        {showAIMenu && onAIAction && (
          <div className="absolute top-2 right-2 flex gap-1 z-20">
            <button
              className="p-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-md shadow-lg transition-all duration-200 hover:scale-110"
              onClick={(e) => {
                e.stopPropagation();
                onAIAction(entity.id, 'expand');
              }}
              title="AI: Suggest connections"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md shadow-lg transition-all duration-200 hover:scale-110"
              onClick={(e) => {
                e.stopPropagation();
                onAIAction(entity.id, 'analyze');
              }}
              title="AI: Analyze entity"
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="w-full" style={{ padding: '16px 16px 24px 16px', boxSizing: 'border-box' }}>
          <div className="flex items-start gap-2 mb-2">
            <span className="text-lg flex-shrink-0 mt-0.5">
              {ENTITY_TYPES[entity.type]?.icon || '❓'}
            </span>
            <h3 className="font-semibold text-sm text-gray-800 leading-tight flex-1 min-w-0 break-words">
              {entity.name}
            </h3>
          </div>
          <p className="text-xs text-gray-600 mb-2 break-words leading-relaxed whitespace-pre-wrap">
            {entity.description}
          </p>
          {entity.components && entity.components.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {entity.components.map((comp, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap"
                  title={comp} // Show full text on hover if truncated
                >
                  {comp.length > 12 ? comp.substring(0, 12) + '...' : comp}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};

export default EntityCard;
