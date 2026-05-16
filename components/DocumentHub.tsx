'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { GoogleGenAI } from '@google/genai';
import { UploadCloud, FileText, Send, X, MessageSquare, Loader2, Maximize2, Minimize2, PanelRightClose, PanelRightOpen, Cpu } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Message = {
  role: 'user' | 'model';
  content: string;
};

export function DocumentHub() {
  const [isOpen, setIsOpen] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [pdfText, setPdfText] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Hello! I'm your document assistant. Upload a PDF, and I can summarize it or answer your questions while you interact with the avatar." }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setPdfText(null);
    setMessages(prev => [...prev, { role: 'user', content: `Uploaded document: ${file.name}` }]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to parse PDF');
      }

      const data = await response.json();
      setPdfText(data.text);
      
      setMessages(prev => [...prev, { role: 'model', content: `Successfully loaded **${file.name}** (${data.numpages} pages). What would you like to know about it?` }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: 'Sorry, there was an error processing the PDF.' }]);
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  });

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputVal.trim() || isGenerating) return;

    const userMessage = inputVal;
    setInputVal('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsGenerating(true);

    try {
      let aiContext = '';
      if (pdfText) {
        // Provide the document context
        aiContext = `Here is the context of the currently uploaded document:\n\n---\n${pdfText.substring(0, 30000)}\n---\n\n`; // Trimming for safety though 2.5 flash has huge context, just in case.
      }

      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API key is missing.");

      const ai = new GoogleGenAI({ apiKey });
      
      // Build conversation history for the model payload
      const contents = messages.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));
      
      // Append context logic secretly in the latest user message prompt
      const finalPrompt = aiContext + userMessage;
      // We don't want to show the giant context to the UI in `messages`, so we only pass it to the API.

      contents.push({ role: 'user', parts: [{ text: finalPrompt }] });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
      });

      const responseText = response.text || "I couldn't generate a response.";
      setMessages(prev => [...prev, { role: 'model', content: responseText }]);

    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: error.message || 'An error occurred talking to Gemini.' }]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "absolute top-6 right-6 z-50 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg transition-transform hover:bg-white/20 active:scale-95",
          isOpen && "translate-x-4 opacity-0 pointer-events-none"
        )}
        aria-label="Open Document Hub"
      >
        <PanelRightOpen size={24} />
      </button>

      {/* Floating Panel */}
      <div
        className={cn(
          "absolute top-6 right-6 bottom-6 w-96 flex flex-col bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl z-40 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden",
          isOpen ? "translate-x-0 opacity-100" : "translate-x-[110%] opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2 text-white">
            <Cpu size={20} className="text-blue-400" />
            <h2 className="font-semibold tracking-tight text-lg">AI Document Hub</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 -mr-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            suppressHydrationWarning
          >
            <PanelRightClose size={20} />
          </button>
        </div>

        {/* Upload Zone */}
        <div className="px-6 pt-6 pb-2">
          <div
            {...getRootProps()}
            className={cn(
              "group relative overflow-hidden rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-300",
              isDragActive ? "border-blue-500 bg-blue-500/10" : "border-white/10 hover:border-white/20 hover:bg-white/5"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-white/5 text-white/70 group-hover:bg-white/10 group-hover:text-white group-hover:scale-110 transition-all">
                {isUploading ? <Loader2 className="animate-spin" size={24} /> : <UploadCloud size={24} />}
              </div>
              <div>
                <p className="text-sm font-medium text-white/90">
                  {isUploading ? 'Parsing PDF...' : 'Drop a PDF or click to browse'}
                </p>
                <p className="text-xs text-white/50 mt-1">Read by AI alongside your avatar</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === 'user' 
                  ? "bg-blue-600 border border-blue-500 text-white self-end rounded-tr-sm shadow-md" 
                  : "bg-white/10 border border-white/5 text-white/90 self-start rounded-tl-sm shadow-sm"
              )}
            >
              {msg.role === 'model' && (
                <div className="flex items-center gap-2 mb-1.5 opacity-60 text-xs">
                  <Cpu size={12} /> AI Reader
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          ))}
          {isGenerating && (
            <div className="bg-white/10 border border-white/5 text-white/90 self-start rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 w-fit">
              <Loader2 className="animate-spin" size={16} />
              <span className="text-sm opacity-80">Thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white/5 border-t border-white/10">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={pdfText ? "Ask about the document..." : "Type a message..."}
              className="w-full bg-black/40 border border-white/10 text-white text-sm rounded-full pl-5 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-white/30"
              disabled={isGenerating || isUploading}
              suppressHydrationWarning
            />
            <button
              type="submit"
              disabled={!inputVal.trim() || isGenerating}
              className="absolute right-2 p-2 rounded-full text-blue-400 hover:text-white hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-blue-400 transition-colors"
              suppressHydrationWarning
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
