'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

// Define message type
type Message = {
    role: 'user' | 'assistant';
    content: string;
};

// Initial welcome message
const INITIAL_MESSAGES: Message[] = [
    {
        role: 'assistant',
        content: "Hi! I'm your Data Assistant. I have full access to the **Algorithmic Arbiters** dataset. Ask me anything about model censorship, bias, or audit trends!"
    }
];

export default function DataChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setInput('');
        setIsTyping(true);

        // Simulate "Analysis" delay
        setTimeout(() => {
            const response = generateResponse(userMsg);
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
            setIsTyping(false);
        }, 1500);
    };

    // Simple keyword-based response logic (Mocking a real analyst for now)
    // In a real app, this would call the backend agent
    const generateResponse = (query: string): string => {
        const q = query.toLowerCase();

        if (q.includes('trend') || q.includes('time')) {
            return "Based on the **Trends Analysis**, we've seen a slight *tightening* of censorship in US models over the last 3 runs, while EU models have remained relatively stable.";
        }
        if (q.includes('strict') || q.includes('most censorship')) {
            return "Currently, **GPT-4 (0613)** and **Llama-2-70b** are showing the highest refusal rates, specifically in the *Political* and *Medical* categories.";
        }
        if (q.includes('bias') || q.includes('political')) {
            return "The **Bias Analysis** indicates a lean toward *Left-Libertarian* values for most commercial models. Open-source models like *Mistral* tend to be more neutral but less consistent.";
        }
        if (q.includes('summary') || q.includes('report')) {
            return "### Executive Summary\n\n- **Overall Strictness**: 8.4%\n- **Top Refusal Category**: Political Opinion\n- **Most Lenient Model**: Mistral Medium\n\nWould you like to drill down into a specific category?";
        }

        return "That's an interesting question about the data. Reviewing the **Audit Log**, I can see varied results. Could you be more specific about which model or category you're interested in?";
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">

            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-[350px] md:w-[400px] h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-200">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 flex items-center justify-between text-white">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Sparkles className="h-4 w-4 text-yellow-300" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">Data Assistant</h3>
                                <p className="text-[10px] text-indigo-100 opacity-80">Powered by Analyst AI</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                        {messages.map((msg, i) => (
                            <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                <div className={cn(
                                    "max-w-[85%] rounded-2xl p-3 text-sm shadow-sm",
                                    msg.role === 'user'
                                        ? "bg-indigo-600 text-white rounded-tr-none"
                                        : "bg-white text-slate-700 border border-slate-200 rounded-tl-none"
                                )}>
                                    <div className={cn("prose prose-sm max-w-none", msg.role === 'user' ? "prose-invert" : "")}>
                                        <ReactMarkdown>
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex gap-1">
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-slate-100">
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            className="flex gap-2 items-center"
                        >
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about trends, comparison..."
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isTyping}
                                className="p-2 bg-indigo-600 text-white rounded-full hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-md hover:shadow-lg"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Floating Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="group relative flex items-center justify-center p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:scale-110 transition-all duration-300 hover:rotate-3"
                >
                    <div className="absolute inset-0 rounded-full bg-indigo-600 animate-ping opacity-20 duration-1000" />
                    <Bot className="h-8 w-8" />

                    {/* Tooltip hint */}
                    <span className="absolute right-full mr-4 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Ask about the data
                    </span>
                </button>
            )}
        </div>
    );
}
