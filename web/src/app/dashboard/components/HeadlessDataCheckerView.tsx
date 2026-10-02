"use client";

import React, { useState } from "react";
import {
  Cpu,
  Zap,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Terminal,
  Server,
  ArrowRight,
  Check,
  Bell
} from "lucide-react";

export default function HeadlessDataCheckerView() {
  const [isNotified, setIsNotified] = useState(false);

  const handleNotifyMe = () => {
    setIsNotified(true);
    setTimeout(() => setIsNotified(false), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner with Orange Accent */}
      <div className="bg-gradient-to-r from-[#e26d40]/10 via-[#e26d40]/[0.03] to-white border border-[#e26d40]/30 rounded-xs p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-xs bg-[#e26d40]/15 text-[#e26d40] border border-[#e26d40]/30 shrink-0">
              <Cpu size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base font-semibold text-[#18181b] uppercase tracking-wider">
                  Headless Data Checker
                </h3>
                <span className="text-[10px] font-mono font-bold text-[#e26d40] bg-[#e26d40]/15 border border-[#e26d40]/30 px-2 py-0.5 rounded uppercase">
                  Soon / Under Development
                </span>
              </div>
              <p className="text-xs text-[#52525b] mt-1 leading-relaxed max-w-2xl">
                Solusi pengecekan data akun lokal (<strong>local_data.conf</strong>) secara native <strong>tanpa emulator</strong> dengan kapabilitas <strong>Bulk Process</strong> berkecepatan tinggi.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNotifyMe}
            className="self-start sm:self-auto px-4 py-2 bg-black text-white hover:bg-[#27272a] text-xs font-medium rounded-xs transition-all shadow-2xs flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            {isNotified ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span>Notifikasi Aktif!</span>
              </>
            ) : (
              <>
                <Bell size={13} />
                <span>Beri Tahu Saat Rilis</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-4 space-y-2 shadow-2xs">
          <div className="w-8 h-8 rounded-xs bg-black text-white flex items-center justify-center">
            <Zap size={16} />
          </div>
          <h4 className="text-xs font-semibold text-[#18181b] uppercase tracking-wider">
            100% Headless (No Emulator)
          </h4>
          <p className="text-[11px] text-[#71717a] leading-relaxed">
            Tidak perlu menjalankan Nox, LDPlayer, atau emulator berat. Protokol data disimulasikan secara langsung dan murni.
          </p>
        </div>

        <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-4 space-y-2 shadow-2xs">
          <div className="w-8 h-8 rounded-xs bg-[#e26d40] text-white flex items-center justify-center">
            <Layers size={16} />
          </div>
          <h4 className="text-xs font-semibold text-[#18181b] uppercase tracking-wider">
            Bulk Process High Speed
          </h4>
          <p className="text-[11px] text-[#71717a] leading-relaxed">
            Proses pengecekan ratusan hingga ribuan akun sekaligus dalam satu batch dengan arsitektur multi-thread asinkron.
          </p>
        </div>

        <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-4 space-y-2 shadow-2xs">
          <div className="w-8 h-8 rounded-xs bg-black text-white flex items-center justify-center">
            <ShieldCheck size={16} />
          </div>
          <h4 className="text-xs font-semibold text-[#18181b] uppercase tracking-wider">
            Akurasi & Data Mendalam
          </h4>
          <p className="text-[11px] text-[#71717a] leading-relaxed">
            Mendeteksi status akun, validitas password, level keamanan, serta saldo chip/koin secara presisi tanpa risiko deteksi emulator.
          </p>
        </div>

        <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-4 space-y-2 shadow-2xs">
          <div className="w-8 h-8 rounded-xs bg-emerald-600 text-white flex items-center justify-center">
            <Server size={16} />
          </div>
          <h4 className="text-xs font-semibold text-[#18181b] uppercase tracking-wider">
            Zero Resource Overhead
          </h4>
          <p className="text-[11px] text-[#71717a] leading-relaxed">
            Hemat penggunaan RAM dan CPU laptop/PC Anda hingga 95% dibandingkan metode pengecekan konvensional berbasis emulator.
          </p>
        </div>
      </div>

      {/* Headless Simulation Terminal Mockup */}
      <div className="rounded-lg border border-[#30363d] bg-[#0d1117] text-white shadow-xl overflow-hidden font-mono text-xs">
        {/* macOS Window Top Bar */}
        <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] inline-block shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] inline-block shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] inline-block shadow-sm" />
            </div>
            <span className="text-xs text-[#c9d1d9] font-sans font-semibold ml-2 flex items-center gap-1.5">
              <Terminal size={13} className="text-[#e26d40]" />
              vortx-headless-checker.daemon --bulk --no-emulator
            </span>
          </div>
          <span className="text-[10px] text-[#e26d40] bg-[#e26d40]/15 px-2 py-0.5 rounded border border-[#e26d40]/30 font-sans font-medium">
            Protocol Simulator
          </span>
        </div>

        {/* Terminal Body */}
        <div className="p-4 sm:p-5 overflow-x-auto max-h-72 overflow-y-auto leading-relaxed">
          <pre className="text-[11px] text-[#8b949e] font-mono select-all">
{`[VortX Engine] Initializing Headless Protocol Handshake...
[VortX Engine] Loading batch input: 500 local_data targets
[VortX Engine] Emulator Bypass: ACTIVE (Native Socket Streaming)

[Worker-01] Checking ID 12345678 -> Status: OK | Coins: 1.25B | Security: Verified
[Worker-02] Checking ID 87654321 -> Status: OK | Coins: 500M  | Security: Unbound
[Worker-03] Checking ID 19283746 -> Status: BANNED (Code 1125)
[Worker-04] Checking ID 98765432 -> Status: OK | Coins: 2.10B | Security: Verified
...
[Summary] 500 IDs processed in 4.21s (Speed: ~118.7 req/s) | 0% CPU Load`}
          </pre>
        </div>

        <div className="px-4 py-2.5 bg-[#161b22] border-t border-[#30363d] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-[#8b949e] font-sans">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 size={12} /> Mendukung import langsung arsip .ZIP dan berkas .CONF
          </span>
          <span className="text-[#e26d40] font-mono font-semibold">Estimasi Rilis: Segera di Update Mendatang</span>
        </div>
      </div>
    </div>
  );
}
