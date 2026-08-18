"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  RefreshCw,
  Code2,
  Sliders,
  ChevronDown,
  Bot,
  User,
  Zap,
  Check,
  Copy,
  Terminal,
  Cpu,
  Layers,
  Menu
} from "lucide-react";
import { MOCK_MODELS } from "./AIModelsCatalog";
import CodeDocsModal from "./CodeDocsModal";
import ProviderLogo from "@/components/ProviderLogo";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  modelName?: string;
  timestamp?: string;
}

interface AIPlaygroundViewProps {
  initialModelId?: string;
}

export default function AIPlaygroundView({ initialModelId }: AIPlaygroundViewProps) {
  const [selectedModelId, setSelectedModelId] = useState(
    initialModelId || "gpt-5.6-luna"
  );
  const [systemPrompt, setSystemPrompt] = useState(
    "Add system prompt"
  );
  const [inputPrompt, setInputPrompt] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);

  // Settings
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [topP, setTopP] = useState(0.95);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-1",
      role: "user",
      content: "Draft a launch plan for an AI finance assistant"
    },
    {
      id: "msg-2",
      role: "assistant",
      modelName: "GPT 5.6 LUNA",
      content: "Use VortX to test the prompt against GPT 5.6 Luna, then move the same request shape into your API key when the flow is ready for users."
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialModelId) {
      setSelectedModelId(initialModelId);
    }
  }, [initialModelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const currentModel =
    MOCK_MODELS.find((m) => m.id === selectedModelId) || MOCK_MODELS[0];

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || isStreaming) return;

    const userText = inputPrompt.trim();
    setInputPrompt("");

    const newMsgId = "msg-" + Date.now();
    const userMsg: Message = {
      id: newMsgId,
      role: "user",
      content: userText
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    const assistantMsgId = "resp-" + Date.now();
    const initialAssistantMsg: Message = {
      id: assistantMsgId,
      role: "assistant",
      modelName: currentModel.name,
      content: ""
    };

    setMessages((prev) => [...prev, initialAssistantMsg]);

    const mockResponses = [
      `Menggunakan model **${currentModel.name}** dari provider ${currentModel.provider} (Serverless ${currentModel.region}):\n\nUntuk kebutuhan tersebut, kami merekomendasikan setup pipeline modular dengan caching layer terdistribusi. Latensi rata-rata endpoint ini adalah ${currentModel.speed} dengan throughput maksimum.\n\nContoh payload integrasi:\n\`\`\`json\n{\n  "model": "${currentModel.id}",\n  "temperature": ${temperature},\n  "max_tokens": ${maxTokens}\n}\n\`\`\`\nSemua response terenkripsi dan diverifikasi oleh cluster engine VortX.`,
      `Analisis kuantitatif dari model **${currentModel.name}**:\n\n1. **Data Processing**: Memanfaatkan context window hingga ${currentModel.context}.\n2. **Optimization**: Biaya token efisien di ${currentModel.inputPrice} / 1M input tokens.\n3. **Execution**: Siap dihubungkan langsung ke workflow production Anda.`
    ];

    const chosenResponse =
      mockResponses[Math.floor(Math.random() * mockResponses.length)];
    const chunks = chosenResponse.split(" ");
    let currentIdx = 0;

    const interval = setInterval(() => {
      if (currentIdx < chunks.length) {
        const textSoFar = chunks.slice(0, currentIdx + 1).join(" ");
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: textSoFar } : msg
          )
        );
        currentIdx++;
      } else {
        clearInterval(interval);
        setIsStreaming(false);
      }
    }, 40);
  };

  const handleReset = () => {
    setMessages([]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header without breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#f7d8c4]">
        <div>
          <h1 className="text-2xl font-semibold text-[#2b1b17] tracking-tight">
            Model Playground
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowApiModal(true)}
            className="px-3.5 py-1.5 bg-white hover:bg-[#fff9f5] border border-[#f7d8c4] rounded-xs text-xs font-medium text-[#e26d40] transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Code2 size={14} />
            &lt;/&gt; API VIEW
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="bg-white border border-[#f7d8c4] rounded-xs shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Chat / Simulation Area */}
        <div className="lg:col-span-8 border-b lg:border-b-0 lg:border-r border-[#f7d8c4] flex flex-col justify-between">
          {/* Widget top bar */}
          <div className="px-4 py-2.5 border-b border-[#f7d8c4] bg-[#fff9f5] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#e26d40]">
                <span className="w-2 h-2 rounded-full bg-[#e26d40] animate-pulse" />
                CHAT
              </div>

              {/* Model pill selector */}
              <div className="relative">
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="bg-white border border-[#f7d8c4] rounded-xs pl-2.5 pr-7 py-1 text-xs font-semibold font-mono text-[#2b1b17] outline-none focus:border-[#e26d40] cursor-pointer shadow-2xs appearance-none"
                >
                  {MOCK_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7c6862] pointer-events-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-[#7c6862]">
              <button
                onClick={() => setShowApiModal(true)}
                className="px-2 py-0.5 text-[11px] font-medium border border-[#f7d8c4] rounded-xs bg-white text-[#e26d40] hover:bg-[#fef4ed]"
              >
                &lt;/&gt; API VIEW
              </button>
              <button
                onClick={handleReset}
                className="p-1 hover:text-[#e26d40] transition-colors"
                title="Reset conversation"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {/* System Prompt Bar */}
          <div className="px-4 py-2 border-b border-[#f7d8c4] bg-white flex items-center gap-2 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#e26d40] whitespace-nowrap">
              SYSTEM PROMPT:
            </span>
            <input
              type="text"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Add system prompt"
              className="w-full bg-transparent text-xs text-[#7c6862] outline-none placeholder:text-[#a69590]"
            />
          </div>

          {/* Messages Feed */}
          <div className="p-4 min-h-[340px] max-h-[460px] overflow-y-auto space-y-3.5 bg-white">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded bg-[#e26d40] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={13} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xs px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#e26d40] text-white font-normal"
                      : "bg-[#fff9f5] border border-[#f7d8c4] text-[#2b1b17] shadow-2xs font-normal"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="text-[10px] font-semibold text-[#e26d40] mb-1 font-mono uppercase">
                      {msg.modelName || currentModel.name}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>

                {msg.role === "user" && (
                  <div className="w-6 h-6 rounded-xs bg-[#fef4ed] border border-[#f7d8c4] text-[#e26d40] flex items-center justify-center shrink-0 mt-0.5">
                    <User size={13} />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form
            onSubmit={handleSendMessage}
            className="p-2.5 border-t border-[#f7d8c4] bg-[#fff9f5] flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ketik instruksi prompt..."
              disabled={isStreaming}
              className="flex-1 bg-white border border-[#f7d8c4] rounded-xs px-3.5 py-2 text-xs text-[#2b1b17] outline-none focus:border-[#e26d40] placeholder:text-[#a69590] transition-all font-normal"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isStreaming}
              className="p-2 bg-[#e26d40] hover:bg-[#ce592c] disabled:opacity-30 text-white rounded-xs transition-all shadow-xs shrink-0"
            >
              <Send size={13} />
            </button>
          </form>
        </div>

        {/* Right Settings Sidebar */}
        <div className="lg:col-span-4 p-4 bg-white space-y-5">
          <div className="space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#e26d40] block">
              MODEL
            </span>
            <div className="flex items-center gap-2 p-2 bg-[#fff9f5] border border-[#f7d8c4] rounded-xs">
              <Bot size={15} className="text-[#e26d40]" />
              <span className="text-xs font-semibold text-[#2b1b17] font-mono">{currentModel.name}</span>
            </div>
          </div>

          {/* Settings Section */}
          <div className="space-y-3.5 pt-2 border-t border-[#f7d8c4]">
            <div className="flex items-center justify-between text-xs font-bold text-[#2b1b17]">
              <span>SETTINGS</span>
              <span className="text-[11px] text-[#7c6862]">▾</span>
            </div>

            {/* Temperature */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7c6862]">Temperature</span>
                <span className="font-mono font-bold text-[#e26d40]">{temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-[#e26d40] cursor-pointer"
              />
            </div>

            {/* Max Tokens */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7c6862]">Max Tokens</span>
                <span className="font-mono font-bold text-[#e26d40]">{maxTokens}</span>
              </div>
              <input
                type="range"
                min="128"
                max="8192"
                step="128"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full accent-[#e26d40] cursor-pointer"
              />
            </div>
          </div>

          {/* Format Options */}
          <div className="pt-2 border-t border-[#f7d8c4] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#2b1b17]">
              <span>FORMAT OPTIONS</span>
              <span className="text-[11px] text-[#7c6862]">▾</span>
            </div>
            <p className="text-[11px] text-[#7c6862]">Markdown, JSON Mode, Streaming enabled</p>
          </div>

          {/* Sampling */}
          <div className="pt-2 border-t border-[#f7d8c4] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#2b1b17]">
              <span>SAMPLING</span>
              <span className="text-[11px] text-[#7c6862]">▾</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#7c6862]">Top P</span>
              <span className="font-mono font-bold text-[#e26d40]">{topP}</span>
            </div>
          </div>
        </div>
      </div>

      {showApiModal && (
        <CodeDocsModal
          model={currentModel}
          onClose={() => setShowApiModal(false)}
        />
      )}
    </div>
  );
}
