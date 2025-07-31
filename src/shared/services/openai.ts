// src/shared/services/openai.ts - RONBot with graceful API key handling
import OpenAI from 'openai';
import {RONBOT_SYSTEM_PROMPT, RONBOT_CONFIG} from '../config/ronbotPrompt';

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
                content: RONBOT_SYSTEM_PROMPT // Now using imported constant
            };

            const response = await openai!.chat.completions.create({
                model: RONBOT_CONFIG.model,
                messages: [systemPrompt, ...messages],
                max_completion_tokens: RONBOT_CONFIG.maxTokens,
                temperature: RONBOT_CONFIG.temperature,
                presence_penalty: RONBOT_CONFIG.presencePenalty,
                frequency_penalty: RONBOT_CONFIG.frequencyPenalty
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
