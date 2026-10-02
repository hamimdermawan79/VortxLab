"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Terminal,
  Code2,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  ArrowLeft,
  Key,
  Layers,
  ChevronRight,
  Server,
  RefreshCw,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Webhook,
  SlidersHorizontal,
  Wallet,
  Clock,
  Sparkles
} from "lucide-react";
import VortXLogo from "@/components/VortXLogo";
import Footer from "@/components/Footer";

type CodeLang = "curl" | "python" | "nodejs" | "php";

// Reusable macOS Styled Terminal Window Component
function MacTerminalWindow({
  title,
  code,
  lang,
  onCopy,
  isCopied,
}: {
  title: string;
  code: string;
  lang?: string;
  onCopy: () => void;
  isCopied: boolean;
}) {
  return (
    <div className="rounded-lg border border-[#27272a] bg-[#0d1117] text-white shadow-xl overflow-hidden font-mono text-xs">
      {/* macOS Top Bar */}
      <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          {/* 3 macOS Colored Circles */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] inline-block shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] inline-block shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] inline-block shadow-sm" />
          </div>
          <span className="text-[11px] text-[#8b949e] font-sans font-medium ml-2 flex items-center gap-1.5">
            <Terminal size={12} className="text-[#e26d40]" />
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {lang && (
            <span className="text-[10px] uppercase font-bold text-[#e26d40] bg-[#e26d40]/15 border border-[#e26d40]/30 px-2 py-0.5 rounded">
              {lang}
            </span>
          )}
          <button
            onClick={onCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white transition-colors text-[11px]"
          >
            {isCopied ? (
              <>
                <Check size={12} className="text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Terminal Code Body */}
      <div className="p-4 sm:p-5 overflow-x-auto">
        <pre className="text-[#e6edf3] leading-relaxed selection:bg-[#e26d40] selection:text-white">{code}</pre>
      </div>
    </div>
  );
}

export default function ApiDocsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"sortir" | "webhook" | "balance" | "inference">("sortir");
  const [activeLang, setActiveLang] = useState<CodeLang>("curl");
  const [activeWebhookLang, setActiveWebhookLang] = useState<"nodejs" | "python" | "php">("nodejs");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [apiCostPerId, setApiCostPerId] = useState<number>(20);

  React.useEffect(() => {
    fetch("/api/service-costs")
      .then((res) => res.json())
      .then((data) => {
        if (data && (data["sortir-banned-api"] || data["sortir-banned"])) {
          setApiCostPerId(data["sortir-banned-api"] || data["sortir-banned"]);
        }
      })
      .catch(() => {});
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Code snippets for Sortir Banned
  const SORTIR_CODE_SAMPLES: Record<CodeLang, string> = {
    curl: `# 1. Submit Batch Sortir Banned (Mendukung ID Murni maupun Format Akun Lengkap)
# Webhook otomatis terkirim jika parameter webhook_url disertakan
curl -X POST "https://vortxlab.my.id/api/sortir-banned" \\
  -H "Authorization: Bearer sk-vrtx-xxxxxxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "ids": [
      "35906623",
      "ID: 195723517 PW: AF17E2EE190BB824D2AFA2F8EDC6F1D4 MAC: 46:46:87:5D:D0:D3",
      "43166085|AF17E2EE190BB8246B470B5491190EE1F8D0|9A:C8:B8:8E:25:CF"
    ],
    "webhook_url": "https://client-domain.com/api/vortx-webhook"
  }'

# 2. Cek Status Pekerjaan Manual (Polling Fallback)
curl -X GET "https://vortxlab.my.id/api/sortir-banned?activityId=ACTIVITY_ID" \\
  -H "Authorization: Bearer sk-vrtx-xxxxxxxxxxxxxxxxxxxxxxxx"

# 3. Batalkan Proses & Refund Token
curl -X DELETE "https://vortxlab.my.id/api/sortir-banned?activityId=ACTIVITY_ID" \\
  -H "Authorization: Bearer sk-vrtx-xxxxxxxxxxxxxxxxxxxxxxxx"`,

    python: `import requests

BASE_URL = "https://vortxlab.my.id/api"
API_KEY = "sk-vrtx-xxxxxxxxxxxxxxxxxxxxxxxx"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# 1. Kirim Batch ID (Bisa ID murni atau format data akun lengkap)
# VortX otomatis mengekstrak ID saja (Password/MAC tidak pernah disimpan/dikirim)
payload = {
    "ids": [
        "35906623",
        "ID: 195723517 PW: AF17E2EE190BB824D2AFA2F8EDC6F1D4 MAC: 46:46:87:5D:D0:D3",
        "43166085|AF17E2EE190BB8246B470B5491190EE1F8D0|9A:C8:B8:8E:25:CF"
    ],
    "webhook_url": "https://client-domain.com/api/vortx-webhook" # Opsional
}

response = requests.post(f"{BASE_URL}/sortir-banned", json=payload, headers=HEADERS)
data = response.json()

if response.status_code == 200:
    activity_id = data.get("activity_id")
    print(f"✅ Job dimulai! ID: {activity_id}")
    print(f"Biaya: {data.get('cost')} Token | Sisa: {data.get('remaining_token')} Token")
elif response.status_code == 402:
    print(f"⚠️ Saldo tidak cukup: Butuh {data.get('required_tokens')} Token")
else:
    print(f"❌ Error: {data.get('message')}")`,

    nodejs: `// Menggunakan fetch (Node.js 18+)
const BASE_URL = "https://vortxlab.my.id/api";
const API_KEY = "sk-vrtx-xxxxxxxxxxxxxxxxxxxxxxxx";

async function submitSortirBanned(ids, webhookUrl) {
  // ids mendukung array ID murni maupun format akun mentah (ID: ... PW: ... MAC: ...)
  const res = await fetch(\`\${BASE_URL}/sortir-banned\`, {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${API_KEY}\`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ids: ids,
      webhook_url: webhookUrl
    })
  });

  const data = await res.json();
  if (res.ok) {
    console.log("Job berhasil dibuat:", data.activity_id);
    console.log("Biaya:", data.cost, "Token | Sisa:", data.remaining_token);
  } else if (res.status === 402) {
    console.error("Saldo tidak cukup:", data.message);
  } else {
    console.error("Gagal:", data.message);
  }
}

submitSortirBanned([
  "35906623",
  "ID: 195723517 PW: AF17E2EE190BB824D2AFA2F8EDC6F1D4 MAC: 46:46:87:5D:D0:D3"
], "https://client-domain.com/api/vortx-webhook");`,

    php: `<?php
$baseUrl = "https://vortxlab.my.id/api";
$apiKey = "sk-vrtx-xxxxxxxxxxxxxxxxxxxxxxxx";

// Mendukung ID numerik murni maupun format akun mentah
$payload = json_encode([
    "ids" => [
        "35906623",
        "ID: 195723517 PW: AF17E2EE190BB824D2AFA2F8EDC6F1D4 MAC: 46:46:87:5D:D0:D3",
        "43166085|AF17E2EE...|9A:C8:B8:8E:25:CF"
    ],
    "webhook_url" => "https://client-domain.com/api/vortx-webhook"
]);

$ch = curl_init("$baseUrl/sortir-banned");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $apiKey",
    "Content-Type: application/json"
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$data = json_decode($response, true);
if ($httpCode === 200) {
    echo "Job Aktif: " . $data['activity_id'] . "\\n";
} elseif ($httpCode === 402) {
    echo "Saldo Kurang: " . $data['message'] . "\\n";
} else {
    echo "Error [$httpCode]: " . $data['message'] . "\\n";
}
?>`
  };

  // Webhook Receiver Samples
  const WEBHOOK_RECEIVER_SAMPLES: Record<"nodejs" | "python" | "php", string> = {
    nodejs: `// Express.js / Next.js Webhook Receiver di Website Client
import express from "express";

const app = express();
app.use(express.json());

app.post("/api/vortx-webhook", (req, res) => {
  const { event, activity_id, total_ids, results, summary } = req.body;

  if (event === "sortir.completed") {
    console.log(\`[VortX] Sortir Selesai untuk Job \${activity_id}\`);
    console.log(\`Aman: \${summary.total_aman} ID | Banned: \${summary.total_banned} ID\`);

    const idAman = results.aman;     // Array string ID
    const idBanned = results.banned; // Array string ID

    // Update database status akun client Anda secara instan...
  }

  // Wajib kembalikan response HTTP 200 OK
  return res.status(200).json({ received: true });
});

app.listen(3000, () => console.log("Webhook receiver running on port 3000"));`,

    python: `# FastAPI Webhook Receiver di Website Client
from fastapi import FastAPI, Request
from pydantic import BaseModel
from typing import List, Dict

app = FastAPI()

class SortirResults(BaseModel):
    aman: List[str]
    banned: List[str]

class WebhookPayload(BaseModel):
    event: str
    activity_id: str
    total_ids: int
    results: SortirResults
    summary: Dict[str, int]
    completed_at: str

@app.post("/api/vortx-webhook")
async def handle_vortx_webhook(payload: WebhookPayload):
    if payload.event == "sortir.completed":
        print(f"Sortir selesai: {payload.activity_id}")
        print(f"ID Aman: {len(payload.results.aman)} | ID Banned: {len(payload.results.banned)}")
        
        # Simpan atau update status akun ke database website Anda...
        
    return {"status": "success"}`,

    php: `<?php
// PHP Webhook Receiver (endpoint di website client)
$rawPayload = file_get_contents('php://input');
$data = json_decode($rawPayload, true);

if ($data && isset($data['event']) && $data['event'] === 'sortir.completed') {
    $activityId = $data['activity_id'];
    $idAman     = $data['results']['aman'];    // array
    $idBanned   = $data['results']['banned'];  // array

    // Simpan hasil ke database MySQL / PostgreSQL Anda
    // $db->query("UPDATE accounts SET status='aman' WHERE id IN (...)");

    // Kirim response 200 OK
    http_response_code(200);
    echo json_encode(["status" => "received"]);
} else {
    http_response_code(400);
    echo json_encode(["error" => "Invalid payload"]);
}
?>`
  };

  // Balance Check Snippets
  const BALANCE_CODE_SAMPLES: Record<CodeLang, string> = {
    curl: `# Cek Saldo Token via API Key
curl -X GET "https://vortxlab.my.id/api/balance" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"

# Output Response:
# {
#   "status": "success",
#   "user_id": "08313278-...",
#   "username": "client_reseller",
#   "token_balance": 150000,
#   "role": "user"
# }`,

    python: `import requests

API_TOKEN = "YOUR_API_TOKEN"
headers = {"Authorization": f"Bearer {API_TOKEN}"}

res = requests.get("https://vortxlab.my.id/api/balance", headers=headers)
data = res.json()

print(f"Username: {data.get('username')}")
print(f"Saldo Token: {data.get('token_balance'):,} Token")`,

    nodejs: `const res = await fetch("https://vortxlab.my.id/api/balance", {
  headers: { "Authorization": "Bearer YOUR_API_TOKEN" }
});
const data = await res.json();
console.log(\`Saldo: \${data.token_balance} Token\`);`,

    php: `<?php
$ch = curl_init("https://vortxlab.my.id/api/balance");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer YOUR_API_TOKEN"]);
$response = curl_exec($ch);
curl_close($ch);
echo $response;
?>`
  };

  // AI Inference Code Samples
  const INFERENCE_CODE_SAMPLES: Record<CodeLang, string> = {
    curl: `curl -X POST "https://api.vortxlabs.ai/v1/chat/completions" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "deepseek-v4-pro",
    "messages": [
      {"role": "system", "content": "You are a helpful coding assistant."},
      {"role": "user", "content": "Write a Python quicksort algorithm."}
    ],
    "temperature": 0.7,
    "max_tokens": 1024
  }'`,

    python: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.vortxlabs.ai/v1",
    api_key="YOUR_API_TOKEN"
)

response = client.chat.completions.create(
    model="deepseek-v4-pro",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Jelaskan arsitektur Transformer secara singkat."}
    ],
    temperature=0.7
)

print(response.choices[0].message.content)`,

    nodejs: `import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.vortxlabs.ai/v1",
  apiKey: "YOUR_API_TOKEN"
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "deepseek-v4-pro",
    messages: [
      { role: "user", content: "Halo, apa saja keunggulan VortX Labs?" }
    ]
  });

  console.log(completion.choices[0].message.content);
}

main();`,

    php: `<?php
$ch = curl_init("https://api.vortxlabs.ai/v1/chat/completions");
$payload = json_encode([
    "model" => "deepseek-v4-pro",
    "messages" => [
        ["role" => "user", "content" => "Hello World!"]
    ]
]);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer YOUR_API_TOKEN",
    "Content-Type: application/json"
]);

$response = curl_exec($ch);
curl_close($ch);
echo $response;
?>`
  };

  return (
    <div className="min-h-screen bg-white text-[#18181b] flex flex-col font-mono selection:bg-[#e26d40] selection:text-white">
      {/* ===== HEADER NAVIGATION ===== */}
      <header className="w-full border-b border-[#e4e4e7] bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative">
          {/* Left Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/")}>
            <VortXLogo size="lg" />
          </div>

          {/* Centered Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#71717a] absolute left-1/2 -translate-x-1/2">
            <button onClick={() => router.push("/dashboard?tab=inference")} className="hover:text-[#e26d40] transition-colors">
              Dashboard
            </button>
            <button onClick={() => router.push("/dashboard?tab=models")} className="hover:text-[#e26d40] transition-colors">
              Models
            </button>
            <button onClick={() => router.push("/dashboard?tab=playground")} className="hover:text-[#e26d40] transition-colors">
              Playground
            </button>
            <button onClick={() => router.push("/dashboard?tab=higgs")} className="hover:text-[#e26d40] transition-colors">
              Higgs Tools
            </button>
            <button onClick={() => router.push("/docs")} className="text-[#e26d40] font-bold">
              &lt;/&gt; API Docs
            </button>
            <button onClick={() => router.push("/dashboard/topup")} className="hover:text-[#e26d40] transition-colors">
              Add Token
            </button>
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-1.5 bg-[#18181b] hover:bg-[#e26d40] text-white rounded-full text-xs font-semibold transition-all shadow-2xs"
            >
              Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* ===== HERO / PAGE TITLE WITH ORANGE ACCENT ===== */}
      <div className="border-b border-[#e4e4e7] bg-gradient-to-b from-[#fff9f5] to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#e26d40] text-white text-[10px] font-semibold tracking-wider uppercase rounded-xs shadow-2xs">
                  API Documentation
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#18181b]">
                &lt;/&gt; API Docs &amp; Developer Portal
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/dashboard")}
                className="px-3.5 py-2 bg-white border border-[#f7d8c4] hover:border-[#e26d40] rounded-xs text-xs font-medium text-[#e26d40] hover:bg-[#fff9f5] transition-all shadow-2xs flex items-center gap-1.5"
              >
                <Key size={13} />
                Dapatkan API Key
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        {/* Section Navigation Tabs with Orange Accents */}
        <div className="flex items-center gap-2 border-b border-[#e4e4e7] pb-3 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("sortir")}
            className={`px-4 py-2 text-xs font-semibold rounded-xs transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "sortir"
                ? "bg-[#e26d40] text-white shadow-2xs"
                : "bg-[#fff9f5] border border-[#f7d8c4] text-[#71717a] hover:text-[#e26d40] hover:bg-white"
            }`}
          >
            <ShieldCheck size={14} />
            <span>Sortir Banned &amp; Rate Limits</span>
          </button>

          <button
            onClick={() => setActiveTab("webhook")}
            className={`px-4 py-2 text-xs font-semibold rounded-xs transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "webhook"
                ? "bg-[#e26d40] text-white shadow-2xs"
                : "bg-[#fff9f5] border border-[#f7d8c4] text-[#71717a] hover:text-[#e26d40] hover:bg-white"
            }`}
          >
            <Webhook size={14} />
            <span>Webhook Callbacks</span>
          </button>

          <button
            onClick={() => setActiveTab("balance")}
            className={`px-4 py-2 text-xs font-semibold rounded-xs transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "balance"
                ? "bg-[#e26d40] text-white shadow-2xs"
                : "bg-[#fff9f5] border border-[#f7d8c4] text-[#71717a] hover:text-[#e26d40] hover:bg-white"
            }`}
          >
            <Wallet size={14} />
            <span>Check Balance API</span>
          </button>

          <button
            onClick={() => setActiveTab("inference")}
            className={`px-4 py-2 text-xs font-semibold rounded-xs transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "inference"
                ? "bg-[#e26d40] text-white shadow-2xs"
                : "bg-[#fff9f5] border border-[#f7d8c4] text-[#71717a] hover:text-[#e26d40] hover:bg-white"
            }`}
          >
            <Zap size={14} />
            <span>AI Inference API</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: SORTIR BANNED API & BILLING */}
        {/* ======================================================== */}
        {activeTab === "sortir" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* API Key Quick Setup Banner */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-xs p-5 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Key size={16} className="text-[#e26d40]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Autentikasi API Key
                  </h3>
                </div>
                <p className="text-xs text-[#a1a1aa] font-mono leading-relaxed">
                  Gunakan API Key Anda dari menu <span className="text-[#e26d40] font-semibold">Dashboard &gt; API Keys</span> (format: <code className="text-white bg-[#27272a] px-1.5 py-0.5 rounded">sk-vrtx-...</code>).
                </p>
              </div>

              <button
                onClick={() => router.push("/dashboard?tab=inference")}
                className="px-4 py-2 bg-[#e26d40] hover:bg-[#ce592c] text-white rounded-xs text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap shadow-xs flex items-center gap-1.5 cursor-pointer w-fit"
              >
                <span>Buka API Keys</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Overview & Live Pricing Card */}
            <div className="bg-white border border-[#f7d8c4] rounded-xs p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#f7d8c4]">
                <div>
                  <h2 className="text-lg font-semibold text-[#18181b]">Automated Sortir Banned API</h2>
                  <p className="text-xs text-[#71717a] mt-0.5">
                    Endpoint REST API untuk pemilahan status akun massal secara paralel.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-[#fff9f5] border border-[#e26d40] text-[#e26d40] rounded-xs text-xs font-bold font-mono">
                    Tarif: {apiCostPerId} Token / ID
                  </span>
                </div>
              </div>

              {/* Pricing & Balance Deduction Mechanism */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                <div className="p-4 bg-[#fff9f5] border border-[#f7d8c4] rounded-xs space-y-2">
                  <span className="text-[10px] font-bold text-[#e26d40] uppercase font-mono">Ketentuan Biaya &amp; Saldo</span>
                  <p className="text-[#71717a] leading-relaxed">
                    Biaya dipotong otomatis dari saldo token akun pemilik API Key:
                  </p>
                  <div className="p-2.5 bg-white border border-[#f7d8c4] rounded-xs font-mono text-[11px] text-[#18181b]">
                    Total Biaya = Jumlah ID Valid × {apiCostPerId} Token
                  </div>
                  <p className="text-[11px] text-[#71717a]">
                    *Tarif per ID dikonfigurasi langsung oleh Admin dan dapat berbeda untuk calling API/reseller.
                  </p>
                </div>

                <div className="p-4 bg-[#fff9f5] border border-[#f7d8c4] rounded-xs space-y-2">
                  <span className="text-[10px] font-bold text-[#e26d40] uppercase font-mono">Validasi Saldo (HTTP 402)</span>
                  <p className="text-[#71717a] leading-relaxed">
                    Sistem memvalidasi kecukupan saldo sebelum eksekusi dimulai. Jika saldo token tidak mencukupi, API langsung mengembalikan respons error <code className="font-mono text-red font-bold">402 Payment Required</code> tanpa mengurangi saldo sepeserpun.
                  </p>
                </div>
              </div>

              {/* Rate Limits & Batch Size Info Box */}
              <div className="bg-[#fff9f5] border border-[#f7d8c4] rounded-xs p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={15} className="text-[#e26d40]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181b]">
                    Ketentuan Batch Size &amp; Throughput
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white border border-[#f7d8c4] rounded-xs space-y-1">
                    <span className="text-[10px] font-bold text-[#e26d40] uppercase font-mono">Batas Single Request</span>
                    <p className="font-semibold text-[#18181b]">Maksimal 20 ID / Request</p>
                    <p className="text-[11px] text-[#71717a]">
                      Menjaga payload JSON tetap ringkas dan responsif. Request dengan &gt; 20 ID akan ditolak dengan status <span className="text-red font-semibold">400 Bad Request</span>.
                    </p>
                  </div>

                  <div className="p-3 bg-white border border-[#f7d8c4] rounded-xs space-y-1">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase font-mono">Batas Atas / Throughput</span>
                    <p className="font-semibold text-[#18181b]">Unlimited (Tanpa Limit)</p>
                    <p className="text-[11px] text-[#71717a]">
                      Tidak ada pembatasan jumlah request per menit/jam. Anda dapat mengirimkan request sebanyak mungkin secara paralel selama saldo token mencukupi.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Code Integration with macOS Terminal Window */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#18181b] flex items-center gap-1.5">
                  <Terminal size={14} className="text-[#e26d40]" />
                  Contoh Request Calling API
                </h3>

                {/* Language Switcher Tabs */}
                <div className="flex items-center p-1 bg-[#fff9f5] border border-[#f7d8c4] rounded-xs gap-1">
                  {(["curl", "python", "nodejs", "php"] as CodeLang[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setActiveLang(lang)}
                      className={`px-3 py-1 text-xs font-semibold uppercase rounded-xs transition-all cursor-pointer ${
                        activeLang === lang
                          ? "bg-[#e26d40] text-white shadow-2xs"
                          : "text-[#71717a] hover:text-[#e26d40]"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* macOS Terminal Window */}
              <MacTerminalWindow
                title={`bash ~ sortir_banned_client.${activeLang === "nodejs" ? "js" : activeLang === "python" ? "py" : activeLang === "php" ? "php" : "sh"}`}
                code={SORTIR_CODE_SAMPLES[activeLang]}
                lang={activeLang}
                onCopy={() => copyToClipboard(SORTIR_CODE_SAMPLES[activeLang], "sortir_code")}
                isCopied={copiedKey === "sortir_code"}
              />
            </div>

            {/* Detailed Endpoints Specification */}
            <div className="space-y-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#18181b]">
                Spesifikasi Parameter &amp; Response JSON
              </h3>

              {/* 1. POST /api/sortir-banned */}
              <div className="bg-white border border-[#e4e4e7] rounded-xs p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-[#e4e4e7]">
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-xs text-xs font-bold font-mono">
                    POST
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#18181b]">/api/sortir-banned</span>
                  <span className="text-xs text-[#71717a] ml-auto">Submit Batch ID</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-2">
                    <p className="font-semibold text-[#18181b] uppercase text-[11px] tracking-wider">Request Headers &amp; Payload</p>
                    <div className="bg-[#fafafa] p-3.5 rounded-xs border border-[#e4e4e7] font-mono text-[11px] space-y-2">
                      <p className="text-[#71717a]">Authorization: Bearer &lt;YOUR_API_KEY&gt;</p>
                      <p className="text-[#71717a]">Content-Type: application/json</p>
                      <pre className="text-[#18181b] pt-2 border-t border-[#e4e4e7]">
{`{
  "ids": [
    "35906623",
    "ID: 195723517 PW: AF17E2EE... MAC: 46:46:87:5D:D0:D3",
    "43166085|AF17E2EE...|9A:C8:B8:8E:25:CF"
  ],
  "webhook_url": "https://client-domain.com/api/vortx-webhook" // Opsional
}`}
                      </pre>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-[#18181b] uppercase text-[11px] tracking-wider">Success Response (200 OK)</p>
                    <div className="bg-[#fafafa] p-3.5 rounded-xs border border-[#e4e4e7] font-mono text-[11px]">
                      <pre className="text-[#18181b]">
{`{
  "success": true,
  "activity_id": "08313278-7492-4dec-9860-53d658374246",
  "total_ids": 3,
  "cost_per_id": ${apiCostPerId},
  "cost": ${3 * apiCostPerId},
  "remaining_token": 149940,
  "webhook_registered": true,
  "message": "Proses sortir ID berhasil dimulai."
}`}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Security Guarantee & Multi-Format Info */}
                <div className="p-3 bg-emerald-500/[0.04] border border-emerald-500/20 rounded-xs text-xs text-[#27272a] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-800 text-[11px]">
                    <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                    <span>Format Fleksibel &amp; Garansi Privasi 100% Terjaga</span>
                  </div>
                  <p className="text-[11px] text-[#52525b] leading-relaxed">
                    Parameter <code className="bg-white px-1 py-0.5 rounded border border-[#e4e4e7] font-mono text-emerald-800">ids</code> menerima string ID numerik murni maupun format akun mentah (seperti <code className="bg-white px-1 py-0.5 rounded border border-[#e4e4e7] font-mono text-emerald-800">ID: ... PW: ... MAC: ...</code> atau <code className="bg-white px-1 py-0.5 rounded border border-[#e4e4e7] font-mono text-emerald-800">ID|PW|MAC</code>). Mesin VortX secara otomatis mengekstrak ID numerik saja. Password, MAC Address, atau data rahasia lainnya tidak pernah disimpan ataupun dikirim ke server luar.
                  </p>
                </div>

                {/* Error Responses Reference */}
                <div className="pt-3 border-t border-[#e4e4e7] space-y-3">
                  <p className="font-semibold text-[#18181b] uppercase text-[11px] tracking-wider">Format Respons Error (Status Codes)</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xs space-y-1.5">
                      <span className="text-[10px] font-bold text-red uppercase">402 Payment Required (Saldo Kurang)</span>
                      <pre className="text-[10px] text-red-900 bg-white p-2 rounded border border-red-200">
{`{
  "error": "INSUFFICIENT_BALANCE",
  "message": "Saldo token tidak mencukupi...",
  "required_tokens": ${10 * apiCostPerId},
  "cost_per_id": ${apiCostPerId},
  "total_ids": 10,
  "current_balance": 50
}`}
                      </pre>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xs space-y-1.5">
                      <span className="text-[10px] font-bold text-amber-800 uppercase">401 Unauthorized (API Key Invalid)</span>
                      <pre className="text-[10px] text-amber-900 bg-white p-2 rounded border border-amber-200">
{`{
  "error": "UNAUTHORIZED",
  "message": "Autentikasi gagal. Pastikan menyertakan Header 'Authorization: Bearer <API_KEY>' yang valid..."
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. GET /api/sortir-banned?activityId=... */}
              <div className="bg-white border border-[#e4e4e7] rounded-xs p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-[#e4e4e7]">
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-xs text-xs font-bold font-mono">
                    GET
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#18181b]">/api/sortir-banned?activityId=&#123;id&#125;</span>
                  <span className="text-xs text-[#71717a] ml-auto">Polling Fallback</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-2">
                    <p className="font-semibold text-[#18181b] uppercase text-[11px] tracking-wider">Query Parameters</p>
                    <div className="bg-[#fafafa] p-3.5 rounded-xs border border-[#e4e4e7] space-y-2">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className="font-bold text-[#18181b]">activityId</span>
                        <span className="text-[#71717a]">string (UUID) • Required</span>
                      </div>
                      <p className="text-[#71717a] text-[11px]">ID aktivitas pekerjaan yang didapatkan saat submit batch.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-[#18181b] uppercase text-[11px] tracking-wider">Completed Response (200 OK)</p>
                    <div className="bg-[#fafafa] p-3.5 rounded-xs border border-[#e4e4e7] font-mono text-[11px]">
                      <pre className="text-[#18181b]">
{`{
  "activity_id": "08313278-7492-4dec-9860-53d658374246",
  "status": "completed",
  "current_index": 3,
  "total_ids": 3,
  "progress_percent": 100,
  "raw_results": {
    "aman": ["12345678", "11223344"],
    "banned": ["87654321"]
  },
  "summary": {
    "total_aman": 2,
    "total_banned": 1
  }
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: WEBHOOK CALLBACKS */}
        {/* ======================================================== */}
        {activeTab === "webhook" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="bg-white border border-[#f7d8c4] rounded-xs p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#18181b]">Webhook Callback Integration</h2>
                  <p className="text-xs text-[#71717a] mt-1">
                    Website client tidak perlu melakukan polling berkala. Cukup kirimkan URL endpoint webhook Anda saat submit batch ID, dan server VortX akan langsung mengirimkan payload HTTP POST begitu pemrosesan selesai.
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-[#e26d40] text-white rounded-xs text-[10px] font-semibold font-mono shadow-2xs">
                  EVENT-DRIVEN HTTP POST
                </span>
              </div>

              {/* Workflow diagram */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3.5 bg-[#fff9f5] border border-[#f7d8c4] rounded-xs space-y-1.5">
                  <span className="text-[10px] font-bold text-[#e26d40] font-mono">LANGKAH 1</span>
                  <p className="font-semibold text-[#18181b]">Kirim request dengan parameter webhook_url</p>
                  <p className="text-[#71717a] text-[11px]">Sertakan URL endpoint website Anda pada payload POST /api/sortir-banned.</p>
                </div>

                <div className="p-3.5 bg-[#fff9f5] border border-[#f7d8c4] rounded-xs space-y-1.5">
                  <span className="text-[10px] font-bold text-[#e26d40] font-mono">LANGKAH 2</span>
                  <p className="font-semibold text-[#18181b]">Engine Memproses ID di Background</p>
                  <p className="text-[#71717a] text-[11px]">Server VortX menyortir akun ID dengan kecepatan tinggi dan membagi hasil aman vs banned.</p>
                </div>

                <div className="p-3.5 bg-[#fff9f5] border border-[#f7d8c4] rounded-xs space-y-1.5">
                  <span className="text-[10px] font-bold text-[#e26d40] font-mono">LANGKAH 3</span>
                  <p className="font-semibold text-[#18181b]">Payload Otomatis Terkirim ke Client</p>
                  <p className="text-[#71717a] text-[11px]">VortX memanggil webhook Anda via HTTP POST. Website client menerima data instan!</p>
                </div>
              </div>
            </div>

            {/* Webhook Payload Spec */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#18181b]">
                Spesifikasi Payload Webhook dari VortX
              </h3>
              <MacTerminalWindow
                title="webhook_payload_received.json"
                lang="JSON"
                code={`{
  "event": "sortir.completed",
  "activity_id": "08313278-7492-4dec-9860-53d658374246",
  "total_ids": 20,
  "results": {
    "aman": ["12345678", "11223344", "55667788", "99001122"],
    "banned": ["87654321", "33445566"]
  },
  "summary": {
    "total_aman": 18,
    "total_banned": 2
  },
  "completed_at": "2026-08-17T00:55:00.000Z"
}`}
                onCopy={() => copyToClipboard(`{\n  "event": "sortir.completed",\n  "activity_id": "08313278-7492-4dec-9860-53d658374246",\n  "total_ids": 20,\n  "results": {\n    "aman": ["12345678", "11223344"],\n    "banned": ["87654321"]\n  },\n  "summary": {\n    "total_aman": 2,\n    "total_banned": 1\n  },\n  "completed_at": "2026-08-17T00:55:00.000Z"\n}`, "webhook_json")}
                isCopied={copiedKey === "webhook_json"}
              />
            </div>

            {/* Webhook Receiver Examples */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#18181b] flex items-center gap-1.5">
                  <Terminal size={14} className="text-[#e26d40]" />
                  Contoh Implementasi Webhook Receiver di Website Client
                </h3>

                <div className="flex items-center p-1 bg-[#fff9f5] border border-[#f7d8c4] rounded-xs gap-1">
                  {(["nodejs", "python", "php"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setActiveWebhookLang(lang)}
                      className={`px-3 py-1 text-xs font-semibold uppercase rounded-xs transition-all ${
                        activeWebhookLang === lang
                          ? "bg-[#e26d40] text-white shadow-2xs"
                          : "text-[#71717a] hover:text-[#e26d40]"
                      }`}
                    >
                      {lang === "nodejs" ? "Node.js (Express)" : lang === "python" ? "Python (FastAPI)" : "PHP (Native)"}
                    </button>
                  ))}
                </div>
              </div>

              <MacTerminalWindow
                title={`bash ~ webhook_server.${activeWebhookLang === "nodejs" ? "js" : activeWebhookLang === "python" ? "py" : "php"}`}
                code={WEBHOOK_RECEIVER_SAMPLES[activeWebhookLang]}
                lang={activeWebhookLang}
                onCopy={() => copyToClipboard(WEBHOOK_RECEIVER_SAMPLES[activeWebhookLang], "webhook_receiver")}
                isCopied={copiedKey === "webhook_receiver"}
              />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: CHECK BALANCE API */}
        {/* ======================================================== */}
        {activeTab === "balance" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="bg-white border border-[#f7d8c4] rounded-xs p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#18181b]">Check Token Balance via API Key</h2>
                  <p className="text-xs text-[#71717a] mt-1">
                    Client dapat mengecek sisa saldo token akun secara programmatic menggunakan API Key tanpa perlu membuka browser.
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-[#fef4ed] text-[#e26d40] border border-[#f7d8c4] rounded-xs text-[10px] font-semibold font-mono">
                  GET /api/balance
                </span>
              </div>
            </div>

            {/* Code Integration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#18181b] flex items-center gap-1.5">
                  <Terminal size={14} className="text-[#e26d40]" />
                  Contoh Kode Cek Saldo Token
                </h3>

                <div className="flex items-center p-1 bg-[#fff9f5] border border-[#f7d8c4] rounded-xs gap-1">
                  {(["curl", "python", "nodejs", "php"] as CodeLang[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setActiveLang(lang)}
                      className={`px-3 py-1 text-xs font-semibold uppercase rounded-xs transition-all ${
                        activeLang === lang
                          ? "bg-[#e26d40] text-white shadow-2xs"
                          : "text-[#71717a] hover:text-[#e26d40]"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <MacTerminalWindow
                title={`bash ~ check_balance.${activeLang === "nodejs" ? "js" : activeLang === "python" ? "py" : activeLang === "php" ? "php" : "sh"}`}
                code={BALANCE_CODE_SAMPLES[activeLang]}
                lang={activeLang}
                onCopy={() => copyToClipboard(BALANCE_CODE_SAMPLES[activeLang], "balance_code")}
                isCopied={copiedKey === "balance_code"}
              />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: SERVERLESS AI INFERENCE API */}
        {/* ======================================================== */}
        {activeTab === "inference" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="bg-white border border-[#f7d8c4] rounded-xs p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#18181b]">Serverless AI Inference (OpenAI Compatible)</h2>
                  <p className="text-xs text-[#71717a] mt-1">
                    Gunakan endpoint OpenAI standar untuk mengakses seluruh model DeepSeek, GPT, Claude, Gemini, Meta Llama, Qwen, dan Moonshot.
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-[#18181b] text-white rounded-xs text-[10px] font-semibold font-mono">
                  BASE: api.vortxlabs.ai/v1
                </span>
              </div>
            </div>

            {/* Code Integration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#18181b] flex items-center gap-1.5">
                  <Terminal size={14} className="text-[#e26d40]" />
                  Contoh Kode Chat Completion
                </h3>

                <div className="flex items-center p-1 bg-[#fff9f5] border border-[#f7d8c4] rounded-xs gap-1">
                  {(["curl", "python", "nodejs", "php"] as CodeLang[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setActiveLang(lang)}
                      className={`px-3 py-1 text-xs font-semibold uppercase rounded-xs transition-all ${
                        activeLang === lang
                          ? "bg-[#e26d40] text-white shadow-2xs"
                          : "text-[#71717a] hover:text-[#e26d40]"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <MacTerminalWindow
                title={`bash ~ ai_inference.${activeLang === "nodejs" ? "js" : activeLang === "python" ? "py" : activeLang === "php" ? "php" : "sh"}`}
                code={INFERENCE_CODE_SAMPLES[activeLang]}
                lang={activeLang}
                onCopy={() => copyToClipboard(INFERENCE_CODE_SAMPLES[activeLang], "inference_code")}
                isCopied={copiedKey === "inference_code"}
              />
            </div>
          </div>
        )}
      </main>

      {/* ===== UNIFIED FOOTER ===== */}
      <Footer />
    </div>
  );
}
