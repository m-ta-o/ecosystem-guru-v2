
import { Entity, Flow } from '@/lib/types/canvas';

export const getMainOrganizationId = (entities: Entity[]): string | null => {
  // Find the main organization - look for "Your Organization" or organization type
  const mainOrg = entities.find(entity => 
    entity.name.toLowerCase().includes('your organization') || 
    entity.name.toLowerCase().includes('your business') ||
    entity.name.toLowerCase().includes('your company') ||
    (entity.type === 'organization' && entities.filter(e => e.type === 'organization').length === 1)
  );
  
  return mainOrg?.id || null;
};

export const getDynamicFlowColor = (flow: Flow, entities: Entity[]): string => {
  const mainOrgId = getMainOrganizationId(entities);
  
  if (!mainOrgId) {
    // If no main org found, use subtle grey
    return '#d1d5db';
  }
  
  // Subtle blue for incoming flows to main organization
  if (flow.targetId === mainOrgId) {
    return '#93c5fd';
  }
  
  // Subtle red for outgoing flows from main organization
  if (flow.sourceId === mainOrgId) {
    return '#fca5a5';
  }
  
  // Subtle grey for flows between other entities
  return '#d1d5db';
};

export const getFlowColorWithOpacity = (color: string, opacity: number): string => {
  // Convert hex to rgb with opacity
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
