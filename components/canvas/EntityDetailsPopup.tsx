'use client';


import React, { useState } from 'react';
import { Entity, EntityType, ENTITY_TYPES } from '@/lib/types/canvas';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, X, Trash2, Settings } from 'lucide-react';

interface EntityDetailsPopupProps {
  entity: Entity;
  onUpdate: (entity: Entity) => void;
  onDelete: () => void;
  onClose: () => void;
}

const EntityDetailsPopup: React.FC<EntityDetailsPopupProps> = ({
  entity,
  onUpdate,
  onDelete,
  onClose
}) => {
  const [formData, setFormData] = useState({
    name: entity.name,
    type: entity.type,
    description: entity.description,
    components: entity.components?.join(', ') || ''
  });

  const handleSave = () => {
    const updatedEntity: Entity = {
      ...entity,
      ...formData,
      components: formData.components ? formData.components.split(',').map(c => c.trim()) : []
    };
    onUpdate(updatedEntity);
    onClose();
  };

  return (
    <div
      className="fixed bottom-6 left-6 z-[60] apple-card p-4 w-[380px] max-w-[calc(100vw-3rem)] max-h-[75vh] overflow-y-auto animate-slide-in-up"
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      role="dialog"
      aria-labelledby="entity-details-title"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <h3 id="entity-details-title" className="font-semibold text-lg text-gray-900">
            Entity Details
          </h3>
        </div>
        <Button
          onClick={onClose}
          size="sm"
          variant="ghost"
          className="h-7 w-7 rounded-full bg-gray-100 hover:bg-gray-200 p-0"
        >
          <X className="h-3 w-3 text-gray-600" />
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="entity-name" className="text-xs">Name</Label>
          <Input
            id="entity-name"
            className="apple-input text-sm"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Entity name"
          />
        </div>

        <div>
          <Label htmlFor="entity-type" className="text-xs">Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as EntityType }))}
          >
            <SelectTrigger className="apple-input text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ENTITY_TYPES).map(([type, config]) => (
                <SelectItem key={type} value={type}>
                  <span className="flex items-center gap-2">
                    <span>{config.icon}</span>
                    <span className="capitalize">{type}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="entity-components" className="text-xs">Components</Label>
          <Input
            id="entity-components"
            className="apple-input text-sm"
            value={formData.components}
            onChange={(e) => setFormData(prev => ({ ...prev, components: e.target.value }))}
            placeholder="Marketing, Sales, Support..."
          />
        </div>

        <div>
          <Label htmlFor="entity-description" className="text-xs">Description</Label>
          <Textarea
            id="entity-description"
            className="apple-input text-sm"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe this entity..."
            rows={3}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-4 border-t border-gray-100">
          <Button
            className="apple-button-primary text-sm flex-1"
            onClick={handleSave}
            disabled={!formData.name.trim()}
          >
            <Save size={14} className="mr-2" />
            Save
          </Button>
          <Button
            className="apple-button text-sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="apple-button text-red-600 hover:bg-red-50 text-sm"
            onClick={() => {
              onDelete();
              onClose();
            }}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EntityDetailsPopup;
