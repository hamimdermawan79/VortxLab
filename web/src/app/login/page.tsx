"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import VortXLogo from "@/components/VortXLogo";
import ProviderLogo from "@/components/ProviderLogo";
import { Eye, EyeOff } from "lucide-react";

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.37 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

const AI_PROVIDERS = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "gemini", name: "Google Gemini" },
  { id: "deepseek", name: "DeepSeek" },
  { id: "meta", name: "Meta LLaMA" },
  { id: "moonshot", name: "Moonshot AI" },
  { id: "mistral", name: "Mistral AI" },
  { id: "qwen", name: "Alibaba Qwen" },
  { id: "nvidia", name: "NVIDIA" },
];

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const [mode, setMode] = useState<"login" | "register">(
    modeParam === "register" ? "register" : "login"
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const currentMode = searchParams.get("mode");
    if (currentMode === "register") {
      setMode("register");
    } else if (currentMode === "login") {
      setMode("login");
    }
  }, [searchParams]);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      const errorMap: Record<string, string> = {
        google_not_configured: "Google Client ID belum dikonfigurasi di server.",
        google_auth_cancelled: "Login dengan Google dibatalkan.",
        missing_oauth_params: "Parameter OAuth tidak lengkap.",
        invalid_oauth_state: "Sesi autentikasi Google kedaluwarsa. Silakan coba lagi.",
        google_token_failed: "Gagal memverifikasi token dari Google.",
        google_user_failed: "Gagal mengambil info akun dari Google.",
        google_email_missing: "Akun Google tidak menyediakan alamat email.",
        google_auth_exception: "Terjadi kesalahan internal saat login dengan Google.",
      };
      setError(errorMap[errorParam] || `Gagal login: ${errorParam}`);
    }
  }, [searchParams]);

  const handleGoogleLogin = () => {
    setError("");
    setGoogleLoading(true);
    window.location.href = "/api/auth/google";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body: any = { username, password };
      if (mode === "register") body.phone = phone;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal masuk");
        setLoading(false);
        return;
      }
      if (data.user?.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Koneksi gagal");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] bg-white border border-[#f7d8c4] rounded-md sm:rounded-xs p-5 sm:p-8 shadow-xs space-y-5 sm:space-y-6 mx-auto">
      {/* Card Title & Subtitle */}
      <div className="space-y-1 text-left">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-[#2b1b17]">
          {mode === "register" ? "Create Account" : "Sign In"}
        </h2>
        <p className="text-xs text-[#7c6862]">
          {mode === "register"
            ? "Get started with your VortX account"
            : "Welcome back to your VortX account"}
        </p>
      </div>

      {error && (
        <div className="text-red-600 text-xs p-3 bg-red-50 rounded-xs border border-red-200 font-normal leading-relaxed">
          {error}
        </div>
      )}

      {/* Google Login Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading || loading}
        className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white border border-[#e4e4e7] hover:border-[#e26d40]/60 hover:bg-[#fff9f6] text-[#2b1b17] text-xs font-medium rounded-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-[0.99]"
      >
        <GoogleIcon />
        <span>
          {googleLoading
            ? "Menghubungkan ke Google..."
            : mode === "register"
            ? "Sign up with Google"
            : "Sign in with Google"}
        </span>
      </button>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="border-t border-[#f7d8c4]/80 w-full" />
        <span className="bg-white px-3 text-[11px] text-[#a69590] uppercase tracking-wider font-medium shrink-0">
          or
        </span>
        <div className="border-t border-[#f7d8c4]/80 w-full" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
        {/* Username / Name Input */}
        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-medium text-[#4a3630]">
            {mode === "register" ? "Name / Username" : "Username"}
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder={mode === "register" ? "John Doe" : "your username"}
            className="w-full bg-white border border-[#e4e4e7] rounded-xs px-3.5 py-2.5 text-xs text-[#2b1b17] outline-none focus:border-[#e26d40] focus:ring-1 focus:ring-[#e26d40] transition-all placeholder:text-[#a69590] font-normal"
          />
        </div>

        {/* Phone (Register only) */}
        {mode === "register" && (
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-medium text-[#4a3630]">
              WhatsApp / Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="08xxxxxxxxxx"
              className="w-full bg-white border border-[#e4e4e7] rounded-xs px-3.5 py-2.5 text-xs text-[#2b1b17] outline-none focus:border-[#e26d40] focus:ring-1 focus:ring-[#e26d40] transition-all placeholder:text-[#a69590] font-normal"
            />
          </div>
        )}

        {/* Password Input */}
        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-medium text-[#4a3630]">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-white border border-[#e4e4e7] rounded-xs px-3.5 py-2.5 text-xs text-[#2b1b17] outline-none focus:border-[#e26d40] focus:ring-1 focus:ring-[#e26d40] transition-all pr-10 placeholder:text-[#a69590] font-normal"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a69590] hover:text-[#2b1b17] transition-colors p-1"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Primary Submit Button */}
        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full py-2.5 sm:py-3 bg-[#18181b] hover:bg-black disabled:opacity-50 text-white font-medium text-xs rounded-xs transition-all shadow-xs mt-2 cursor-pointer active:scale-[0.99]"
        >
          {loading
            ? "Processing..."
            : mode === "register"
            ? "Create Account"
            : "Sign In"}
        </button>
      </form>

      {/* Bottom toggle */}
      <div className="pt-3 border-t border-[#f7d8c4]/60 text-center text-xs text-[#7c6862]">
        {mode === "register" ? (
          <p>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className="text-[#e26d40] font-medium hover:underline cursor-pointer ml-1"
            >
              Sign in
            </button>
          </p>
        ) : (
          <p>
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className="text-[#e26d40] font-medium hover:underline cursor-pointer ml-1"
            >
              Create one
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white font-sans selection:bg-[#e26d40] selection:text-white relative">
      {/* ===== LEFT DARK PANEL (Desktop) ===== */}
      <div className="hidden lg:flex lg:col-span-5 bg-[#0d0908] text-white p-10 xl:p-12 flex-col justify-between relative overflow-hidden border-r border-[#241714]">
        {/* Top Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer z-10" onClick={() => router.push("/")}>
          <VortXLogo variant="light" size="xl" showSubtext />
        </div>

        {/* Center/Bottom Headline & Features */}
        <div className="space-y-6 z-10 my-auto pt-10">
          <div className="space-y-3">
            <h1 className="text-3xl xl:text-4xl font-semibold tracking-tight leading-[1.15]">
              <span className="text-[#e26d40]">One Website.</span> <br />
              <span className="text-white">Thousand Problem Solved.</span>
            </h1>
            <p className="text-xs text-[#a69590] max-w-md leading-relaxed font-normal">
              Access 10+ AI models through a single endpoint. OpenAI and Anthropic SDK compatible.
            </p>
          </div>

          {/* Model provider logos - Single Transparent Glassmorphism Rounded Rectangle */}
          <div className="pt-2">
            <div className="inline-flex items-center gap-4 px-4 py-2.5 bg-white/[0.08] backdrop-blur-md border border-white/15 rounded-md shadow-xs max-w-full overflow-x-auto scrollbar-none">
              {AI_PROVIDERS.map((p) => (
                <div
                  key={p.id}
                  title={p.name}
                  className="opacity-80 hover:opacity-100 hover:scale-110 transition-all duration-200 cursor-pointer shrink-0 flex items-center justify-center"
                >
                  <ProviderLogo provider={p.id} size={22} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subtle bottom note */}
        <div className="z-10 text-[11px] text-[#6b5853]">
          &copy; {new Date().getFullYear()} VortX Labs Inc. All rights reserved.
        </div>

        {/* Subtle peach ambient glow in background */}
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#e26d40]/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ===== RIGHT / MOBILE PANEL ===== */}
      <div className="col-span-1 lg:col-span-7 flex flex-col justify-center items-center px-4 py-10 sm:px-8 sm:py-12 min-h-screen bg-white relative overflow-hidden">
        {/* ===== Mobile Dominant Dark Soft-Blending Gradient Backdrop (Extended Downward) ===== */}
        <div className="lg:hidden absolute top-0 left-0 right-0 h-80 sm:h-96 pointer-events-none overflow-hidden z-0 bg-gradient-to-b from-[#0d0908] from-45% via-[#170c0a]/90 via-75% to-transparent">
          {/* Radiant Peach/Orange Ambient Bloom in Top Center */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-96 h-56 bg-[#e26d40]/35 rounded-full blur-3xl" />
          {/* Secondary Soft Orange Accent Glow */}
          <div className="absolute top-28 -left-12 w-48 h-48 bg-[#e26d40]/20 rounded-full blur-2xl" />
        </div>

        {/* Mobile Header Brand (Positioned seamlessly above the card with light contrast) */}
        <div
          className="lg:hidden flex flex-col items-center gap-2 mb-6 cursor-pointer text-center relative z-10"
          onClick={() => router.push("/")}
        >
          <VortXLogo variant="light" size="xl" showSubtext />
        </div>

        {/* Main Auth Card wrapped in Suspense */}
        <div className="w-full max-w-[420px] relative z-10">
          <Suspense
            fallback={
              <div className="w-full max-w-[420px] bg-white border border-[#f7d8c4] rounded-md sm:rounded-xs p-8 shadow-xs text-center text-xs text-[#7c6862] mx-auto">
                Loading...
              </div>
            }
          >
            <LoginFormContent />
          </Suspense>
        </div>

        {/* Mobile AI Models Glassmorphism Ribbon (Seamlessly below the card) */}
        <div className="lg:hidden mt-6 max-w-full overflow-x-auto scrollbar-none px-2 relative z-10">
          <div className="inline-flex items-center gap-3.5 px-4 py-2.5 bg-white/80 backdrop-blur-md border border-[#e4e4e7] rounded-md shadow-2xs">
            {AI_PROVIDERS.slice(0, 7).map((p) => (
              <div
                key={p.id}
                title={p.name}
                className="opacity-80 shrink-0 flex items-center justify-center"
              >
                <ProviderLogo provider={p.id} size={18} />
              </div>
            ))}
            <span className="text-[10px] text-[#71717a] font-medium pl-1 shrink-0">+2 more</span>
          </div>
        </div>

        {/* Back to Home Link */}
        <button
          onClick={() => router.push("/")}
          className="mt-6 text-xs text-[#a69590] hover:text-[#2b1b17] transition-colors cursor-pointer relative z-10"
        >
          ← Back to home
        </button>
      </div>
    </div>
  );
}
