// src/shared/components/RONBotWidget.tsx - Clean implementation with react-rnd
import React, {useState, useRef, useEffect} from 'react';
import {MessageCircle, Send, X, Minimize2, Loader2, AlertCircle, Move} from 'lucide-react';
import {Rnd} from 'react-rnd';
import {useOpenAI} from '@shared/hooks/useOpenAI';

interface ChatMessage {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
}

const RONBotWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [hasNewMessage, setHasNewMessage] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const {sendMessage, clearConversation, isLoading, error, clearError, isAvailable} = useOpenAI();

    // Initialize welcome message based on availability
    useEffect(() => {
        if (isAvailable) {
            setMessages([{
                id: 'welcome',
                text: "Hi! I'm RONBot 🤖 Your AI assistant for Ready or Not 2.0. I can help with setup, gameplay, troubleshooting, and hosting tips. What can I help you with?",
                isUser: false,
                timestamp: new Date()
            }]);
        } else {
            setMessages([{
                id: 'unavailable',
                text: "RONBot AI Assistant is currently unavailable (API key not configured). The game works normally, but AI chat features are disabled.",
                isUser: false,
                timestamp: new Date()
            }]);
        }
    }, [isAvailable]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && !isMinimized && isAvailable) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, isMinimized, isAvailable]);

    // Show notification dot when there's a new message and widget is closed
    useEffect(() => {
        if (!isOpen && messages.length > 1) {
            setHasNewMessage(true);
        }
    }, [messages, isOpen]);

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
        clearError();

        try {
            const response = await sendMessage(userMessage.text);

            const botMessage: ChatMessage = {
                id: `bot-${Date.now()}`,
                text: response,
                isUser: false,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    };

    const toggleWidget = () => {
        if (isOpen) {
            setIsOpen(false);
            setIsMinimized(false);
        } else {
            setIsOpen(true);
            setIsMinimized(false);
        }
        setHasNewMessage(false);
    };

    const closeWidget = () => {
        setIsOpen(false);
        setIsMinimized(false);
    };

    const minimizeWidget = () => {
        setIsMinimized(!isMinimized);
    };

    const clearChat = () => {
        if (isAvailable) {
            setMessages([{
                id: 'welcome',
                text: "Hi! I'm RONBot 🤖 Your AI assistant for Ready or Not 2.0. I can help with setup, gameplay, troubleshooting, and hosting tips. What can I help you with?",
                isUser: false,
                timestamp: new Date()
            }]);
        } else {
            setMessages([{
                id: 'unavailable',
                text: "RONBot AI Assistant is currently unavailable (API key not configured). The game works normally, but AI chat features are disabled.",
                isUser: false,
                timestamp: new Date()
            }]);
        }
        clearConversation();
        clearError();
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {/* Resizable Chat Widget */}
            {isOpen && (
                <Rnd
                    default={{
                        x: -380, // Position to the left of the button
                        y: -450, // Position above the button
                        width: 380,
                        height: isMinimized ? 70 : 450,
                    }}
                    minWidth={320}
                    minHeight={isMinimized ? 70 : 350}
                    maxWidth={650}
                    maxHeight={700}
                    bounds="parent"
                    dragHandleClassName="ronbot-drag-handle"
                    resizeHandleClasses={{
                        bottomRight: 'ronbot-resize-handle',
                    }}
                    enableResizing={!isMinimized}
                    disableDragging={false}
                >
                    <div
                        className="w-full h-full bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">

                        {/* Header with drag handle */}
                        <div
                            className="ronbot-drag-handle flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-2xl cursor-move">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`p-1.5 rounded-full ${isAvailable ? 'bg-white/20' : 'bg-orange-500/20'}`}>
                                    <MessageCircle size={16} className="text-white"/>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">
                                        RONBot AI Assistant {!isAvailable && '(Unavailable)'}
                                    </h3>
                                    <p className="text-xs opacity-90">
                                        {isAvailable ? 'Ready or Not 2.0 Support' : 'API key not configured'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Move size={14} className="opacity-50"/>
                                {!isMinimized && (
                                    <button
                                        onClick={minimizeWidget}
                                        className="p-1 hover:bg-white/10 rounded transition-colors ml-2"
                                        title="Minimize"
                                    >
                                        <Minimize2 size={14}/>
                                    </button>
                                )}
                                <button
                                    onClick={closeWidget}
                                    className="p-1 hover:bg-white/10 rounded transition-colors"
                                    title="Close"
                                >
                                    <X size={14}/>
                                </button>
                            </div>
                        </div>

                        {!isAvailable && !isMinimized && (
                            <div className="p-3 bg-orange-50 border-b border-orange-200">
                                <div className="flex items-center gap-2 text-orange-800">
                                    <AlertCircle size={14}/>
                                    <span className="text-xs font-medium">RONBot AI Assistant Unavailable</span>
                                </div>
                                <p className="text-xs text-orange-700 mt-1">
                                    OpenAI API key not configured. Game works normally, but AI chat features are
                                    disabled.
                                </p>
                            </div>
                        )}

                        {!isMinimized && (
                            <>
                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3"
                                     style={{height: 'calc(100% - 180px)'}}>
                                    {messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words ${
                                                    message.isUser
                                                        ? 'bg-blue-600 text-white'
                                                        : isAvailable
                                                            ? 'bg-gray-100 text-gray-900'
                                                            : 'bg-orange-50 text-orange-900 border border-orange-200'
                                                }`}
                                            >
                                                <div className="whitespace-pre-wrap leading-relaxed">
                                                    {message.text}
                                                </div>
                                                <div
                                                    className={`text-xs mt-1 opacity-70 ${
                                                        message.isUser ? 'text-blue-100' : 'text-gray-500'
                                                    }`}
                                                >
                                                    {formatTime(message.timestamp)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {isLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-gray-100 rounded-2xl px-3 py-2 flex items-center gap-2">
                                                <Loader2 size={14} className="animate-spin text-gray-500"/>
                                                <span className="text-sm text-gray-500">RONBot is thinking...</span>
                                            </div>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="flex justify-center">
                                            <div
                                                className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-red-700 max-w-full">
                                                <AlertCircle size={14} className="flex-shrink-0"/>
                                                <div className="text-xs">
                                                    <div className="font-medium">Unable to respond</div>
                                                    <div className="text-red-600">{error}</div>
                                                </div>
                                                <button
                                                    onClick={clearError}
                                                    className="ml-1 text-red-500 hover:text-red-700"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div ref={messagesEndRef}/>
                                </div>

                                {/* Input */}
                                <div className="p-4 border-t border-gray-100 flex-shrink-0">
                                    <div className="flex gap-2">
                    <textarea
                        ref={inputRef}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={isAvailable ? "Ask RONBot anything..." : "RONBot unavailable"}
                        className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-500"
                        rows={2}
                        style={{minHeight: '40px', maxHeight: '100px'}}
                        disabled={isLoading || !isAvailable}
                    />
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={!inputText.trim() || isLoading || !isAvailable}
                                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center min-w-[40px] self-start"
                                        >
                                            {isLoading ? (
                                                <Loader2 size={16} className="animate-spin"/>
                                            ) : (
                                                <Send size={16}/>
                                            )}
                                        </button>
                                    </div>

                                    {isAvailable && (
                                        <div className="mt-2 flex justify-center">
                                            <button
                                                onClick={clearChat}
                                                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                            >
                                                Clear chat
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Custom resize handle styling */}
                        <style jsx>{`
                            .ronbot-resize-handle {
                                position: absolute;
                                bottom: 0;
                                right: 0;
                                width: 20px;
                                height: 20px;
                                background: linear-gradient(-45deg, transparent 0%, transparent 40%, #cbd5e1 40%, #cbd5e1 60%, transparent 60%);
                                cursor: nw-resize;
                                border-bottom-right-radius: 16px;
                            }

                            .ronbot-resize-handle:hover {
                                background: linear-gradient(-45deg, transparent 0%, transparent 40%, #94a3b8 40%, #94a3b8 60%, transparent 60%);
                            }
                        `}</style>
                    </div>
                </Rnd>
            )}

            {/* Floating Button */}
            <button
                onClick={toggleWidget}
                className={`relative w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
                    isAvailable
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                        : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                } text-white group`}
            >
                <MessageCircle size={24} className="transition-transform group-hover:scale-110"/>

                {/* Notification Dot */}
                {hasNewMessage && !isOpen && (
                    <div
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                )}

                {/* Tooltip */}
                <div
                    className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {isAvailable ? 'Chat with RONBot AI Assistant' : 'RONBot AI Assistant (Unavailable)'}
                    <div
                        className="absolute top-1/2 -right-1 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-gray-900 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
                </div>
            </button>
        </div>
    );
};

export default RONBotWidget;
