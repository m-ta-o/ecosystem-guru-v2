import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateEcosystemPrompt, generateExpansionPrompt, generateAnalysisPrompt, generateChatPrompt } from '@/lib/services/aiService';
// Debug mode: Full response logging enabled

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, prompt, entities, flows, selectedEntity, chatHistory } = body;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Set GEMINI_API_KEY in your .env.local file.' },
        { status: 500 }
      );
    }

    let userPrompt = prompt;

    // Generate appropriate prompt based on mode
    switch (mode) {
      case 'generate':
        userPrompt = generateEcosystemPrompt(prompt, { entities, flows });
        break;
      case 'expand':
        if (selectedEntity) {
          userPrompt = generateExpansionPrompt(selectedEntity, { entities, flows });
        }
        break;
      case 'analyze':
        userPrompt = generateAnalysisPrompt(entities, flows);
        break;
      case 'chat':
        userPrompt = generateChatPrompt(prompt, entities, flows, chatHistory || []);
        break;
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `You are an expert business ecosystem architect and strategic advisor. Provide clear, actionable insights.\n\n${userPrompt}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8000,  // High limit to account for Gemini's internal thinking tokens
      },
    });

    const response = result.response.text();

    console.log('=== GEMINI RESPONSE START ===');
    console.log('Length:', response.length);
    console.log('Full response:', response);
    console.log('=== GEMINI RESPONSE END ===');

    return NextResponse.json({ response, success: true });
  } catch (error: any) {
    console.error('AI API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate AI response' },
      { status: 500 }
    );
  }
}
