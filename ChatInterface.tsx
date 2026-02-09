import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, Copy, Check } from 'lucide-react';
import { ProcessedData } from '../types';
import { createMeetingChatSession } from '../services/geminiService';
import { GenerateContentResponse } from "@google/genai";

interface ChatInterfaceProps {
  data: ProcessedData;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ data }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'init', role: 'model', text: "Hi! I've analyzed the meeting. I can help you draft follow-up emails, create Asana tasks, or answer questions about the discussion." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatSessionRef.current = createMeetingChatSession(data);
  }, [data]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim() || !chatSessionRef.current) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await chatSessionRef.current.sendMessageStream({ message: text });
      
      const botMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: botMsgId, role: 'model', text: '' }]);

      let fullText = '';
      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          fullText += c.text;
          setMessages(prev => 
            prev.map(m => m.id === botMsgId ? { ...m, text: fullText } : m)
          );
        }
      }
    } catch (err) {
      console.error("Chat error", err);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    "Draft a follow-up email to attendees",
    "Create Asana tasks for action items",
    "What were the key decisions?",
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mx-2 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
                {msg.role === 'user' ? <User size={16} className="text-white" /> : <Sparkles size={16} />}
              </div>
              <div className={`p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-gray-100 text-gray-800 rounded-tl-none'
              }`}>
                {msg.text}
                {msg.role === 'model' && msg.text && (
                   <div className="mt-2 flex justify-end">
                       <CopyButton text={msg.text} />
                   </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        
        {messages.length < 3 && (
            <div className="flex gap-2 overflow-x-auto pb-3 mb-1 scrollbar-hide">
                {quickActions.map((action, i) => (
                    <button 
                        key={i}
                        onClick={() => handleSend(action)}
                        className="whitespace-nowrap px-3 py-1.5 bg-white border border-indigo-100 text-indigo-600 text-xs font-medium rounded-full hover:bg-indigo-50 hover:border-indigo-200 transition-colors shadow-sm"
                    >
                        {action}
                    </button>
                ))}
            </div>
        )}

        <div className="relative flex items-center">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask AI to draft an email, create tasks..."
            className="w-full pl-4 pr-12 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-12 min-h-[48px] max-h-32 text-sm shadow-sm"
            disabled={isLoading}
          />
          <button 
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button 
            onClick={handleCopy} 
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Copy text"
        >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
        </button>
    );
};
