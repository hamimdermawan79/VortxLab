"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Sparkles,
  Terminal,
  Play,
  CheckCircle2,
  Globe,
  Zap,
  Bot,
  Brain,
  Cpu,
  Layers,
  Code,
  Shield,
  MessageSquare,
  Check,
  MapPin
} from "lucide-react";
import CodeDocsModal from "./CodeDocsModal";
import ProviderLogo from "@/components/ProviderLogo";

export interface AIModelItem {
  id: string;
  name: string;
  provider: string;
  category: "Reasoning" | "Code" | "Chat" | "Vision";
  isNew?: boolean;
  description: string;
  inputPrice: string;
  outputPrice: string;
  speed: string;
  context: string;
  deployment: string;
  region: string;
  isRequestAccessOnly?: boolean;
}

export const MOCK_MODELS: AIModelItem[] = [
  {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    provider: "DeepSeek",
    category: "Reasoning",
    description: "A high-capacity reasoning route for agentic workflows, coding tasks, and production chat traffic through VortX.",
    inputPrice: "$1.74",
    outputPrice: "$3.48",
    speed: "Fast",
    context: "128K",
    deployment: "Serverless",
    region: "Global",
    isRequestAccessOnly: true
  },
  {
    id: "glm-5.2",
    name: "GLM 5.2",
    provider: "Z.ai",
    category: "Code",
    description: "GLM 5.2 is VortX's dedicated Z.ai route for long-running software, agent, and tool-use sessions.",
    inputPrice: "$1.40",
    outputPrice: "$4.40",
    speed: "80 Tok/s",
    context: "1M",
    deployment: "Serverless",
    region: "APAC"
  },
  {
    id: "nvidia-nemotron-3-ultra",
    name: "NVIDIA Nemotron 3 Ultra 550B A55B NVFP4",
    provider: "NVIDIA",
    category: "Reasoning",
    isNew: true,
    description: "Nemotron 3 Ultra is a 550B hybrid MoE model from NVIDIA, optimized for demanding multi-agent AI and complex reasoning tasks.",
    inputPrice: "$0.60",
    outputPrice: "$3.60",
    speed: "59 Tok/s",
    context: "256K",
    deployment: "Serverless",
    region: "us-central1"
  },
  {
    id: "kimi-k3",
    name: "Kimi K3",
    provider: "Moonshot AI",
    category: "Reasoning",
    isNew: true,
    description: "Kimi K3 provides maximum-effort reasoning and a 1,048,576-token context window through VortX API Master.",
    inputPrice: "$0.75",
    outputPrice: "$3.50",
    speed: "Fast",
    context: "1M",
    deployment: "Serverless",
    region: "Global"
  },
  {
    id: "kimi-k2.7-code",
    name: "Kimi K2.7 Code",
    provider: "Moonshot AI",
    category: "Code",
    isNew: true,
    description: "Kimi K2.7 Code runs on VortX Inference for long-context software work, agent execution, and production chat workloads.",
    inputPrice: "$0.75",
    outputPrice: "$3.50",
    speed: "Agentic",
    context: "1M",
    deployment: "Serverless",
    region: "Global"
  },
  {
    id: "qwen-3.7-max",
    name: "Qwen 3.7 Max",
    provider: "Qwen",
    category: "Chat",
    description: "A Qwen Max route for text-only enterprise workflows, exposed through VortX with scoped key enforcement.",
    inputPrice: "$1.25",
    outputPrice: "$3.75",
    speed: "Fast",
    context: "128K",
    deployment: "Serverless",
    region: "APAC"
  },
  {
    id: "spark-gemma-4-26b",
    name: "Spark Gemma 4 26B A4B",
    provider: "NVIDIA",
    category: "Chat",
    isNew: true,
    description: "Spark Gemma 4 26B A4B is exposed through API Master as a low-cost high-speed serverless chat endpoint.",
    inputPrice: "$0.35",
    outputPrice: "$1.10",
    speed: "Fast",
    context: "64K",
    deployment: "Serverless",
    region: "APAC"
  },
  {
    id: "deepseek-coder-v2-instruct",
    name: "DeepSeek Coder V2",
    provider: "DeepSeek",
    category: "Code",
    description: "State-of-the-art code generation and refactoring model trained on 338 programming languages.",
    inputPrice: "$0.14",
    outputPrice: "$0.28",
    speed: "Ultra Fast",
    context: "128K",
    deployment: "Serverless",
    region: "us-east-1"
  },
  {
    id: "gpt-4o",
    name: "OpenAI GPT-4o",
    provider: "OpenAI",
    category: "Chat",
    description: "OpenAI flagship multimodal intelligence model with ultra-fast latency and high-tier instruction compliance.",
    inputPrice: "$2.50",
    outputPrice: "$10.00",
    speed: "Ultra Fast",
    context: "128K",
    deployment: "Serverless",
    region: "us-west-2"
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    category: "Code",
    description: "Industry-defining coding & reasoning capabilities with high nuance understanding and structured JSON outputs.",
    inputPrice: "$3.00",
    outputPrice: "$15.00",
    speed: "Fast",
    context: "200K",
    deployment: "Serverless",
    region: "us-east-1"
  },
  {
    id: "gemini-2-flash",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    category: "Chat",
    description: "Google next-gen flash model offering sub-second response times, 1M context window, and multimodal processing.",
    inputPrice: "$0.10",
    outputPrice: "$0.40",
    speed: "Ultra Fast",
    context: "1M",
    deployment: "Serverless",
    region: "us-central1"
  },
  {
    id: "llama-3-3-70b-instruct",
    name: "Meta Llama 3.3 70B",
    provider: "Meta",
    category: "Chat",
    description: "Meta open-weights 70B parameter model delivering GPT-4 tier intelligence at ultra-low inference costs.",
    inputPrice: "$0.40",
    outputPrice: "$0.40",
    speed: "Fast",
    context: "128K",
    deployment: "Serverless",
    region: "us-east-1"
  },
  {
    id: "qwen-2-5-max",
    name: "Qwen 2.5 Max",
    provider: "Qwen",
    category: "Reasoning",
    description: "Alibaba Cloud top-tier large model with strong math, multilingual, and complex instruction following.",
    inputPrice: "$1.60",
    outputPrice: "$4.80",
    speed: "Fast",
    context: "128K",
    deployment: "Serverless",
    region: "ap-southeast-1"
  },
  {
    id: "mistral-large-2",
    name: "Mistral Large 2",
    provider: "Mistral",
    category: "Code",
    description: "Advanced 123B model from Mistral AI with 80+ coding languages support and multilingual mastery.",
    inputPrice: "$2.00",
    outputPrice: "$6.00",
    speed: "Fast",
    context: "128K",
    deployment: "Serverless",
    region: "eu-west-1"
  }
];

export default function AIModelsCatalog({ onOpenPlayground }: { onOpenPlayground?: (modelId: string) => void }) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedDocsModel, setSelectedDocsModel] = useState<AIModelItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const categories = ["All", "Reasoning", "Code", "Chat", "Vision"];

  const filteredModels = useMemo(() => {
    return MOCK_MODELS.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.provider.toLowerCase().includes(search.toLowerCase()) ||
        m.description.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === "All" || m.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [search, selectedCategory]);

  const renderProviderBadge = (provider: string) => {
    return (
      <div className="flex items-center gap-2 font-semibold text-xs text-[#18181b]">
        <ProviderLogo provider={provider} size={16} />
        <span>{provider}</span>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2b1b17] text-white px-4 py-3 rounded-lg shadow-xl border border-[#f7d8c4]/30 flex items-center gap-3 text-xs animate-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Section */}
      <div className="pt-2 pb-6 border-b border-[#f7d8c4]">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-semibold tracking-tight text-[#2b1b17] leading-[1.12]">
              Serverless model cards for <br className="hidden sm:inline" />
              the routes behind VortX.
            </h1>
            <p className="text-xs sm:text-sm text-[#7c6862] leading-relaxed pt-1 font-normal">
              Browse every playground-ready and request-access model route with provider logos, pricing
              markers, deployment type, and capability tags in one place.
            </p>
          </div>

          {/* Top Right Action buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => onOpenPlayground && onOpenPlayground("deepseek-v4-pro")}
              className="px-4 py-2 bg-[#e26d40] hover:bg-[#ce592c] text-white rounded-xs text-[11px] font-medium tracking-wider uppercase transition-all shadow-2xs flex items-center gap-1.5"
            >
              <Play size={11} className="fill-current" />
              OPEN PLAYGROUND
            </button>
            <button
              onClick={() => setSelectedDocsModel(MOCK_MODELS[0])}
              className="px-4 py-2 bg-white hover:bg-[#fff9f5] border border-[#f7d8c4] rounded-xs text-[11px] font-medium tracking-wider uppercase text-[#e26d40] transition-all shadow-2xs flex items-center gap-1.5"
            >
              <Terminal size={12} />
              API DOCS
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Search size={16} className="text-[#e26d40]" />
              <h2 className="text-lg font-bold text-[#2b1b17] tracking-tight">Browse Models</h2>
            </div>
            <p className="text-xs text-[#7c6862]">
              Find model routes by provider, capability, or deployment style.
            </p>
          </div>

          {/* Category Tabs & Search Input */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center p-1 bg-[#fff9f5] rounded-xs border border-[#f7d8c4]">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs font-medium rounded-xs transition-all ${
                    selectedCategory === cat
                      ? "bg-[#e26d40] text-white shadow-2xs"
                      : "text-[#7c6862] hover:text-[#e26d40]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-48 sm:w-64">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7c6862]"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search models or providers..."
                className="w-full pl-7 pr-3 py-1.5 bg-white border border-[#f7d8c4] focus:border-[#e26d40] rounded-xs text-xs outline-none transition-colors text-[#2b1b17] placeholder:text-[#a69590]"
              />
            </div>
          </div>
        </div>

        <div className="text-[11px] font-bold tracking-widest text-[#e26d40] uppercase">
          {filteredModels.length} MODELS
        </div>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredModels.map((model) => {
          return (
            <div
              key={model.id}
              className="bg-white border border-[#f7d8c4] rounded-xs p-5 hover:border-[#e26d40] hover:shadow-xs transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header: Provider Logo & Badges */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  {renderProviderBadge(model.provider)}

                  <div className="flex items-center gap-1.5">
                    {model.isNew && (
                      <span className="px-2 py-0.5 text-[9px] font-semibold rounded-xs bg-[#e26d40] text-white tracking-wider uppercase">
                        NEW
                      </span>
                    )}
                    <span className="px-2 py-0.5 text-[9px] font-medium rounded-xs bg-[#fff9f5] border border-[#f7d8c4] text-[#e26d40] tracking-wider uppercase">
                      {model.category}
                    </span>
                  </div>
                </div>

                {/* Model Title */}
                <h3 className="text-base font-semibold text-[#2b1b17] group-hover:text-[#e26d40] transition-colors leading-snug mb-1.5 tracking-tight">
                  {model.name}
                </h3>

                {/* Description */}
                <p className="text-xs text-[#7c6862] leading-relaxed line-clamp-3 mb-4 min-h-[44px]">
                  {model.description}
                </p>

                {/* Spec Box Matrix */}
                <div className="bg-[#fff9f5] border border-[#f7d8c4] rounded-xs p-3 mb-4">
                  <div className="grid grid-cols-3 gap-2 text-center divide-x divide-[#f7d8c4]">
                    <div className="px-1">
                      <p className="text-[9px] font-medium uppercase tracking-wider text-[#7c6862] mb-0.5">
                        INPUT
                      </p>
                      <p className="text-xs font-semibold font-mono text-[#2b1b17]">{model.inputPrice}</p>
                    </div>
                    <div className="px-1">
                      <p className="text-[9px] font-medium uppercase tracking-wider text-[#7c6862] mb-0.5">
                        OUTPUT
                      </p>
                      <p className="text-xs font-semibold font-mono text-[#2b1b17]">{model.outputPrice}</p>
                    </div>
                    <div className="px-1">
                      <p className="text-[9px] font-medium uppercase tracking-wider text-[#7c6862] mb-0.5">
                        {model.speed.includes("Tok") || model.speed === "Fast" ? "SPEED" : "CONTEXT"}
                      </p>
                      <p className="text-xs font-semibold font-mono text-[#e26d40]">
                        {model.speed.includes("Tok") || model.speed === "Fast" ? model.speed : model.context}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row */}
              <div className="pt-3 border-t border-[#f7d8c4] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 text-xs text-[#7c6862]">
                  <span className="flex items-center gap-1 font-medium text-[#2b1b17]">
                    <Check size={12} className="text-emerald-700 stroke-[2.5]" />
                    {model.deployment}
                  </span>
                  <span className="text-[#a69590] flex items-center gap-1 text-[11px]">
                    <MapPin size={10} />
                    {model.region}
                  </span>
                </div>

                <div>
                  <button
                    onClick={() => onOpenPlayground && onOpenPlayground(model.id)}
                    className="px-3 py-1 bg-[#fff9f5] hover:bg-[#fef4ed] border border-[#f7d8c4] text-[10px] font-medium text-[#e26d40] rounded-xs transition-colors uppercase tracking-wider shadow-2xs"
                  >
                    TRY MODEL
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Docs Modal */}
      {selectedDocsModel && (
        <CodeDocsModal
          model={selectedDocsModel}
          onClose={() => setSelectedDocsModel(null)}
        />
      )}
    </div>
  );
}
