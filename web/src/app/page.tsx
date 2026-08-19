"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import VortXLogo from "@/components/VortXLogo";
import ProviderLogo from "@/components/ProviderLogo";
import Footer from "@/components/Footer";
import {
  Bot,
  Zap,
  ArrowRight,
  ShieldCheck,
  Terminal,
  Send,
  Code2,
  X,
  MessageCircle,
  Download,
  Copy,
  Check,
  Cpu,
  FolderArchive,
  Search,
  UserCheck,
  Layers,
  Sparkles
} from "lucide-react";

const AI_PROVIDERS = [
  { id: "openai", name: "OpenAI", desc: "GPT 5.6 Luna" },
  { id: "anthropic", name: "Anthropic", desc: "Claude 3.7 Sonnet" },
  { id: "gemini", name: "Google Gemini", desc: "Gemini 2.5 Pro" },
  { id: "deepseek", name: "DeepSeek", desc: "DeepSeek V4 Pro" },
  { id: "meta", name: "Meta", desc: "Llama 3.3 70B" },
  { id: "moonshot", name: "Moonshot", desc: "Kimi K3.5" },
  { id: "mistral", name: "Mistral AI", desc: "Mistral Large" },
  { id: "qwen", name: "Qwen", desc: "Qwen 2.5 Max" },
  { id: "nvidia", name: "NVIDIA", desc: "Spark Gemma" },
];

const FEATURES_LIST = [
  {
    id: "ai-models",
    title: "AI Models & Router",
    desc: "Akses 10+ model AI global (DeepSeek, Claude, GPT, Gemini, Qwen) melalui 1 endpoint standar OpenAI.",
    icon: <Cpu size={18} className="text-[#e26d40]" />,
    actionText: "Buka Models",
    actionUrl: "/dashboard?tab=models",
  },
  {
    id: "sortir-banned",
    title: "Sortir Banned Engine",
    desc: "Pemeriksaan status ribuan ID game secara paralel dengan dedup otomatis dan tanpa limit.",
    icon: <Zap size={18} className="text-[#e26d40]" />,
    actionText: "Mulai Sortir",
    actionUrl: "/dashboard?tab=higgs&sub=sortir",
  },
  {
    id: "data-extractor",
    title: "Data Extractor",
    desc: "Ekstraksi akun dari arsip ZIP berukuran besar dengan algoritma anti-ban round-robin MAC.",
    icon: <FolderArchive size={18} className="text-[#e26d40]" />,
    actionText: "Buka Extractor",
    actionUrl: "/dashboard?tab=higgs&sub=extractor",
  },
  {
    id: "intip-nomor",
    title: "Intip Nomor",
    desc: "Pencarian dan lookup instan informasi nomor akun game yang terdaftar secara akurat.",
    icon: <Search size={18} className="text-[#e26d40]" />,
    actionText: "Gunakan Tool",
    actionUrl: "/dashboard?tab=higgs&sub=intip",
  },
  {
    id: "cek-info-akun",
    title: "Cek Info Akun",
    desc: "Inspeksi metadata akun, level keamanan, status bind, dan riwayat akun secara mendalam.",
    icon: <UserCheck size={18} className="text-[#e26d40]" />,
    actionText: "Cek Akun",
    actionUrl: "/dashboard?tab=higgs&sub=info",
  },
  {
    id: "checker-tools",
    title: "Data Checker Tools",
    desc: "Aplikasi desktop automated checker dengan manajemen lisensi HWID dan auto-download.",
    icon: <Layers size={18} className="text-[#e26d40]" />,
    actionText: "Unduh App",
    actionUrl: "/dashboard?tab=higgs&sub=checker",
  },
  {
    id: "headless-checker",
    title: "Headless Data Checker",
    desc: "Pengecekan akun lokal tanpa emulator dengan kapabilitas bulk processing cloud ultra-cepat.",
    icon: <Cpu size={18} className="text-[#e26d40]" />,
    actionText: "Lihat Fitur (Soon)",
    actionUrl: "/dashboard?tab=higgs&tool=headless-checker",
  },
];

export default function Home() {
  const router = useRouter();
  const [showContactModal, setShowContactModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Active showcase tab
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<"models" | "sortir" | "api">("models");

  // Mini demo playground state on hero
  const [demoPrompt, setDemoPrompt] = useState("");
  const [demoMessages, setDemoMessages] = useState<Array<{ role: "user" | "assistant"; text: string; model?: string }>>([
    {
      role: "user",
      text: "Apa saja yang bisa dilakukan di platform VortX?"
    },
    {
      role: "assistant",
      model: "GPT 5.6 LUNA",
      text: "VortX menyatukan serverless AI inference multi-model (DeepSeek, GPT, Qwen, Claude) dan suite otomatisasi akun (Sortir Banned, Extractor, Checker) dalam satu dashboard terpadu."
    }
  ]);
  const [isDemoGenerating, setIsDemoGenerating] = useState(false);

  const handleSendDemo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoPrompt.trim() || isDemoGenerating) return;

    const userText = demoPrompt.trim();
    setDemoPrompt("");
    setDemoMessages((prev) => [...prev, { role: "user", text: userText }]);
    setIsDemoGenerating(true);

    setTimeout(() => {
      setDemoMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          model: "GPT 5.6 LUNA",
          text: `Semua fitur terintegrasi instan: Cukup buat API Key atau pilih tool di dashboard, seluruh endpoint langsung siap dipakai.`
        }
      ]);
      setIsDemoGenerating(false);
    }, 500);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen bg-white text-[#18181b] flex flex-col justify-between font-mono selection:bg-[#e26d40] selection:text-white">
      {/* ===== TOP NAVBAR ===== */}
      <header className="w-full border-b border-[#f7d8c4] bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative">
          {/* Left Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <VortXLogo size="lg" />
          </div>

          {/* Centered Desktop Navigation: Models, Playground, Feature, API Docs */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-[#71717a] absolute left-1/2 -translate-x-1/2">
            <button
              onClick={() => router.push("/dashboard?tab=models")}
              className="hover:text-[#e26d40] transition-colors cursor-pointer"
            >
              Models
            </button>
            <button
              onClick={() => router.push("/dashboard?tab=playground")}
              className="hover:text-[#e26d40] transition-colors cursor-pointer"
            >
              Playground
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("features");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="hover:text-[#e26d40] transition-colors cursor-pointer"
            >
              Feature
            </button>
            <button
              onClick={() => router.push("/docs")}
              className="hover:text-[#e26d40] transition-colors cursor-pointer"
            >
              API Docs
            </button>
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setShowContactModal(true)}
              className="hidden sm:inline-flex px-3.5 py-1.5 text-xs font-semibold border border-[#f7d8c4] hover:border-[#e26d40] rounded-xs bg-[#fff9f5] text-[#e26d40] hover:bg-[#fef4ed] transition-all shadow-2xs cursor-pointer"
            >
              Contact Admin
            </button>
            <button
              onClick={() => router.push("/login")}
              className="px-4 sm:px-5 py-1.5 text-xs font-semibold bg-[#18181b] hover:bg-[#e26d40] text-white rounded-xs transition-all shadow-2xs cursor-pointer"
            >
              Sign in
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar: Models, Playground, Feature, API Docs */}
        <div className="md:hidden border-t border-[#f7d8c4] bg-[#fff9f5] px-4 py-2 flex items-center justify-around">
          <button
            onClick={() => router.push("/dashboard?tab=models")}
            className="text-xs font-semibold text-[#71717a] hover:text-[#e26d40]"
          >
            Models
          </button>
          <button
            onClick={() => router.push("/dashboard?tab=playground")}
            className="text-xs font-semibold text-[#71717a] hover:text-[#e26d40]"
          >
            Playground
          </button>
          <button
            onClick={() => {
              const el = document.getElementById("features");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-xs font-semibold text-[#71717a] hover:text-[#e26d40]"
          >
            Feature
          </button>
          <button
            onClick={() => router.push("/docs")}
            className="text-xs font-semibold text-[#71717a] hover:text-[#e26d40]"
          >
            API Docs
          </button>
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex-1 flex flex-col justify-center space-y-16 sm:space-y-24">
        {/* Top Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column: Headline & CTA */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1]">
                <span className="text-[#e26d40]">Semua kebutuhan,</span> <br />
                <span className="text-[#18181b]">dalam satu web.</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#71717a] max-w-lg leading-relaxed pt-1 font-normal">
                Akses komputasi serverless AI inference multi-model, manajemen API key berkecepatan tinggi, serta seluruh rangkaian tools otomatisasi dalam satu platform terpadu.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => router.push("/login")}
                className="px-6 py-3 bg-[#e26d40] hover:bg-[#ce592c] text-white rounded-xs text-xs font-semibold tracking-wider uppercase transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                MULAI SEKARANG
                <ArrowRight size={14} />
              </button>
              <button
                onClick={() => router.push("/docs")}
                className="px-6 py-3 bg-white hover:bg-[#fff9f5] border border-[#f7d8c4] hover:border-[#e26d40] rounded-xs text-xs font-semibold tracking-wider uppercase text-[#e26d40] transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Code2 size={14} />
                API DOCS
              </button>
            </div>
          </div>

          {/* Right Column: Hero Terminal Livechat */}
          <div className="lg:col-span-6">
            <div className="rounded-lg border border-[#27272a] bg-[#0d1117] text-white shadow-2xl overflow-hidden font-mono relative">
              {/* macOS Titlebar */}
              <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] inline-block shadow-sm" />
                    <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] inline-block shadow-sm" />
                    <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] inline-block shadow-sm" />
                  </div>
                  <span className="text-[11px] text-[#8b949e] font-sans font-medium ml-2 flex items-center gap-1.5">
                    <Bot size={13} className="text-[#e26d40]" />
                    GPT 5.6 LUNA ~ Live Chat
                  </span>
                </div>

                <button
                  onClick={() => router.push("/docs")}
                  className="px-2 py-0.5 rounded bg-[#21262d] border border-[#30363d] text-[10px] font-medium text-[#e26d40] hover:text-white transition-colors cursor-pointer"
                >
                  API View
                </button>
              </div>

              {/* Chat Simulation Body */}
              <div className="p-4 space-y-3 min-h-[190px] max-h-[240px] overflow-y-auto bg-[#0d1117]">
                {demoMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-2.5 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-[#e26d40] text-white font-normal"
                          : "bg-[#161b22] border border-[#30363d] text-[#e6edf3] shadow-2xs font-normal"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#e26d40] mb-1 pb-1 border-b border-[#30363d] font-mono">
                          <span>{msg.model}</span>
                        </div>
                      )}
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendDemo} className="p-3 border-t border-[#30363d] bg-[#161b22] flex items-center gap-2">
                <span className="text-[#e26d40] text-xs font-bold pl-1">❯</span>
                <input
                  type="text"
                  value={demoPrompt}
                  onChange={(e) => setDemoPrompt(e.target.value)}
                  placeholder="Ketik pertanyaan untuk demo..."
                  className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-md px-3.5 py-2 text-xs text-[#e6edf3] outline-none focus:border-[#e26d40] placeholder:text-[#6e7681] transition-all font-mono"
                />
                <button
                  type="submit"
                  disabled={!demoPrompt.trim() || isDemoGenerating}
                  className="p-2 bg-[#e26d40] hover:bg-[#ce592c] disabled:opacity-30 text-white rounded-md transition-all shadow-2xs cursor-pointer"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ===== "ONE WEBSITE. THOUSAND PROBLEM SOLVED." SHOWCASE BANNER ===== */}
        <div className="relative rounded-2xl bg-[#18181b] border border-[#27272a] p-8 sm:p-12 overflow-hidden text-white shadow-2xl space-y-8">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#e26d40]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#e26d40]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-3">
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
              <span className="text-[#e26d40]">One Website.</span> <br />
              <span className="text-white">Thousand Problem Solved.</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#a1a1aa] leading-relaxed max-w-xl font-mono">
              Access 10+ AI models through a single endpoint. OpenAI and Anthropic SDK compatible.
            </p>
          </div>

          {/* Provider Logos List */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-y-5 gap-x-6 pt-2">
            {AI_PROVIDERS.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push("/dashboard?tab=models")}
                className="flex items-center gap-3 cursor-pointer group transition-all"
              >
                <div className="w-8 h-8 rounded-md bg-white p-1.5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                  <ProviderLogo provider={p.id} size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#e4e4e7] group-hover:text-[#e26d40] transition-colors truncate">
                    {p.name}
                  </p>
                  <p className="text-[10px] text-[#71717a] group-hover:text-[#a1a1aa] font-mono truncate">
                    {p.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== FEATURE SECTION (REAL FEATURES, CLEAN TYPOGRAPHY) ===== */}
        {/* ===== FEATURE SECTION ===== */}
        <section id="features" className="space-y-6 pt-8 border-t border-[#f7d8c4] scroll-mt-20">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#18181b]">
              Website Features
            </h2>
          </div>

          {/* Grid of Real Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES_LIST.map((f) => (
              <div
                key={f.id}
                className="p-5 bg-white border border-[#f7d8c4] hover:border-[#e26d40] rounded-xs space-y-3 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-[#fff9f5] border border-[#f7d8c4] rounded-xs">
                      {f.icon}
                    </div>
                    <h3 className="text-xs font-bold text-[#18181b] uppercase tracking-wide">
                      {f.title}
                    </h3>
                  </div>
                  <p className="text-xs text-[#71717a] leading-relaxed font-normal">
                    {f.desc}
                  </p>
                </div>

                <button
                  onClick={() => router.push(f.actionUrl)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#e26d40] hover:text-[#ce592c] transition-colors pt-2 cursor-pointer"
                >
                  <span>{f.actionText}</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ===== FEATURE SHOWCASE LIVE PEEK TABS ===== */}
        <div className="space-y-6 pt-8 border-t border-[#f7d8c4]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#18181b]">
                Live Preview
              </h2>
            </div>

            {/* Showcase Selector Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-[#fff9f5] border border-[#f7d8c4] rounded-xs overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveShowcaseTab("models")}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xs transition-all whitespace-nowrap cursor-pointer ${
                  activeShowcaseTab === "models"
                    ? "bg-[#e26d40] text-white shadow-2xs"
                    : "text-[#71717a] hover:text-[#e26d40]"
                }`}
              >
                AI Models
              </button>
              <button
                onClick={() => setActiveShowcaseTab("sortir")}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xs transition-all whitespace-nowrap cursor-pointer ${
                  activeShowcaseTab === "sortir"
                    ? "bg-[#e26d40] text-white shadow-2xs"
                    : "text-[#71717a] hover:text-[#e26d40]"
                }`}
              >
                Sortir Banned
              </button>
              <button
                onClick={() => setActiveShowcaseTab("api")}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xs transition-all whitespace-nowrap cursor-pointer ${
                  activeShowcaseTab === "api"
                    ? "bg-[#e26d40] text-white shadow-2xs"
                    : "text-[#71717a] hover:text-[#e26d40]"
                }`}
              >
                API Docs
              </button>
            </div>
          </div>

          {/* SHOWCASE TAB 1: AI MODELS CATALOG */}
          {activeShowcaseTab === "models" && (
            <div className="bg-white border border-[#f7d8c4] rounded-xs shadow-md p-6 sm:p-8 space-y-5 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#f7d8c4]">
                <div>
                  <h3 className="text-sm font-semibold text-[#18181b]">Multi-Provider AI Models</h3>
                </div>
                <button
                  onClick={() => router.push("/login")}
                  className="px-3.5 py-1.5 bg-[#18181b] hover:bg-[#e26d40] text-white text-xs font-semibold rounded-xs transition-all flex items-center gap-1.5 shadow-2xs w-fit cursor-pointer"
                >
                  Buka Catalog <ArrowRight size={13} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#fff9f5] border border-[#f7d8c4] rounded-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <ProviderLogo provider="deepseek" size={18} />
                    <span className="text-xs font-semibold text-[#18181b]">DeepSeek V4 Pro</span>
                  </div>
                  <p className="text-[11px] text-[#71717a]">Penalaran &amp; coding generasi mutakhir dengan token rate tinggi.</p>
                </div>

                <div className="p-4 bg-[#fff9f5] border border-[#f7d8c4] rounded-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <ProviderLogo provider="openai" size={18} />
                    <span className="text-xs font-semibold text-[#18181b]">GPT 5.6 Luna</span>
                  </div>
                  <p className="text-[11px] text-[#71717a]">Multimodal OpenAI untuk instruksi kompleks dan penalaran tingkat tinggi.</p>
                </div>

                <div className="p-4 bg-[#fff9f5] border border-[#f7d8c4] rounded-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <ProviderLogo provider="anthropic" size={18} />
                    <span className="text-xs font-semibold text-[#18181b]">Claude 3.7 Sonnet</span>
                  </div>
                  <p className="text-[11px] text-[#71717a]">Kemampuan analisis mendalam dan akurasi tinggi untuk tugas terstruktur.</p>
                </div>
              </div>
            </div>
          )}

          {/* SHOWCASE TAB 2: SORTIR BANNED ENGINE */}
          {activeShowcaseTab === "sortir" && (
            <div className="bg-white border border-[#f7d8c4] rounded-xs shadow-md p-6 sm:p-8 space-y-5 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#f7d8c4]">
                <div>
                  <h3 className="text-sm font-semibold text-[#18181b]">Sortir Banned Engine</h3>
                </div>
                <button
                  onClick={() => router.push("/login")}
                  className="px-3.5 py-1.5 bg-[#18181b] hover:bg-[#e26d40] text-white text-xs font-semibold rounded-xs transition-all flex items-center gap-1.5 shadow-2xs w-fit cursor-pointer"
                >
                  Coba Sortir ID <ArrowRight size={13} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-[#fff9f5] border border-[#f7d8c4] rounded-xs p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center bg-white p-3 rounded-xs border border-[#f7d8c4] divide-x divide-[#f7d8c4]">
                    <div><p className="text-[#71717a] text-[10px] uppercase">Total Input</p><p className="text-xs font-semibold font-mono text-[#18181b]">10,000 ID</p></div>
                    <div><p className="text-[#71717a] text-[10px] uppercase">Status</p><p className="text-xs font-semibold font-mono text-emerald-700">Unlimited</p></div>
                    <div><p className="text-[#71717a] text-[10px] uppercase">Hasil</p><p className="text-xs font-semibold font-mono text-[#e26d40]">CSV / TXT</p></div>
                  </div>
                </div>

                <div className="bg-[#fff9f5] border border-[#f7d8c4] rounded-xs p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs p-2 bg-emerald-50 text-emerald-800 rounded-xs border border-emerald-200">
                      <span>Normal</span>
                      <span className="font-mono font-bold">8,820</span>
                    </div>
                    <div className="flex justify-between items-center text-xs p-2 bg-red-50 text-red-700 rounded-xs border border-red-200">
                      <span>Banned / Limit</span>
                      <span className="font-mono font-bold">1,180</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SHOWCASE TAB 3: DEVELOPER REST API */}
          {activeShowcaseTab === "api" && (
            <div className="bg-white border border-[#f7d8c4] rounded-xs shadow-md p-6 sm:p-8 space-y-5 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#f7d8c4]">
                <div>
                  <h3 className="text-sm font-semibold text-[#18181b]">Programmatic REST API</h3>
                </div>
                <button
                  onClick={() => router.push("/docs")}
                  className="px-3.5 py-1.5 bg-[#e26d40] hover:bg-[#ce592c] text-white text-xs font-semibold rounded-xs transition-all flex items-center gap-1.5 shadow-2xs w-fit cursor-pointer"
                >
                  Buka API Docs <ArrowRight size={13} />
                </button>
              </div>

              <div className="rounded-lg border border-[#27272a] bg-[#0d1117] text-white shadow-xl overflow-hidden font-mono text-xs">
                <div className="px-4 py-2 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between select-none">
                  <span className="text-[11px] text-[#8b949e]">curl_sortir.sh</span>
                  <button
                    onClick={() => copyToClipboard(`curl -X POST "https://vortxlab.my.id/api/sortir-banned" \\\n  -H "Authorization: Bearer YOUR_API_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{"ids": ["12345678", "87654321"]}'`, "api_curl")}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white transition-colors text-[10px] cursor-pointer"
                  >
                    {copiedKey === "api_curl" ? (
                      <>
                        <Check size={11} className="text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 overflow-x-auto">
                  <pre className="text-[#e6edf3] leading-relaxed text-[11px]">
{`curl -X POST "https://vortxlab.my.id/api/sortir-banned" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"ids": ["12345678", "87654321"]}'`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ===== COMPREHENSIVE UNIFIED FOOTER ===== */}
      <Footer />

      {/* ===== CONTACT ADMIN MODAL ===== */}
      {showContactModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setShowContactModal(false)}
        >
          <div
            className="bg-white border border-[#f7d8c4] rounded-xs p-6 w-full max-w-sm shadow-2xl space-y-4 relative font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 text-[#71717a] hover:text-[#e26d40] p-1.5 rounded-xs cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="space-y-1">
              <h4 className="text-sm font-bold uppercase tracking-wider text-[#18181b]">Contact Admin</h4>
              <p className="text-xs text-[#71717a]">
                Bantuan teknis integrasi API dan konsultasi akun.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <a
                href="https://wa.me/6285768434100"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xs border border-[#f7d8c4] hover:bg-[#fff9f5] transition-colors text-xs font-semibold text-[#e26d40]"
              >
                <div className="p-2 rounded-xs bg-[#fef4ed] text-[#e26d40]">
                  <MessageCircle size={16} />
                </div>
                <div>
                  <p>WhatsApp</p>
                  <p className="text-[11px] text-[#71717a] font-mono">+62 857-6843-4100</p>
                </div>
              </a>
              <a
                href="https://t.me/VortXrrr"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xs border border-[#f7d8c4] hover:bg-[#fff9f5] transition-colors text-xs font-semibold text-[#e26d40]"
              >
                <div className="p-2 rounded-xs bg-[#fef4ed] text-[#e26d40]">
                  <MessageCircle size={16} />
                </div>
                <div>
                  <p>Telegram</p>
                  <p className="text-[11px] text-[#71717a] font-mono">@VortXrrr</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}