'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Entity, Flow, HistoryState, EntityType, FlowType, ENTITY_TYPES, FLOW_TYPES, FlowRoute, FlowBundle } from '@/lib/types/canvas';
import { Plus, Minus, Square, Trash2, Brain, Undo, Redo, ArrowUpRight, Sparkles, ChevronLeft, ChevronRight, PanelLeftClose, PanelRightClose } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AIChatPanel from '@/components/canvas/AIChatPanel';
import FlowDetailsBottomPanel from '@/components/canvas/FlowDetailsBottomPanel';
import EntityDetailsPopup from '@/components/canvas/EntityDetailsPopup';
import ValueExchangePopup from '@/components/canvas/ValueExchangePopup';
import EntityCard from '@/components/canvas/EntityCard';
import { getOptimalConnectionPoints, calculateFigJamRoute, createFigJamPathString, offsetRouteForBundle, getEntityAnchors } from '@/lib/utils/flowRouting';
import { getClosestPointOnPolyline } from '@/lib/utils/geometry';
import { getFlowLabelPosition } from '@/lib/utils/flowPositioning';
import { getDynamicFlowColor, getFlowColorWithOpacity } from '@/lib/utils/flowColors';
import { autoLayout } from '@/lib/utils/smartLayout';

const BusinessModelCanvas: React.FC = () => {
  // Core state - force refresh with current timestamp
  const [entities, setEntities] = useState<Entity[]>(() => getInitialEntities());
  const [flows, setFlows] = useState<Flow[]>(() => getInitialFlows());

  // Flow routing state
  const [flowRoutes, setFlowRoutes] = useState<Map<string, FlowRoute>>(new Map());
  const [flowBundles, setFlowBundles] = useState<FlowBundle[]>([]);
  const [flowLabelPositions, setFlowLabelPositions] = useState<Map<string, number>>(new Map());

  // UI state
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({
    x: 0,
    y: 0
  });
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  // Interaction state
  const [draggedEntity, setDraggedEntity] = useState<string | null>(null);
  const [draggedFlowLabelId, setDraggedFlowLabelId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({
    x: 0,
    y: 0
  });
  const [isCreatingFlow, setIsCreatingFlow] = useState(false);
  const [flowCreationSource, setFlowCreationSource] = useState<string | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiMode, setAIMode] = useState<'chat' | 'generate' | 'expand' | 'analyze' | 'suggest'>('chat');
  const [aiSelectedEntity, setAISelectedEntity] = useState<Entity | undefined>();
  const [aiInitialPrompt, setAIInitialPrompt] = useState<string>('');
  const [showEntityForm, setShowEntityForm] = useState(false);
  const [showFlowDetails, setShowFlowDetails] = useState(false);
  const [showEntityDetails, setShowEntityDetails] = useState(false);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [showValueExchange, setShowValueExchange] = useState(false);

  // History - initialize with fresh data
  const [history, setHistory] = useState<HistoryState[]>(() => [{
    entities: getInitialEntities(),
    flows: getInitialFlows(),
    timestamp: Date.now()
  }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);
  const lastMousePos = useRef({
    x: 0,
    y: 0
  });
  const dragThreshold = 5; // pixels

  // Entity form state
  const [entityForm, setEntityForm] = useState({
    name: '',
    type: 'organization' as EntityType,
    description: '',
    components: ''
  });
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Calculate flow routes with improved anchor usage tracking
  const calculateFlowRoutes = useCallback(() => {
    console.log('=== Starting Flow Route Calculation ===');
    const routes = new Map<string, FlowRoute>();
    const bundles: FlowBundle[] = [];

    // Group flows by entity pairs (bidirectional grouping)
    const flowGroups = new Map<string, Flow[]>();
    flows.forEach(flow => {
      const key = [flow.sourceId, flow.targetId].sort().join('::');
      if (!flowGroups.has(key)) {
        flowGroups.set(key, []);
      }
      flowGroups.get(key)!.push(flow);
    });
    console.log('Flow groups created:', Array.from(flowGroups.keys()));

    // Helper to process a set of unidirectional flows
    const processDirectionalFlows = (directionalFlows: Flow[], strategy?: 'bidirectional_top' | 'bidirectional_bottom') => {
      if (directionalFlows.length === 0) return;
      const {
        sourceId,
        targetId
      } = directionalFlows[0];
      const sourceEntity = entities.find(e => e.id === sourceId);
      const targetEntity = entities.find(e => e.id === targetId);
      if (!sourceEntity || !targetEntity) {
        console.error('Entity not found for directional flow:', {
          sourceId,
          targetId
        });
        return;
      }
      try {
        const {
          sourcePoint,
          targetPoint
        } = getOptimalConnectionPoints(sourceEntity, targetEntity, flows, strategy);
        const baseRoute = calculateFigJamRoute(sourcePoint, targetPoint, entities);
        if (directionalFlows.length > 1) {
          bundles.push({
            sourceId,
            targetId,
            flows: directionalFlows,
            route: baseRoute
          });
        }
        directionalFlows.forEach((flow, index) => {
          const offsetRoute = offsetRouteForBundle(baseRoute, index, directionalFlows.length);
          routes.set(flow.id, {
            id: flow.id,
            points: offsetRoute,
            anchors: {
              source: sourcePoint,
              target: targetPoint
            }
          });
        });
      } catch (error) {
        console.error(`Failed to create route for flow group with strategy ${strategy}:`, error);
      }
    };

    // Process each flow group
    flowGroups.forEach((groupFlows, key) => {
      const [entityId1, entityId2] = key.split("::"); // entityId1 is alphabetically first
      console.log(`Processing group ${key} with ${groupFlows.length} flows`);
      const sourceIds = new Set(groupFlows.map(f => f.sourceId));
      const isBidirectional = sourceIds.size > 1;
      if (isBidirectional) {
        console.log(`Group ${key} is bidirectional. Applying strategies.`);

        // Simplified, deterministic strategy assignment.
        // Flows from the alphabetically first entity ID get 'top' strategy.
        const flowsTop = groupFlows.filter(f => f.sourceId === entityId1 && f.targetId === entityId2);

        // Flows in the reverse direction get 'bottom' strategy.
        const flowsBottom = groupFlows.filter(f => f.sourceId === entityId2 && f.targetId === entityId1);
        processDirectionalFlows(flowsTop, 'bidirectional_top');
        processDirectionalFlows(flowsBottom, 'bidirectional_bottom');
      } else {
        console.log(`Group ${key} is unidirectional.`);
        processDirectionalFlows(groupFlows); // No strategy, use default logic
      }
    });
    console.log('=== Route Calculation Complete ===');
    console.log('Total routes created:', routes.size);
    setFlowRoutes(routes);
    setFlowBundles(bundles);
  }, [entities, flows]);

  // Recalculate routes when entities or flows change
  useEffect(() => {
    if (entities.length > 0 && flows.length > 0) {
      console.log('Triggering route calculation due to entity/flow changes');
      calculateFlowRoutes();
    }
  }, [entities, flows, calculateFlowRoutes]);

  const saveToHistory = useCallback(() => {
    const newState: HistoryState = {
      entities: [...entities],
      flows: [...flows],
      timestamp: Date.now()
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [entities, flows, history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setEntities(prevState.entities);
      setFlows(prevState.flows);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setEntities(nextState.entities);
      setFlows(nextState.flows);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't delete entities/flows if user is typing in an input field
        const target = e.target as HTMLElement;
        const isTyping = target.tagName === 'INPUT' ||
                         target.tagName === 'TEXTAREA' ||
                         target.isContentEditable;

        if (!isTyping) {
          if (selectedEntity) {
            deleteEntity(selectedEntity.id);
          }
          if (selectedFlow) {
            deleteFlow(selectedFlow.id);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEntity, selectedFlow, undo, redo]);

  const createEntity = () => {
    const newEntity: Entity = {
      id: generateId(),
      name: entityForm.name || 'New Entity',
      type: entityForm.type,
      description: entityForm.description,
      x: (window.innerWidth / 2 - pan.x) / zoom - 100,
      y: (window.innerHeight / 2 - pan.y) / zoom - 50,
      width: 200,
      height: 100,
      color: ENTITY_TYPES[entityForm.type].color,
      components: entityForm.components ? entityForm.components.split(',').map(c => c.trim()) : []
    };
    setEntities(prev => [...prev, newEntity]);
    setEntityForm({
      name: '',
      type: 'organization',
      description: '',
      components: ''
    });
    setShowEntityForm(false);
    saveToHistory();
  };

  const updateEntity = (id: string, updates: Partial<Entity>) => {
    setEntities(prev => prev.map(e => e.id === id ? {
      ...e,
      ...updates
    } : e));
  };

  const deleteEntity = (id: string) => {
    setEntities(prev => prev.filter(e => e.id !== id));
    setFlows(prev => prev.filter(f => f.sourceId !== id && f.targetId !== id));
    setSelectedEntity(null);
    setShowEntityDetails(false);
    saveToHistory();
  };

  const createFlow = (sourceId: string, targetId: string) => {
    const newFlow: Flow = {
      id: generateId(),
      sourceId,
      targetId,
      type: 'value',
      label: 'New Flow',
      color: getDynamicFlowColor({
        sourceId,
        targetId
      } as Flow, entities),
      valueDescription: ''
    };
    setFlows(prev => [...prev, newFlow]);
    setIsCreatingFlow(false);
    setFlowCreationSource(null);
    saveToHistory();
  };

  const deleteFlow = (id: string) => {
    setFlows(prev => prev.filter(f => f.id !== id));
    setSelectedFlow(null);
    setShowFlowDetails(false);
    saveToHistory();
  };

  const handleFlowClick = (flow: Flow, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFlow(flow);
    setSelectedEntity(null);
    setShowEntityDetails(false);
    setShowFlowDetails(true);
  };

  const handleMouseDown = (e: React.MouseEvent, entityId?: string) => {
    if (entityId) {
      if (isCreatingFlow) {
        if (flowCreationSource) {
          if (flowCreationSource !== entityId) {
            createFlow(flowCreationSource, entityId);
          }
        } else {
          setFlowCreationSource(entityId);
        }
        return;
      }
      const entity = entities.find(e => e.id === entityId);
      if (entity) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          setDragOffset({
            x: (e.clientX - rect.left) / zoom - entity.x,
            y: (e.clientY - rect.top) / zoom - entity.y
          });
          setDraggedEntity(entityId);
        }
      }
    } else {
      setIsDraggingCanvas(true);
      setSelectedEntity(null);
      setSelectedFlow(null);
      setShowEntityDetails(false);
      setShowFlowDetails(false);
    }
    lastMousePos.current = {
      x: e.clientX,
      y: e.clientY
    };
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    const hasMovedEnough = Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold;
    if (draggedEntity) {
      if (!isDragging.current && hasMovedEnough) {
        isDragging.current = true;
      }
      if (isDragging.current) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const newX = (e.clientX - rect.left) / zoom - dragOffset.x;
          const newY = (e.clientY - rect.top) / zoom - dragOffset.y;
          updateEntity(draggedEntity, {
            x: newX,
            y: newY
          });
        }
      }
    } else if (isDraggingCanvas) {
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
    } else if (draggedFlowLabelId) {
      const flow = flows.find(f => f.id === draggedFlowLabelId);
      const route = flowRoutes.get(draggedFlowLabelId);
      if (flow && route && route.points.length > 1) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const mouseX = (e.clientX - rect.left - pan.x) / zoom;
          const mouseY = (e.clientY - rect.top - pan.y) / zoom;
          const {
            percentage
          } = getClosestPointOnPolyline({
            x: mouseX,
            y: mouseY
          }, route.points);
          setFlowLabelPositions(prev => new Map(prev).set(draggedFlowLabelId, percentage));
        }
      }
    }
    lastMousePos.current = {
      x: e.clientX,
      y: e.clientY
    };
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (draggedEntity) {
      if (isDragging.current) {
        // This was a drag, so just save the new state
        saveToHistory();
      } else {
        // This was a click, not a drag, so we show the details.
        const entity = entities.find(e => e.id === draggedEntity);
        if (entity) {
          setSelectedEntity(entity);
          setSelectedFlow(null);
          setShowFlowDetails(false);
          setShowEntityDetails(true);
        }
      }
    }
    if (draggedFlowLabelId) {
      // Potentially save history for label move if needed
      saveToHistory();
    }
    setDraggedEntity(null);
    setDraggedFlowLabelId(null);
    setIsDraggingCanvas(false);
    // isDragging flag is reset in handleMouseDown, so no need to reset here.
  };

  // NEW: Canvas-only wheel handler for zoom/pan
  const handleCanvasWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.ctrlKey || e.metaKey) {
      // Zoom functionality with Ctrl/Cmd + wheel
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(3, zoom * delta));
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const zoomDelta = newZoom - zoom;
        setPan(prev => ({
          x: prev.x - mouseX * zoomDelta,
          y: prev.y - mouseY * zoomDelta
        }));
      }
      setZoom(newZoom);
    } else {
      // Pan functionality with regular wheel
      setPan(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  };

  const resetView = () => {
    setZoom(1);
    setPan({
      x: 0,
      y: 0
    });
  };

  const handleAutoLayout = async () => {
    if (entities.length === 0) return;

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Apply smart auto-layout centered on viewport
    const layoutedEntities = await autoLayout(
      entities,
      flows,
      'semantic', // Use semantic radial layout + force-directed cleanup
      viewportWidth / 2,  // center X of viewport
      viewportHeight / 2  // center Y of viewport
    );

    setEntities(layoutedEntities);
    saveToHistory();

    // Reset view to show the centered layout
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Enhanced flow rendering with subtle colors and reduced stroke width
  const renderFallbackFlow = (flow: Flow) => {
    const source = entities.find(e => e.id === flow.sourceId);
    const target = entities.find(e => e.id === flow.targetId);
    if (!source || !target) {
      return null;
    }
    const {
      sourcePoint,
      targetPoint
    } = getOptimalConnectionPoints(source, target);
    const sourceX = sourcePoint.x;
    const sourceY = sourcePoint.y;
    const targetX = targetPoint.x;
    const targetY = targetPoint.y;

    // Create curved path
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    const controlOffset = 60;

    // Determine curve direction based on relative positions
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const controlX = midX + (dy > 0 ? -controlOffset : controlOffset);
    const controlY = midY + (dx > 0 ? -controlOffset : controlOffset);
    const pathString = `M ${sourceX},${sourceY} Q ${controlX},${controlY} ${targetX},${targetY}`;
    const flowColor = getDynamicFlowColor(flow, entities);
    const arrowMarkerId = `arrowhead-${flowColor.replace('#', '')}`;
    return <g key={`fallback-${flow.id}`}>
        {/* Invisible wider path for click detection */}
        <path d={pathString} stroke="transparent" strokeWidth={24} fill="none" style={{
        cursor: "pointer",
        pointerEvents: "auto"
      }} onClick={e => handleFlowClick(flow, e)} />
        
        {/* Visible flow line with subtle colors and reduced stroke width */}
        <path d={pathString} stroke={flowColor} strokeWidth={selectedFlow?.id === flow.id ? 3 : 2} fill="none" markerEnd={`url(#${arrowMarkerId})`} className="transition-all" style={{
        strokeLinecap: "round",
        strokeLinejoin: "round",
        opacity: selectedFlow?.id === flow.id ? 0.8 : 0.6
      }} />
      </g>;
  };

  // Visible connection points for flow creation - one per side
  const renderConnectionPoints = (entity: Entity) => {
    const isActive = flowCreationSource === entity.id;
    const isTarget = flowCreationSource && flowCreationSource !== entity.id;

    // Calculate center points for each side
    const connectionPoints = [
      { side: 'top', x: entity.x + entity.width / 2, y: entity.y },
      { side: 'right', x: entity.x + entity.width, y: entity.y + entity.height / 2 },
      { side: 'bottom', x: entity.x + entity.width / 2, y: entity.y + entity.height },
      { side: 'left', x: entity.x, y: entity.y + entity.height / 2 },
    ];

    return connectionPoints.map((point) => {
      return (
        <div
          key={`anchor-${entity.id}-${point.side}`}
          className="absolute cursor-pointer transition-all duration-200"
          style={{
            left: point.x - 8,
            top: point.y - 8,
            width: 16,
            height: 16,
            zIndex: 30,
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (flowCreationSource) {
              if (flowCreationSource !== entity.id) {
                createFlow(flowCreationSource, entity.id);
                setFlowCreationSource(null);
              }
            } else {
              setFlowCreationSource(entity.id);
            }
          }}
        >
          <div
            className={`w-full h-full rounded-full border-2 transition-all duration-200 ${
              isActive
                ? 'bg-blue-500 border-blue-600 scale-150 shadow-lg'
                : isTarget
                ? 'bg-green-400 border-green-500 scale-125 shadow-md'
                : 'bg-white border-gray-400 opacity-0 group-hover:opacity-100 group-hover:scale-125 hover:!opacity-100 hover:!scale-150 hover:border-blue-400'
            }`}
            style={{
              boxShadow: isActive ? '0 0 12px rgba(59, 130, 246, 0.6)' :
                         isTarget ? '0 0 8px rgba(34, 197, 94, 0.5)' : '0 2px 4px rgba(0,0,0,0.1)'
            }}
          />
        </div>
      );
    });
  };

  // Enhanced flow value tiles with dynamic colors and improved layout
  const renderFlowValueTiles = () => {
    return flows.map(flow => {
      const position = getFlowLabelPosition(flow, entities, flowRoutes, flowLabelPositions.get(flow.id));
      const flowType = FLOW_TYPES[flow.type];
      const flowColor = getDynamicFlowColor(flow, entities);
      return <div key={`flow-tile-${flow.id}`} className="absolute cursor-grab hover:shadow-lg transition-all duration-200 border border-opacity-30" style={{
        left: position.x - 85,
        top: position.y - 22,
        width: 170,
        height: 44,
        zIndex: 15,
        userSelect: 'none',
        backgroundColor: getFlowColorWithOpacity(flowColor, 0.08),
        borderColor: flowColor,
        borderRadius: '10px',
        backdropFilter: 'blur(8px)',
        opacity: 0.95
      }} onClick={e => handleFlowClick(flow, e)} onMouseDown={e => {
        e.stopPropagation();
        setDraggedFlowLabelId(flow.id);
        lastMousePos.current = {
          x: e.clientX,
          y: e.clientY
        };
      }}>
          <div className="flex flex-col justify-center h-full px-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm" style={{
              color: flowColor
            }}>
                {flowType?.icon || '→'}
              </span>
              <span className="text-sm font-medium text-gray-700 truncate">
                {flow.label}
              </span>
            </div>
            {flow.value && <div className="text-xs font-mono" style={{
            color: flowColor
          }}>
                {flow.value.toLocaleString()}{flow.valueUnit || ''}
              </div>}
          </div>
        </div>;
    });
  };

  // Create unique colors for arrowhead markers
  const getUniqueFlowColors = () => {
    const colors = new Set<string>();
    flows.forEach(flow => {
      colors.add(getDynamicFlowColor(flow, entities));
    });
    return Array.from(colors);
  };

  function getInitialEntities(): Entity[] {
    return [{
      id: 'main-company',
      name: 'Your Organization',
      type: 'organization',
      description: 'Your core business or organization. This is the new default state.',
      x: 375,
      y: 300,
      width: 200,
      height: 150,
      color: ENTITY_TYPES.organization.color,
      components: ['Strategy', 'Operations', 'Innovation']
    }, {
      id: 'primary-customers',
      name: 'Primary Customer Segments',
      type: 'customer',
      description: 'The main group of people who buy your products.',
      x: 750,
      y: 50,
      width: 200,
      height: 120,
      color: ENTITY_TYPES.customer.color,
      components: ['Early Adopters', 'Needs Analysis']
    }, {
      id: 'strategic-suppliers',
      name: 'Strategic Suppliers',
      type: 'supplier',
      description: 'Provide essential materials for your business.',
      x: 50,
      y: 180,
      width: 180,
      height: 120,
      color: ENTITY_TYPES.supplier.color,
      components: ['Key Materials', 'Logistics']
    }];
  }

  function getInitialFlows(): Flow[] {
    return [
      // Customer flows  
      {
        id: 'flow-1',
        sourceId: 'main-company',
        targetId: 'primary-customers',
        type: 'product',
        label: 'Core Product Offering',
        color: '#ef4444',
        valueDescription: 'Products & Services',
        value: 75000,
        valueUnit: '/month',
        monthlyValue: 75000
      },
      {
        id: 'flow-2',
        sourceId: 'primary-customers',
        targetId: 'main-company',
        type: 'money',
        label: 'Sales Revenue',
        color: '#3b82f6',
        valueDescription: 'Customer payments',
        value: 75000,
        valueUnit: '/month',
        monthlyValue: 75000
      },
      
      // Supplier flows
      {
        id: 'flow-3',
        sourceId: 'strategic-suppliers',
        targetId: 'main-company',
        type: 'resource',
        label: 'Essential Materials',
        color: '#22c55e',
        valueDescription: 'Raw materials & components',
        value: 30000,
        valueUnit: '/month',
        monthlyValue: 30000
      },
      {
        id: 'flow-4',
        sourceId: 'main-company',
        targetId: 'strategic-suppliers',
        type: 'money',
        label: 'Supplier Payments',
        color: '#ef4444',
        valueDescription: 'Material costs',
        value: 30000,
        valueUnit: '/month',
        monthlyValue: 30000
      }
    ];
  }

  return (
    <>
      {/* Figma-Style Fixed UI Panels - Not affected by zoom */}
      <div className="fixed inset-0 pointer-events-none z-30">
        {/* Top Title Bar */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-white/80 backdrop-blur-sm border-b border-gray-200 pointer-events-auto flex items-center px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md flex items-center justify-center">
              <Image
                src="/de-logo.png"
                alt="Disruptive Edge"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <h1 className="font-semibold text-gray-800 text-sm">Business Model Ecosystem</h1>
          </div>
        </div>

        {/* Left Panel */}
        <div
          className="absolute left-0 top-12 bottom-0 bg-white/80 backdrop-blur-sm border-r border-gray-200 pointer-events-auto transition-all duration-300 ease-in-out flex"
          style={{
            width: leftPanelCollapsed ? '40px' : '64px',
            transform: leftPanelCollapsed ? 'translateX(0)' : 'translateX(0)'
          }}
        >
          <div className="flex-1 flex flex-col items-center py-4 gap-3 overflow-y-auto">
            {!leftPanelCollapsed && (
              <>
                {/* Zoom controls */}
                <div className="flex flex-col gap-1 items-center">
                  <Button
                    size="sm"
                    className="apple-button p-2 h-8 w-8"
                    onClick={() => setZoom(Math.min(3, zoom * 1.2))}
                    title="Zoom In"
                  >
                    <Plus size={14} />
                  </Button>
                  <span className="text-xs text-center px-1 font-mono text-gray-600">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    size="sm"
                    className="apple-button p-2 h-8 w-8"
                    onClick={() => setZoom(Math.max(0.1, zoom * 0.8))}
                    title="Zoom Out"
                  >
                    <Minus size={14} />
                  </Button>
                  <Button
                    size="sm"
                    className="apple-button p-2 h-8 w-8"
                    onClick={resetView}
                    title="Reset View"
                  >
                    <Square size={14} />
                  </Button>
                </div>

                <div className="w-8 h-px bg-gray-200" />

                {/* History controls */}
                <div className="flex flex-col gap-1 items-center">
                  <Button
                    size="sm"
                    className="apple-button p-2 h-8 w-8"
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    title="Undo"
                  >
                    <Undo size={14} />
                  </Button>
                  <Button
                    size="sm"
                    className="apple-button p-2 h-8 w-8"
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    title="Redo"
                  >
                    <Redo size={14} />
                  </Button>
                </div>

                <div className="w-8 h-px bg-gray-200" />

                {/* Auto Layout button */}
                <Button
                  size="sm"
                  className="apple-button-primary p-2 h-10 w-10"
                  onClick={handleAutoLayout}
                  disabled={entities.length === 0}
                  title="Auto Layout - Organize intelligently"
                >
                  <Sparkles size={16} className="text-blue-600" />
                </Button>
              </>
            )}
          </div>

          {/* Collapse button */}
          <button
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-16 bg-white border border-gray-200 rounded-r-md hover:bg-gray-50 transition-colors flex items-center justify-center shadow-sm"
          >
            {leftPanelCollapsed ? <ChevronRight size={14} className="text-gray-600" /> : <ChevronLeft size={14} className="text-gray-600" />}
          </button>
        </div>

        {/* Right Panel */}
        <div
          className="absolute right-0 top-12 bottom-0 bg-white/80 backdrop-blur-sm border-l border-gray-200 pointer-events-auto transition-all duration-300 ease-in-out flex"
          style={{
            width: rightPanelCollapsed ? '40px' : '200px',
            transform: rightPanelCollapsed ? 'translateX(0)' : 'translateX(0)'
          }}
        >
          <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto">
            {!rightPanelCollapsed && (
              <>
                {/* Action buttons */}
                <Button
                  className="apple-button w-full justify-start text-sm"
                  onClick={() => setShowEntityForm(true)}
                >
                  <Plus size={14} className="mr-2" />
                  Add Entity
                </Button>
                <Button
                  className={`apple-button w-full justify-start text-sm ${isCreatingFlow ? 'bg-blue-500 text-white' : ''}`}
                  onClick={() => {
                    setIsCreatingFlow(!isCreatingFlow);
                    setFlowCreationSource(null);
                  }}
                >
                  <ArrowUpRight size={14} className="mr-2" />
                  Add Flow
                </Button>

                <div className="h-px bg-gray-200 my-1" />

                {/* Value Exchange Button */}
                <Button
                  className={`apple-button w-full justify-start text-sm ${showValueExchange ? 'bg-blue-100 border-blue-300' : ''}`}
                  onClick={() => setShowValueExchange(!showValueExchange)}
                >
                  <ArrowUpRight size={14} className="mr-2" />
                  Value Exchanges
                </Button>

                {/* Delete button for selected items */}
                {(selectedEntity || selectedFlow) && (
                  <>
                    <div className="h-px bg-gray-200 my-1" />
                    <Button
                      className="apple-button text-red-600 hover:bg-red-50 w-full justify-start text-sm"
                      onClick={() => {
                        if (selectedEntity) deleteEntity(selectedEntity.id);
                        if (selectedFlow) deleteFlow(selectedFlow.id);
                      }}
                    >
                      <Trash2 size={14} className="mr-2" />
                      Delete
                    </Button>
                  </>
                )}

                <div className="flex-1" />

                {/* Business Guru Button - Bottom */}
                <Button
                  className="apple-button-secondary w-full py-3 flex items-center justify-start gap-2 transition-all duration-200"
                  onClick={() => setShowAIChat(true)}
                >
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <Brain className="h-2.5 w-2.5 text-white" />
                  </div>
                  <span className="font-medium text-xs">Business Guru</span>
                </Button>
              </>
            )}
          </div>

          {/* Collapse button */}
          <button
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-16 bg-white border border-gray-200 rounded-l-md hover:bg-gray-50 transition-colors flex items-center justify-center shadow-sm"
          >
            {rightPanelCollapsed ? <ChevronLeft size={14} className="text-gray-600" /> : <ChevronRight size={14} className="text-gray-600" />}
          </button>
        </div>
      </div>

      {/* Canvas Drawing Area - ONLY this area handles zoom/pan */}
      <div className="w-full h-screen relative bg-slate-100 overflow-hidden">
        <div 
        ref={canvasRef} 
        className="w-full h-full relative overflow-hidden"
        onWheel={handleCanvasWheel}
        onMouseDown={handleMouseDown} 
        onMouseMove={handleMouseMove} 
        onMouseUp={handleMouseUp}
        style={{
          cursor: isDraggingCanvas ? 'grabbing' : draggedFlowLabelId ? 'grabbing' : 'grab',
          backgroundColor: 'rgb(248, 250, 252)',
          userSelect: 'none'
        }}
      >
        {/* Zoomable Canvas Content */}
        <div 
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: '20000px',
            height: '20000px',
            userSelect: 'none'
          }}
        >
          {/* Enhanced SVG Flow Lines */}
          <svg 
            ref={svgRef} 
            className="absolute top-0 left-0 w-full h-full"
            style={{
              zIndex: 1,
              pointerEvents: "none"
            }}
          >
            <defs>
              {/* Create subtle arrowhead markers for each unique color */}
              {getUniqueFlowColors().map(color => {
                const markerId = `arrowhead-${color.replace('#', '')}`;
                return (
                  <marker key={markerId} id={markerId} markerWidth="10" markerHeight="10" refX="9" refY="4" orient="auto" markerUnits="strokeWidth">
                    <path d="M 0,0 L 0,8 L 9,4 z" fill={color} stroke={color} strokeWidth="0.5" />
                  </marker>
                );
              })}
            </defs>

            {/* Render each flow */}
            {flows.map(flow => {
              const route = flowRoutes.get(flow.id);

              if (route && route.points.length >= 2) {
                const pathString = createFigJamPathString(route.points);
                const flowColor = getDynamicFlowColor(flow, entities);
                const arrowMarkerId = `arrowhead-${flowColor.replace('#', '')}`;

                return (
                  <g key={flow.id}>
                    {/* Invisible wider path for click detection */}
                    <path 
                      d={pathString} 
                      stroke="transparent" 
                      strokeWidth={24} 
                      fill="none" 
                      style={{
                        cursor: "pointer",
                        pointerEvents: "auto"
                      }} 
                      onClick={e => handleFlowClick(flow, e)} 
                    />
                    
                    {/* Visible flow line */}
                    <path 
                      d={pathString} 
                      stroke={flowColor} 
                      strokeWidth={selectedFlow?.id === flow.id ? 3 : 2} 
                      fill="none" 
                      markerEnd={`url(#${arrowMarkerId})`} 
                      className="transition-all" 
                      style={{
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        opacity: selectedFlow?.id === flow.id ? 0.8 : 0.6
                      }} 
                    />
                  </g>
                );
              } else {
                return renderFallbackFlow(flow);
              }
            })}
          </svg>

          {/* Render entities */}
          {entities.map(entity => (
            <EntityCard
              key={entity.id}
              entity={entity}
              isSelected={selectedEntity?.id === entity.id}
              isDragged={draggedEntity === entity.id}
              onMouseDown={handleMouseDown}
              onUpdateEntity={updateEntity}
              onAIAction={(entityId, action) => {
                const entity = entities.find(e => e.id === entityId);
                if (entity) {
                  setAISelectedEntity(entity);
                  if (action === 'expand') {
                    setAIMode('expand');
                    setAIInitialPrompt(`Suggest new connections for "${entity.name}"`);
                  } else if (action === 'analyze') {
                    setAIMode('analyze');
                    setAIInitialPrompt(`Analyze "${entity.name}" and its role in the ecosystem`);
                  }
                  setShowAIChat(true);
                }
              }}
            >
              {renderConnectionPoints(entity)}
            </EntityCard>
          ))}

          {/* Render flow value tiles */}
          {renderFlowValueTiles()}

          {/* Flow creation indicator */}
          {isCreatingFlow && flowCreationSource && (
            <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm z-50">
              Click on target entity to create flow
            </div>
          )}
        </div>
      </div>

      {/* Fixed Modals and Popups - Never zoom, prevent wheel events */}
      {/* Entity Form Modal */}
      {showEntityForm && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onWheel={(e) => e.stopPropagation()}
        >
          <Card className="w-96 apple-card">
            <CardHeader>
              <CardTitle>Create New Entity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  className="apple-input" 
                  value={entityForm.name} 
                  onChange={e => setEntityForm(prev => ({ ...prev, name: e.target.value }))} 
                  placeholder="Enter entity name" 
                />
              </div>
              
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={entityForm.type} onValueChange={value => setEntityForm(prev => ({ ...prev, type: value as EntityType }))}>
                  <SelectTrigger className="apple-input">
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
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  className="apple-input" 
                  value={entityForm.description} 
                  onChange={e => setEntityForm(prev => ({ ...prev, description: e.target.value }))} 
                  placeholder="Describe this entity..." 
                  rows={3} 
                />
              </div>

              <div>
                <Label htmlFor="components">Components (comma-separated)</Label>
                <Input 
                  id="components" 
                  className="apple-input" 
                  value={entityForm.components} 
                  onChange={e => setEntityForm(prev => ({ ...prev, components: e.target.value }))} 
                  placeholder="Marketing, Sales, Support..." 
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  className="apple-button-primary flex-1" 
                  onClick={createEntity} 
                  disabled={!entityForm.name.trim()}
                >
                  Create Entity
                </Button>
                <Button 
                  className="apple-button flex-1" 
                  onClick={() => setShowEntityForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Chat Panel */}
      {showAIChat && (
        <AIChatPanel
          entities={entities}
          flows={flows}
          onClose={() => {
            setShowAIChat(false);
            setAISelectedEntity(undefined);
            setAIInitialPrompt('');
            setAIMode('chat');
          }}
          onUpdateEntities={setEntities}
          onUpdateFlows={setFlows}
          onSaveToHistory={saveToHistory}
          initialMode={aiMode}
          initialPrompt={aiInitialPrompt}
          selectedEntity={aiSelectedEntity}
        />
      )}

      {/* Flow Details Bottom Panel */}
      {selectedFlow && showFlowDetails && (
        <FlowDetailsBottomPanel 
          flow={selectedFlow} 
          entities={entities} 
          onUpdate={updatedFlow => {
            setFlows(prev => prev.map(f => f.id === updatedFlow.id ? updatedFlow : f));
            setSelectedFlow(updatedFlow);
            saveToHistory();
          }} 
          onDelete={() => deleteFlow(selectedFlow.id)} 
          onClose={() => {
            setShowFlowDetails(false);
            setSelectedFlow(null);
          }} 
        />
      )}

      {/* Value Exchange Popup */}
      {showValueExchange && (
        <ValueExchangePopup 
          entities={entities} 
          flows={flows} 
          onClose={() => setShowValueExchange(false)} 
        />
      )}

      {/* Entity Details Popup */}
      {selectedEntity && showEntityDetails && (
        <EntityDetailsPopup 
          entity={selectedEntity} 
          onUpdate={updatedEntity => {
            setEntities(prev => prev.map(e => e.id === updatedEntity.id ? updatedEntity : e));
            setSelectedEntity(updatedEntity);
            saveToHistory();
          }} 
          onDelete={() => deleteEntity(selectedEntity.id)} 
          onClose={() => {
            setShowEntityDetails(false);
            setSelectedEntity(null);
          }}
        />
      )}
      </div>
    </>
  );
};

export default BusinessModelCanvas;
