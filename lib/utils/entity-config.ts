import type { EntityType } from '@/lib/types/canvas';

export const entityIcons: Record<EntityType, string> = {
  organization: '🏢',
  customer: '👥',
  partner: '🤝',
  supplier: '📦',
  technology: '💻',
  government: '🏛️',
  community: '❤️',
  ngo: '🌍',
  investor: '💰',
  media: '📰',
};

export const entityLabels: Record<EntityType, string> = {
  organization: 'Organization',
  customer: 'Customer',
  partner: 'Partner',
  supplier: 'Supplier',
  technology: 'Technology',
  government: 'Government',
  community: 'Community',
  ngo: 'NGO',
  investor: 'Investor',
  media: 'Media',
};

export const entityColors: Record<EntityType, string> = {
  organization: '#3B82F6', // blue
  customer: '#F97316', // orange
  partner: '#10B981', // green
  supplier: '#6B7280', // gray
  technology: '#8B5CF6', // purple
  government: '#EF4444', // red
  community: '#EC4899', // pink
  ngo: '#84CC16', // lime
  investor: '#EAB308', // yellow
  media: '#6366F1', // indigo
};

export function getEntityIcon(type: EntityType): string {
  return entityIcons[type] || '❓';
}

export function getEntityLabel(type: EntityType): string {
  return entityLabels[type] || type;
}

export function getEntityColor(type: EntityType): string {
  return entityColors[type] || '#64748b'; // default to slate
}
