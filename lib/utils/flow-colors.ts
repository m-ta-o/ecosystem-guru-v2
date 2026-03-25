import type { FlowType } from '@/lib/types/canvas';

export const flowColors: Record<FlowType, string> = {
  money: '#EF4444', // red
  product: '#10B981', // green
  service: '#3B82F6', // blue
  data: '#8B5CF6', // purple
  value: '#F59E0B', // amber
  knowledge: '#06B6D4', // cyan
  influence: '#EC4899', // pink
  resource: '#84CC16', // lime
  impact: '#6366F1', // indigo
};

export const flowLabels: Record<FlowType, string> = {
  money: 'Money',
  product: 'Product',
  service: 'Service',
  data: 'Data',
  value: 'Value',
  knowledge: 'Knowledge',
  influence: 'Influence',
  resource: 'Resource',
  impact: 'Impact',
};

export const flowIcons: Record<FlowType, string> = {
  money: '💵',
  product: '📦',
  service: '🔧',
  data: '📊',
  value: '⭐',
  knowledge: '📚',
  influence: '🎯',
  resource: '⚡',
  impact: '🌟',
};

export function getFlowColor(type: FlowType): string {
  return flowColors[type] || '#64748b'; // default to slate
}

export function getFlowLabel(type: FlowType): string {
  return flowLabels[type] || type;
}

export function getFlowIcon(type: FlowType): string {
  return flowIcons[type] || '❓';
}
