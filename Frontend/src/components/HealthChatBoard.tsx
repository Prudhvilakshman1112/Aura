import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Loader2,
  Heart,
  Activity
} from "lucide-react";

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const HealthChatBoard = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your Health Query Assistant. I can help you with questions about nutrition, exercise, sleep, and general health based on your physical metrics. What would you like to know?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/physical-coach/health-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: userMessage.content
        })
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: 'I apologize, but I\'m having trouble processing your request right now. Please try again in a moment.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Health chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I\'m experiencing some technical difficulties. Please check your connection and try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[600px] bg-gray-900/95 dark:bg-gray-900/95 rounded-xl border border-gray-700/50 dark:border-gray-700/50">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-physical flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Health Assistant</h3>
            <p className="text-xs text-gray-300">Powered by your physical metrics</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-green-400" />
          <span className="text-xs text-green-400">Online</span>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-2 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.type === 'user' 
                    ? 'bg-gradient-physical' 
                    : 'bg-gradient-to-br from-blue-500 to-purple-600'
                }`}>
                  {message.type === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className={`rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-gradient-physical text-white'
                    : 'bg-gray-800/80 border border-gray-600/50 text-white'
                }`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <p className={`text-xs mt-2 ${
                    message.type === 'user' 
                      ? 'text-white/70' 
                      : 'text-gray-300'
                  }`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2 max-w-[80%]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-800/80 border border-gray-600/50 rounded-2xl px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    <span className="text-sm text-white">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Chat Input */}
      <div className="p-4 border-t border-gray-700/50">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about nutrition, exercise, sleep, or health advice..."
              className="pr-12 bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-blue-400 focus:bg-gray-800/70"
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-gradient-physical hover:opacity-90 px-4"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {/* Quick Suggestions */}
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            "What's my ideal daily calorie intake?",
            "Suggest exercises for my BMI",
            "How can I improve my sleep?",
            "Healthy snack recommendations"
          ].map((suggestion, index) => (
            <button
              key={index}
              onClick={() => setInputMessage(suggestion)}
              className="text-xs px-3 py-1 rounded-full bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white transition-colors"
              disabled={isLoading}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HealthChatBoard;
