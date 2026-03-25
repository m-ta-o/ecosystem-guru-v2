'use client';


import React, { useState } from 'react';
import { Flow, Entity, FlowType, FLOW_TYPES } from '@/lib/types/canvas';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Save, X } from 'lucide-react';

interface FlowDetailsPopupProps {
  flow: Flow;
  entities: Entity[];
  onUpdate: (flow: Flow) => void;
  onDelete: () => void;
  onClose: () => void;
}

const FlowDetailsPopup: React.FC<FlowDetailsPopupProps> = ({
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
      ...formData,
      color: FLOW_TYPES[formData.type].color
    };
    onUpdate(updatedFlow);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-96 max-h-[90vh] overflow-y-auto apple-card">
        <CardHeader className="flex-row items-center justify-between py-3">
          <CardTitle>Flow Details</CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="p-1 h-8 w-8"
            onClick={onClose}
          >
            <X size={16} />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-1">Connection</div>
            <div className="text-xs text-gray-600">
              <span className="font-medium">{sourceEntity?.name}</span>
              <span className="mx-2">→</span>
              <span className="font-medium">{targetEntity?.name}</span>
            </div>
          </div>

          <div>
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              className="apple-input"
              value={formData.label}
              onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
              placeholder="Flow label"
            />
          </div>

          <div>
            <Label htmlFor="type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as FlowType }))}
            >
              <SelectTrigger className="apple-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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

          <div>
            <Label htmlFor="valueDescription">Description</Label>
            <Textarea
              id="valueDescription"
              className="apple-input"
              value={formData.valueDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, valueDescription: e.target.value }))}
              placeholder="Describe what flows through this connection..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                type="number"
                className="apple-input"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: Number(e.target.value) }))}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="valueUnit">Unit</Label>
              <Input
                id="valueUnit"
                className="apple-input"
                value={formData.valueUnit}
                onChange={(e) => setFormData(prev => ({ ...prev, valueUnit: e.target.value }))}
                placeholder="$, users, etc."
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              className="apple-button-primary flex-1"
              onClick={handleSave}
            >
              <Save size={16} className="mr-2" />
              Save
            </Button>
            <Button
              className="apple-button flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              className="apple-button text-red-600 hover:bg-red-50"
              onClick={() => {
                onDelete();
                onClose();
              }}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FlowDetailsPopup;
