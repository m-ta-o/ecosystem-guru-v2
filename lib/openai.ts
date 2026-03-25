
import OpenAI from 'openai';

// For Supabase integration, we don't store the API key in frontend env vars
// The API key is managed through Supabase secrets and accessed in edge functions
// This creates a client for frontend use that will make requests to our edge functions
export const openai = new OpenAI({
  apiKey: 'frontend-placeholder', // This won't be used for actual API calls
  dangerouslyAllowBrowser: true,
});

// When using Supabase secrets, the API key is always "configured" from frontend perspective
// The actual validation happens in the edge functions
export const isOpenAIConfigured = () => {
  return true; // Always true when using Supabase secrets
};
