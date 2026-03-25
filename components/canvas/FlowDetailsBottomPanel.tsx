'use client';


import React, { useState } from 'react';
import { Flow, Entity, FlowType, FLOW_TYPES } from '@/lib/types/canvas';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Save, X, ArrowRight } from 'lucide-react';

interface FlowDetailsBottomPanelProps {
  flow: Flow;
  entities: Entity[];
  onUpdate: (flow: Flow) => void;
  onDelete: () => void;
  onClose: () => void;
}

const FlowDetailsBottomPanel: React.FC<FlowDetailsBottomPanelProps> = ({
  flow,
  entities,
  onUpdate,
  onDelete,
  onClose
}) => {
  const [formData, setFormData] = useState({
    label: flow.label,
    type: flow.type,
    valueDescription: flow.valueDescription || '',
    value: flow.value || 0,
    valueType: flow.valueType || 'other',
    valueUnit: flow.valueUnit || '',
    monthlyValue: flow.monthlyValue || 0,
    monthlyVolume: flow.monthlyVolume || 0
  });

  const sourceEntity = entities.find(e => e.id === flow.sourceId);
  const targetEntity = entities.find(e => e.id === flow.targetId);

  const handleSave = () => {
    const updatedFlow: Flow = {
      ...flow,
      ...formData
    };
    onUpdate(updatedFlow);
    onClose();
  };

  return (
    <div
      className="fixed bottom-6 left-6 z-[60] apple-card p-4 w-[380px] max-w-[calc(100vw-3rem)] max-h-[75vh] overflow-y-auto animate-slide-in-up"
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      role="dialog"
      aria-labelledby="flow-details-title"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-white" />
          </div>
          <h3 id="flow-details-title" className="font-semibold text-lg text-gray-900">
            Flow Details
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

      {/* Connection Info */}
      <div className="bg-gray-50 p-3 rounded-lg mb-4">
        <div className="text-sm font-medium text-gray-700 mb-1">Connection</div>
        <div className="text-xs text-gray-600">
          <span className="font-medium">{sourceEntity?.name}</span>
          <span className="mx-2">→</span>
          <span className="font-medium">{targetEntity?.name}</span>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="flow-label" className="text-xs">Label</Label>
          <Input
            id="flow-label"
            className="apple-input text-sm"
            value={formData.label}
            onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
            placeholder="Flow label"
          />
        </div>

        <div>
          <Label htmlFor="flow-type" className="text-xs">Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as FlowType }))}
          >
            <SelectTrigger className="apple-input text-sm" id="flow-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[70]">
              {Object.entries(FLOW_TYPES).map(([type, config]) => (
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

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="flow-value" className="text-xs">Value</Label>
            <Input
              id="flow-value"
              type="number"
              className="apple-input text-sm"
              value={formData.value}
              onChange={(e) => setFormData(prev => ({ ...prev, value: Number(e.target.value) }))}
              placeholder="0"
            />
          </div>
          <div>
            <Label htmlFor="flow-unit" className="text-xs">Unit</Label>
            <Input
              id="flow-unit"
              className="apple-input text-sm"
              value={formData.valueUnit}
              onChange={(e) => setFormData(prev => ({ ...prev, valueUnit: e.target.value }))}
              placeholder="$, users, etc."
            />
          </div>
        </div>

        <div>
          <Label htmlFor="flow-description" className="text-xs">Description</Label>
          <Textarea
            id="flow-description"
            className="apple-input text-sm"
            value={formData.valueDescription}
            onChange={(e) => setFormData(prev => ({ ...prev, valueDescription: e.target.value }))}
            placeholder="Describe what flows through this connection..."
            rows={3}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-4 border-t border-gray-100">
          <Button
            className="apple-button-primary text-sm flex-1"
            onClick={handleSave}
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

export default FlowDetailsBottomPanel;
