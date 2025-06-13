// src/shared/services/openai.ts - RONBot with graceful API key handling
import OpenAI from 'openai';

// Check if API key is available
const hasApiKey = !!import.meta.env.VITE_OPENAI_API_KEY;

// Initialize OpenAI client only if API key is present
const openai = hasApiKey ? new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
}) : null;

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export const openAIService = {
    // Check if OpenAI is available
    isAvailable(): boolean {
        return hasApiKey && openai !== null;
    },

    // Get configuration status for display
    getStatus(): { available: boolean; error?: string } {
        if (!import.meta.env.VITE_OPENAI_API_KEY) {
            return {
                available: false,
                error: 'OpenAI API key not configured. RONBot features are disabled.'
            };
        }
        return {available: true};
    },

    // Main chat method for RONBot
    async chatWithRONBot(messages: ChatMessage[]): Promise<string> {
        if (!this.isAvailable()) {
            throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your environment variables.');
        }

        try {
            const systemPrompt: ChatMessage = {
                role: 'system',
                content: `You are RonBot, the Ready or Not FAQ & Troubleshooting Assistant. You have comprehensive knowledge of the Ready or Not business simulation game.

Ready or Not is a web-based business simulation where teams compete to maximize their company's net income through strategic decision-making across multiple rounds.

Key areas you help with:
- Game setup: Creating sessions, configuring teams, setting up rooms
- Team management: Player organization, team codes, joining processes  
- Presentation display: Projector setup, full-screen mode, slide navigation
- Game mechanics: Investment decisions, challenge responses, KRI tracking
- Troubleshooting: Connection issues, login problems, display issues
- Materials: Handout printing, physical game components
- Hosting tips: Best practices, timing, facilitation guidance

Guidelines:
- You are RonBot (note: users already know who you are, so don't introduce yourself)
- Be professional, friendly, and thorough
- Provide step-by-step instructions when appropriate
- Give specific troubleshooting steps for technical issues
- Include practical tips from experienced game facilitators
- If unsure about something specific, acknowledge that and provide general guidance
- Keep responses focused on Ready or Not topics
- Aim for helpful, actionable advice that solves problems
- Use markdown formatting in responses: **bold** for emphasis, bullet points for lists
- Structure information clearly with proper paragraphs and spacing

Respond conversationally while maintaining expertise on Ready or Not.`
            };

            const response = await openai!.chat.completions.create({
                model: 'gpt-4',
                messages: [systemPrompt, ...messages],
                max_completion_tokens: 400,
                temperature: 0.3,
                presence_penalty: 0.1,
                frequency_penalty: 0.1
            });

            const content = response.choices[0].message.content;
            if (!content) {
                throw new Error('Empty response from OpenAI');
            }

            return content;
        } catch (error) {
            console.error('Error calling OpenAI Chat:', error);
            throw error;
        }
    },

    // Utility method to test API connection
    async testConnection(): Promise<boolean> {
        if (!this.isAvailable()) {
            return false;
        }

        try {
            const response = await openai!.chat.completions.create({
                model: 'gpt-4',
                messages: [{role: 'user', content: 'Test connection'}],
                max_completion_tokens: 10
            });
            return !!response.choices[0].message.content;
        } catch (error) {
            console.error('OpenAI connection test failed:', error);
            return false;
        }
    }
};
