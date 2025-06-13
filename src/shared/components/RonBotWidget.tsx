import React, {useState, useEffect, useRef} from 'react';
import {MessageCircle, X, Send, Loader2} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {useOpenAI} from '../hooks/useOpenAI';

interface ChatMessage {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
}

const RonBotWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const {sendMessage, clearConversation, isLoading, error, isAvailable, status} = useOpenAI();

    // Initialize welcome message
    useEffect(() => {
        const welcomeMessage: ChatMessage = {
            id: 'welcome',
            text: isAvailable
                ? "Hi! I'm RonBot 🤖 Your AI assistant for Ready or Not. How can I help you today?"
                : "RonBot AI Assistant is currently unavailable (API key not configured).",
            isUser: false,
            timestamp: new Date()
        };
        setMessages([welcomeMessage]);
    }, [isAvailable]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
    }, [messages]);

    // Track new messages for notification
    useEffect(() => {
        if (!isOpen && messages.length > 1) {
            const lastMessage = messages[messages.length - 1];
            if (!lastMessage.isUser) {
                setHasNewMessage(true);
            }
        }
    }, [messages, isOpen]);

    const toggleWidget = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setHasNewMessage(false);
        }
    };

    // Remove maximize functionality completely
    // No openInNewTab function needed

    const handleSendMessage = async () => {
        if (!inputText.trim() || isLoading || !isAvailable) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            text: inputText.trim(),
            isUser: true,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');

        try {
            const response = await sendMessage(userMessage.text);

            const botMessage: ChatMessage = {
                id: `bot-${Date.now()}`,
                text: response,
                isUser: false,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('RonBot Error:', error);
            const errorMessage: ChatMessage = {
                id: `error-${Date.now()}`,
                text: error instanceof Error
                    ? error.message
                    : 'Sorry, I encountered an error. Please try again.',
                isUser: false,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const clearChat = () => {
        clearConversation();
        const welcomeMessage: ChatMessage = {
            id: 'welcome-new',
            text: "Chat cleared! How can I help you?",
            isUser: false,
            timestamp: new Date()
        };
        setMessages([welcomeMessage]);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {/* Chat Widget */}
            {isOpen && (
                <div
                    className="absolute bottom-16 right-0 w-[420px] h-[600px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50"
                    style={{
                        maxWidth: 'calc(100vw - 2rem)',
                        maxHeight: '85vh'
                    }}
                >
                    {/* Header */}
                    <div className={`p-4 flex items-center justify-between text-white ${
                        isAvailable ? 'bg-slate-700' : 'bg-orange-600'
                    }`}>
                        <div className="flex items-center space-x-2">
                            <MessageCircle size={20}/>
                            <span className="font-semibold text-sm">
                                RonBot AI Assistant {!isAvailable && '(Unavailable)'}
                            </span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={toggleWidget}
                                className="p-1 hover:bg-white/20 rounded transition-colors"
                                title="Close chat"
                            >
                                <X size={16}/>
                            </button>
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-50 border-b border-red-200 p-3">
                            <p className="text-sm text-red-800">⚠️ {error}</p>
                        </div>
                    )}

                    {/* Unavailable Notice */}
                    {!isAvailable && !error && (
                        <div className="bg-orange-50 border-b border-orange-200 p-3">
                            <p className="text-sm text-orange-800 text-center">
                                🤖 {status.error || 'RonBot AI Assistant is temporarily unavailable.'}
                            </p>
                        </div>
                    )}

                    {/* Messages */}
                    <div
                        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
                        style={{height: '420px'}}
                    >
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className="flex flex-col max-w-[85%]">
                                    <div
                                        className={`rounded-2xl px-4 py-2 break-words ${
                                            message.isUser
                                                ? 'bg-slate-600 text-white'
                                                : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                                        }`}
                                    >
                                        {message.isUser ? (
                                            <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                                {message.text}
                                            </div>
                                        ) : (
                                            <div className="text-sm prose prose-sm max-w-none">
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({children}) => <p
                                                            className="mb-2 leading-relaxed">{children}</p>,
                                                        ul: ({children}) => <ul
                                                            className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                                                        ol: ({children}) => <ol
                                                            className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                                                        li: ({children}) => <li className="text-sm">{children}</li>,
                                                        strong: ({children}) => <strong
                                                            className="font-semibold text-gray-900">{children}</strong>,
                                                        em: ({children}) => <em className="italic">{children}</em>,
                                                        h1: ({children}) => <h1
                                                            className="text-lg font-semibold mb-2">{children}</h1>,
                                                        h2: ({children}) => <h2
                                                            className="text-base font-semibold mb-2">{children}</h2>,
                                                        h3: ({children}) => <h3
                                                            className="text-sm font-semibold mb-1">{children}</h3>,
                                                    }}
                                                >
                                                    {message.text}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        className={`text-xs mt-1 ${
                                            message.isUser
                                                ? 'text-right text-slate-600'
                                                : 'text-left text-gray-500'
                                        }`}
                                    >
                                        {formatTime(message.timestamp)}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Loading indicator */}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div
                                    className="bg-white border border-gray-200 shadow-sm rounded-2xl px-4 py-3 max-w-[85%]">
                                    <div className="flex items-center space-x-2">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
                                                 style={{animationDelay: '0.1s'}}></div>
                                            <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
                                                 style={{animationDelay: '0.2s'}}></div>
                                        </div>
                                        <span className="text-sm text-gray-600">
                                            RonBot is thinking...
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef}/>
                    </div>

                    {/* Input Area */}
                    <div className="border-t border-gray-200 p-4 bg-white">
                        <div className="flex space-x-2 items-end">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder={isAvailable ? "Ask RonBot anything..." : "RonBot unavailable"}
                                className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                rows={1}
                                style={{minHeight: '40px', maxHeight: '100px'}}
                                disabled={isLoading || !isAvailable}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputText.trim() || isLoading || !isAvailable}
                                className="bg-slate-600 hover:bg-slate-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center min-w-[44px] h-[40px]"
                            >
                                {isLoading ? (
                                    <Loader2 size={16} className="animate-spin"/>
                                ) : (
                                    <Send size={16}/>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Clear Chat */}
                    {isAvailable && (
                        <div className="border-t border-gray-200 p-2 bg-gray-50">
                            <div className="flex justify-center">
                                <button
                                    onClick={clearChat}
                                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors px-3 py-1 rounded hover:bg-gray-100"
                                    disabled={isLoading}
                                >
                                    Clear chat
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Floating Button */}
            <button
                onClick={toggleWidget}
                className={`relative w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center text-white group ${
                    isAvailable
                        ? 'bg-slate-600 hover:bg-slate-700'
                        : 'bg-orange-600 hover:bg-orange-700'
                }`}
            >
                <MessageCircle
                    size={24}
                    className="transition-transform group-hover:scale-110"
                />

                {/* Notification Dot */}
                {hasNewMessage && !isOpen && (
                    <div
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                )}

                {/* Tooltip */}
                <div
                    className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {isAvailable ? 'Chat with RonBot AI Assistant' : 'RonBot AI Assistant (Unavailable)'}
                    <div
                        className="absolute top-1/2 -right-1 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-gray-900 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
                </div>
            </button>
        </div>
    );
};

export default RonBotWidget;
