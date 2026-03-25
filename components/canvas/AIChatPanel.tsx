'use client';
// v2.0 - Fixed markdown parsing for Gemini responses

import React, { useState, useRef, useEffect } from 'react';
import { Entity, Flow, Message } from '@/lib/types/canvas';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, X, Send, Minimize2, Sparkles, TrendingUp, Zap, MessageSquare, Trash2 } from 'lucide-react';
import { createActionExecutor } from '@/lib/utils/actionExecutor';
import { isOpenAIConfigured } from '@/lib/openai';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import { AIMode, generateEcosystemPrompt, generateExpansionPrompt, generateAnalysisPrompt, generateChatPrompt } from '@/lib/services/aiService';
import { parseAIResponse, executeAIActions } from '@/lib/services/aiExecutor';

interface AIChatPanelProps {
  entities: Entity[];
  flows: Flow[];
  onClose: () => void;
  onUpdateEntities: React.Dispatch<React.SetStateAction<Entity[]>>;
  onUpdateFlows: React.Dispatch<React.SetStateAction<Flow[]>>;
  onSaveToHistory: () => void;
  initialMode?: AIMode;
  initialPrompt?: string;
  selectedEntity?: Entity;
}

const CHAT_HISTORY_KEY = 'business-guru-chat-history';

const AIChatPanel: React.FC<AIChatPanelProps> = ({
  entities,
  flows,
  onClose,
  onUpdateEntities,
  onUpdateFlows,
  onSaveToHistory,
  initialMode = 'chat',
  initialPrompt = '',
  selectedEntity
}) => {
  const [aiMode, setAIMode] = useState<AIMode>(initialMode);
  const [inputValue, setInputValue] = useState(initialPrompt);

  // Load messages from localStorage on mount
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(CHAT_HISTORY_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.error('Failed to load chat history:', e);
      }
    }
    // Default welcome message if no history
    return [
      {
        id: '1',
        role: 'assistant',
        content: "Hello! I'm the Business Guru. Think of me as your strategic partner from Harvard and Y Combinator. I'll help you build and analyze your business model. Let's start by generating a model for a company like 'Tesla', or you can 'clear all' to begin fresh.",
        timestamp: Date.now()
      }
    ];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      try {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
      } catch (e) {
        console.error('Failed to save chat history:', e);
      }
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      // Cap the height to a max of 8rem (128px)
      const maxHeight = 128;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [inputValue]);

  const clearHistory = () => {
    const initialMessage: Message = {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm the Business Guru. Think of me as your strategic partner from Harvard and Y Combinator. I'll help you build and analyze your business model. Let's start by generating a model for a company like 'Tesla', or you can 'clear all' to begin fresh.",
      timestamp: Date.now()
    };
    setMessages([initialMessage]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CHAT_HISTORY_KEY);
    }
  };

  const callAI = async (prompt: string, mode: AIMode = 'chat') => {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        prompt,
        entities,
        flows,
        selectedEntity,
        chatHistory: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'AI request failed');
    }

    const data = await response.json();
    return data.response;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Handle direct commands first (no API key needed)
      const directActions = getDirectActions(userMessage.content, entities, flows);
      if (directActions.length > 0) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: getDirectActionMessage(userMessage.content, directActions),
          timestamp: Date.now()
        };

        setMessages(prev => [...prev, aiMessage]);
        await executeActions(directActions);
        setIsLoading(false);
        return;
      }

      // Call AI with appropriate mode
      const aiResponse = await callAI(userMessage.content, aiMode);

      console.log('🔍 AI Response received, length:', aiResponse.length);
      console.log('🔍 First 300 chars:', aiResponse.substring(0, 300));

      // Try to parse actions from AI response
      const { actions, rawMessage } = parseAIResponse(aiResponse);

      console.log('🔍 Parse result - actions:', actions?.length || 0, 'rawMessage:', rawMessage ? 'present' : 'none');

      if (actions && actions.length > 0) {
        console.log('✅ Executing', actions.length, 'actions');
        // Execute AI-generated actions
        const executionMessages = executeAIActions({
          actions,
          entities,
          flows,
          onUpdateEntities,
          onUpdateFlows,
        });

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: executionMessages.length > 0
            ? `✅ ${executionMessages.join('\n')}`
            : "Done! I've updated the canvas.",
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMessage]);
        onSaveToHistory();
      } else {
        // Show AI message as-is
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: rawMessage || aiResponse,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error: any) {
      console.error('Chat error:', error);

      // Provide more specific error messages
      let errorContent = `I'm sorry, something went wrong. Error: ${error.message}`;

      if (error.message?.includes('fetch')) {
        errorContent = `I couldn't connect to the AI service. Please check your internet connection and try again.`;
      } else if (error.message?.includes('angle') || error.message?.includes('position')) {
        errorContent = `There was an issue positioning the entities. This has been logged and should be fixed now. Please try again.`;
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeActions = async (actions: any[]) => {
    const executor = createActionExecutor({
      entities,
      flows,
      onAddEntity: (entity: Entity) => onUpdateEntities(prev => [...prev, entity]),
      onUpdateEntity: (updatedEntity: Entity) => onUpdateEntities(prev => prev.map(e => e.id === updatedEntity.id ? updatedEntity : e)),
      onDeleteEntity: (id: string) => onUpdateEntities(prev => prev.filter(e => e.id !== id)),
      onAddFlow: (flow: Flow) => onUpdateFlows(prev => [...prev, flow]),
      onUpdateFlow: (updatedFlow: Flow) => onUpdateFlows(prev => prev.map(f => f.id === updatedFlow.id ? updatedFlow : f)),
      onDeleteFlow: (id: string) => onUpdateFlows(prev => prev.filter(f => f.id !== id)),
      onApplyModel: (model: { entities: Entity[]; flows: Flow[] }) => {
        onUpdateEntities(model.entities);
        onUpdateFlows(model.flows);
      },
    });
    await executor.executeActions(actions);
    onSaveToHistory();
  };

  // Helper functions
  function getDirectActions(message: string, entities: any[], flows: any[]): any[] {
    const lowerMessage = message.toLowerCase().trim();

    if (
      lowerMessage === "clear all" ||
      lowerMessage === "delete all" ||
      lowerMessage === "clear the board" ||
      lowerMessage === "clear canvas" ||
      lowerMessage === "clear" ||
      (lowerMessage.includes("clear") && (lowerMessage.includes("board") || lowerMessage.includes("canvas")))
    ) {
      const actions = [];
      entities.forEach((entity) => {
        actions.push({ type: "delete_entity", data: { id: entity.id } });
      });
      flows.forEach((flow) => {
        actions.push({ type: "delete_flow", data: { id: flow.id } });
      });
      return actions;
    }

    if (lowerMessage.includes("add customer") && !entities.some(e => e.type === "customer")) {
      return [{
        type: "add_entity",
        data: {
          name: "Customers",
          type: "customer",
          description: "Target market and end users",
          x: 800,
          y: 300
        }
      }];
    }

    return [];
  }

  function getDirectActionMessage(message: string, actions: any[]): string {
    const lowerMessage = message.toLowerCase().trim();

    if (lowerMessage.includes("clear")) {
      return "Canvas cleared! Ready to start fresh. What would you like to create?";
    }

    if (lowerMessage.includes("add customer")) {
      return "Added customers to your canvas! They're a key stakeholder in any business model.";
    }

    return "Action completed!";
  }

  function analyzeCanvas(entities: any[], flows: any[]) {
    const analysis = {
      entityCount: entities?.length || 0,
      flowCount: flows?.length || 0,
      hasRevenue: flows?.some((f) => f.type === "money" && f.label.toLowerCase().includes("revenue")) || false,
      hasCustomers: entities?.some((e) => e.type === "customer") || false,
      hasSuppliers: entities?.some((e) => e.type === "supplier") || false,
      hasPartners: entities?.some((e) => e.type === "partner") || false,
      suggestions: []
    };

    if (!analysis.hasCustomers) {
      analysis.suggestions.push("Add customers - who pays for your products/services?");
    }
    if (!analysis.hasRevenue && analysis.hasCustomers) {
      analysis.suggestions.push("Connect customers to revenue flows");
    }

    return analysis;
  }

  function formatCanvasState(entities: any[], flows: any[], analysis: any) {
    if (!entities || entities.length === 0) {
      return "CANVAS IS EMPTY - Ready to create a business model!";
    }

    let state = `CANVAS CONTAINS ${entities.length} entities:\n`;
    entities.forEach((entity) => {
      state += `- ${entity.name} (${entity.type})\n`;
    });

    if (flows && flows.length > 0) {
      state += `\nAND ${flows.length} flows:\n`;
      flows.forEach((flow) => {
        const sourceEntity = entities.find(e => e.id === flow.sourceId);
        const targetEntity = entities.find(e => e.id === flow.targetId);
        state += `- ${flow.label} (${flow.type}): ${sourceEntity?.name} → ${targetEntity?.name}\n`;
      });
    }

    if (analysis.suggestions.length > 0) {
      state += `\nSUGGESTIONS: ${analysis.suggestions.join(', ')}`;
    }

    return state;
  }

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out"
      style={{
        transform: isMinimized ? 'translateY(calc(100% - 60px))' : 'translateY(0)',
      }}
    >
      <Card className="w-[400px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
            style={{ height: isMinimized ? '60px' : 'calc(min(600px, 80vh))' }}>
        <CardHeader className="bg-white p-4 flex-row items-center justify-between border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <Brain size={20} className="text-white" />
            </div>
            <div>
              <CardTitle className="text-gray-900 text-lg font-semibold">Business Guru</CardTitle>
              {!isMinimized && <p className="text-gray-500 text-xs">AI Canvas Assistant</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!isMinimized && (
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 h-7 w-7 rounded-full"
                onClick={clearHistory}
                title="Clear chat history"
              >
                <Trash2 size={14} />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 h-7 w-7 rounded-full"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <Minimize2 size={14} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 h-7 w-7 rounded-full"
              onClick={onClose}
            >
              <X size={14} />
            </Button>
          </div>
        </CardHeader>

        {/* AI Mode Selector */}
        {!isMinimized && (
          <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100 flex gap-1 flex-shrink-0">
            <button
              onClick={() => setAIMode('chat')}
              className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                aiMode === 'chat'
                  ? 'bg-white shadow-sm text-blue-600'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <MessageSquare className="w-3 h-3 inline mr-1" />
              Chat
            </button>
            <button
              onClick={() => setAIMode('generate')}
              className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                aiMode === 'generate'
                  ? 'bg-white shadow-sm text-purple-600'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <Zap className="w-3 h-3 inline mr-1" />
              Generate
            </button>
            <button
              onClick={() => setAIMode('analyze')}
              className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                aiMode === 'analyze'
                  ? 'bg-white shadow-sm text-green-600'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <TrendingUp className="w-3 h-3 inline mr-1" />
              Analyze
            </button>
          </div>
        )}

        {!isMinimized && (
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md'
                    }`}
                  >
                    <div className="prose prose-sm max-w-none prose-p:mb-2 prose-headings:my-2 prose-ul:my-2">
                      <ReactMarkdown
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-xl font-bold" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-lg font-bold" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-base font-semibold" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1" {...props} />,
                          li: ({node, ...props}) => <li className="pl-1" {...props} />,
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                        }}
                      >{message.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 p-3 rounded-2xl rounded-bl-md max-w-[85%]">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-white flex-shrink-0">
              <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e as any);
                    }
                  }}
                  placeholder="Ask about your business model..."
                  className="flex-1 rounded-2xl border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none overflow-y-auto"
                  rows={1}
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-full bg-blue-500 hover:bg-blue-600 text-white p-2 w-9 h-9 flex items-center justify-center flex-shrink-0"
                  disabled={!inputValue.trim() || isLoading}
                >
                  <Send size={14} />
                </Button>
              </form>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default AIChatPanel;
