"use client";

import React from "react";

interface ProviderLogoProps {
  provider: string;
  className?: string;
  size?: number;
}

export default function ProviderLogo({ provider, className = "", size = 20 }: ProviderLogoProps) {
  const p = (provider || "").toLowerCase();

  let logoSrc = "";
  let altText = provider;

  if (p.includes("nvidia")) {
    logoSrc = "/logoai/nvidia-color.svg";
    altText = "NVIDIA";
  } else if (p.includes("moonshot") || p.includes("kimi")) {
    logoSrc = "/logoai/moonshot.svg";
    altText = "Moonshot AI";
  } else if (p.includes("mistral")) {
    logoSrc = "/logoai/mistral-color.svg";
    altText = "Mistral AI";
  } else if (p.includes("deepseek")) {
    logoSrc = "/logoai/deepseek-color.svg";
    altText = "DeepSeek";
  } else if (p.includes("openai") || p.includes("gpt")) {
    logoSrc = "/logoai/openai.svg";
    altText = "OpenAI";
  } else if (p.includes("anthropic") || p.includes("claude")) {
    logoSrc = "/logoai/anthropic.svg";
    altText = "Anthropic";
  } else if (p.includes("google") || p.includes("gemini")) {
    logoSrc = "/logoai/gemini.webp";
    altText = "Google Gemini";
  } else if (p.includes("meta") || p.includes("llama")) {
    logoSrc = "/logoai/meta.svg";
    altText = "Meta";
  } else if (p.includes("qwen")) {
    logoSrc = "/logoai/qwen-color.svg";
    altText = "Qwen";
  } else if (p.includes("alibaba")) {
    logoSrc = "/logoai/alibabacloud-color.svg";
    altText = "Alibaba Cloud";
  } else if (p.includes("z.ai") || p.includes("zai")) {
    logoSrc = "/logoai/zai.svg";
    altText = "Z.ai";
  }

  if (logoSrc) {
    return (
      <img
        src={logoSrc}
        alt={altText}
        width={size}
        height={size}
        className={`object-contain shrink-0 ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    );
  }

  // Fallback badge
  return (
    <div
      className={`rounded-xs bg-[#18181b] text-white flex items-center justify-center font-bold text-[10px] shrink-0 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {provider.slice(0, 1).toUpperCase()}
    </div>
  );
}
