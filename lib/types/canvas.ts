export type EntityType =
  | "organization"
  | "customer"
  | "partner"
  | "supplier"
  | "technology"
  | "government"
  | "community"
  | "ngo"
  | "investor"
  | "media";

export type FlowType =
  | "money"
  | "product"
  | "service"
  | "data"
  | "value"
  | "knowledge"
  | "influence"
  | "resource"
  | "impact";

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  components?: string[];
  financials?: {
    revenue?: number;
    costs?: number;
    margin?: number;
  };
}

export interface Flow {
  id: string;
  sourceId: string;
  targetId: string;
  type: FlowType;
  label: string;
  color: string;
  value?: number;
  valueType?: "money" | "product" | "subscription" | "service" | "other";
  valueUnit?: string;
  valueDescription?: string;
  monthlyValue?: number;
  monthlyVolume?: number;
}

export interface RoutePoint {
  x: number;
  y: number;
  side?: string;
  type?: string;
}

export interface FlowRoute {
  id: string;
  points: RoutePoint[];
  anchors: {
    source: RoutePoint;
    target: RoutePoint;
  };
}

export interface FlowBundle {
  sourceId: string;
  targetId: string;
  flows: Flow[];
  route: RoutePoint[];
}

export interface HistoryState {
  entities: Entity[];
  flows: Flow[];
  timestamp: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Action {
  type: string;
  data: any;
}

export interface Point {
  x: number;
  y: number;
}

export interface AnchorPoint extends Point {
  side: 'top' | 'bottom' | 'left' | 'right';
  index: number;
}

export interface FlowPath {
  points: Point[];
  sourceAnchor: AnchorPoint;
  targetAnchor: AnchorPoint;
}

export interface EntityAnchors {
  leftInput: RoutePoint;
  leftOutput: RoutePoint;
  rightInput: RoutePoint;
  rightOutput: RoutePoint;
  topInput: RoutePoint;
  topOutput: RoutePoint;
  bottomInput: RoutePoint;
  bottomOutput: RoutePoint;
}

export const ENTITY_TYPES: Record<EntityType, { color: string; icon: string }> = {
  organization: { color: '#3B82F6', icon: '🏢' },
  customer: { color: '#F97316', icon: '👥' },
  partner: { color: '#10B981', icon: '🤝' },
  supplier: { color: '#6B7280', icon: '📦' },
  technology: { color: '#8B5CF6', icon: '💻' },
  government: { color: '#EF4444', icon: '🏛️' },
  community: { color: '#06B6D4', icon: '🌍' },
  ngo: { color: '#84CC16', icon: '🤲' },
  investor: { color: '#F59E0B', icon: '💰' },
  media: { color: '#EC4899', icon: '📺' }
};

export const FLOW_TYPES: Record<FlowType, { color: string; icon: string }> = {
  money: { color: '#EF4444', icon: '💵' },
  product: { color: '#10B981', icon: '📦' },
  service: { color: '#3B82F6', icon: '🔧' },
  data: { color: '#8B5CF6', icon: '📊' },
  value: { color: '#F59E0B', icon: '⭐' },
  knowledge: { color: '#06B6D4', icon: '📚' },
  influence: { color: '#EC4899', icon: '🎯' },
  resource: { color: '#84CC16', icon: '⚡' },
  impact: { color: '#F97316', icon: '🌟' }
};

// Flow color mapping for routing system
export const FLOW_COLOR_MAP: Record<FlowType, string> = {
  money: "#ffd0c9",      // Light red/pink for money flows
  product: "#d1f7c4",    // Light green for products
  service: "#ffd0c9",    // Light red for services
  data: "#d1f7c4",       // Light green for data
  value: "#ffd0c9",      // Light red for value
  knowledge: "#e0f2fe",  // Light blue for knowledge
  influence: "#f3e8ff",  // Light purple for influence
  resource: "#dcfce7",   // Light green for resources
  impact: "#fef3c7",     // Light yellow for impact
};

// Flow icon mapping
export const FLOW_ICON_MAP: Record<FlowType, string> = {
  money: "💵",
  product: "📦",
  service: "🔧",
  data: "📊",
  value: "⭐",
  knowledge: "📚",
  influence: "🎯",
  resource: "⚡",
  impact: "🌟"
};
