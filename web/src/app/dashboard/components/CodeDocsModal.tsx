"use client";

import React, { useState } from "react";
import { X, Copy, Check, Terminal, Cpu } from "lucide-react";

interface CodeDocsModalProps {
  model: any;
  onClose: () => void;
}

export default function CodeDocsModal({ model, onClose }: CodeDocsModalProps) {
  const [activeLang, setActiveLang] = useState<"curl" | "python" | "node">("curl");
  const [copied, setCopied] = useState(false);

  const modelId = model?.id || "deepseek-v4-pro";
  const modelName = model?.name || "DeepSeek V4 Pro";

  const snippets: Record<string, string> = {
    curl: `curl https://api.vortxlabs.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $VORTX_API_KEY" \\
  -d '{
    "model": "${modelId}",
    "messages": [
      {
        "role": "user",
        "content": "Hello, explain quantum entanglement briefly."
      }
    ],
    "temperature": 0.7,
    "max_tokens": 1024,
    "stream": false
  }'`,
    python: `from openai import OpenAI

# VortX Labs is 100% OpenAI API compatible
client = OpenAI(
    api_key="your_vortx_api_key_here",
    base_url="https://api.vortxlabs.ai/v1"
)

response = client.chat.completions.create(
    model="${modelId}",
    messages=[
        {"role": "system", "content": "You are an expert AI assistant."},
        {"role": "user", "content": "How do serverless inference clusters work?"}
    ],
    temperature=0.7,
    max_tokens=1024
)

print(response.choices[0].message.content)`,
    node: `import OpenAI from "openai";

// VortX Labs is 100% OpenAI API compatible
const client = new OpenAI({
  apiKey: process.env.VORTX_API_KEY,
  baseURL: "https://api.vortxlabs.ai/v1"
});

async function main() {
  const completion = await client.chat.completions.create({
    model: "${modelId}",
    messages: [
      { role: "user", content: "Write a high-performance Rust sorting function." }
    ],
    temperature: 0.7,
    stream: true
  });

  for await (const chunk of completion) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }
}

main();`
  };

  const copyCode = () => {
    navigator.clipboard.writeText(snippets[activeLang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-[#f7d8c4] rounded-lg w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#f7d8c4] flex items-center justify-between bg-[#fff9f5]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#e26d40] text-white">
              <Terminal size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2b1b17]">API Integration Docs</h3>
              <p className="text-xs text-[#7c6862]">
                Model: <span className="text-[#e26d40] font-bold font-mono">{modelName}</span> ({modelId})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#7c6862] hover:text-[#2b1b17] rounded-lg hover:bg-[#fef4ed] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            {/* Language tabs */}
            <div className="flex items-center gap-1 p-1 bg-[#fff9f5] rounded-lg border border-[#f7d8c4]">
              <button
                onClick={() => setActiveLang("curl")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                  activeLang === "curl"
                    ? "bg-[#e26d40] text-white shadow-2xs"
                    : "text-[#7c6862] hover:text-[#e26d40]"
                }`}
              >
                cURL
              </button>
              <button
                onClick={() => setActiveLang("python")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                  activeLang === "python"
                    ? "bg-[#e26d40] text-white shadow-2xs"
                    : "text-[#7c6862] hover:text-[#e26d40]"
                }`}
              >
                Python (OpenAI SDK)
              </button>
              <button
                onClick={() => setActiveLang("node")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                  activeLang === "node"
                    ? "bg-[#e26d40] text-white shadow-2xs"
                    : "text-[#7c6862] hover:text-[#e26d40]"
                }`}
              >
                Node.js
              </button>
            </div>

            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#fff9f5] border border-[#f7d8c4] hover:bg-[#fef4ed] rounded-lg text-[#e26d40] transition-colors shadow-2xs"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-700" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={13} className="text-[#e26d40]" />
                  <span>Copy Snippet</span>
                </>
              )}
            </button>
          </div>

          {/* Code block */}
          <div className="relative rounded-lg border border-[#f7d8c4] bg-[#231713] p-4 text-[#fdeade] font-mono text-xs overflow-x-auto leading-relaxed shadow-inner">
            <pre className="whitespace-pre">
              <code>{snippets[activeLang]}</code>
            </pre>
          </div>

          {/* Info note */}
          <div className="p-3 bg-[#fff9f5] border border-[#f7d8c4] rounded-lg text-xs text-[#7c6862] flex items-start gap-2.5">
            <Cpu size={15} className="text-[#e26d40] shrink-0 mt-0.5" />
            <p>
              VortX inference endpoint kompatibel 100% dengan standar OpenAI REST API format. Gunakan <code className="bg-white px-1 py-0.5 rounded border border-[#f7d8c4] font-mono text-[#e26d40]">base_url</code> = <code className="bg-white px-1 py-0.5 rounded border border-[#f7d8c4] font-mono text-[#e26d40]">https://api.vortxlabs.ai/v1</code> dan bearer API Key Anda.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#f7d8c4] bg-[#fff9f5] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold bg-white border border-[#f7d8c4] hover:bg-[#fef4ed] rounded-lg text-[#e26d40] transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
