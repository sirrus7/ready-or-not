// src/shared/hooks/useOpenAI.ts - Graceful handling for missing API keys
import {useState, useCallback, useRef} from 'react';
import {openAIService, ChatMessage} from '../services/openai';

export const useOpenAI = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesRef = useRef<ChatMessage[]>([]);

    // Check if OpenAI is available
    const isAvailable = openAIService.isAvailable();
    const status = openAIService.getStatus();

    const sendMessage = useCallback(async (message: string): Promise<string> => {
        // Early return if OpenAI is not available
        if (!isAvailable) {
            const errorMessage = 'RONBot is not available. OpenAI API key is not configured.';
            setError(errorMessage);
            throw new Error(errorMessage);
        }

        setIsLoading(true);
        setError(null);

        try {
            // Add the new user message to conversation history
            const userMessage: ChatMessage = {role: 'user', content: message};
            messagesRef.current = [...messagesRef.current, userMessage];

            // Get response from RONBot
            const response = await openAIService.chatWithRONBot(messagesRef.current);

            // Add the assistant response to conversation history
            const assistantMessage: ChatMessage = {role: 'assistant', content: response};
            messagesRef.current = [...messagesRef.current, assistantMessage];

            // Keep conversation history manageable (last 10 messages = 5 exchanges)
            if (messagesRef.current.length > 10) {
                messagesRef.current = messagesRef.current.slice(-10);
            }

            return response;
        } catch (err) {
            let errorMessage = 'Failed to get response from RONBot';

            if (err instanceof Error) {
                if (err.message.includes('API key')) {
                    errorMessage = 'OpenAI API key is not configured. RONBot features are disabled.';
                } else if (err.message.includes('rate limit')) {
                    errorMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
                } else if (err.message.includes('timeout')) {
                    errorMessage = 'Request timed out. Please try again.';
                } else if (err.message.includes('insufficient_quota')) {
                    errorMessage = 'OpenAI quota exceeded. Please check your billing settings.';
                } else {
                    errorMessage = err.message;
                }
            }

            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [isAvailable]);

    const clearConversation = useCallback(() => {
        messagesRef.current = [];
        setError(null);
    }, []);

    const testConnection = useCallback(async (): Promise<boolean> => {
        if (!isAvailable) {
            setError('OpenAI API key not configured');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            const isConnected = await openAIService.testConnection();
            if (!isConnected) {
                setError('Failed to connect to OpenAI API');
            }
            return isConnected;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Connection test failed';
            setError(errorMessage);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [isAvailable]);

    return {
        sendMessage,
        clearConversation,
        testConnection,
        isLoading,
        error,
        isAvailable,      // New: Whether OpenAI is available
        status,           // New: Configuration status
        clearError: () => setError(null)
    };
};
