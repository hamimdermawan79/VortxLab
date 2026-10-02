"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  Send,
  ArrowLeft
} from "lucide-react";
import VortXLogo from "@/components/VortXLogo";
import Footer from "@/components/Footer";

export default function ContactPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-[#fff9f5] font-mono">
      {/* ===== HEADER ===== */}
      <header className="border-b border-[#f7d8c4] bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
            <VortXLogo size="lg" />
          </div>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xs border border-[#f7d8c4] bg-white text-xs font-semibold text-[#71717a] hover:text-[#e26d40] hover:border-[#e26d40] transition-colors cursor-pointer"
          >
            <ArrowLeft size={13} />
            Kembali
          </button>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12">
        <div className="space-y-1 mb-2">
          <h1 className="text-lg font-bold uppercase tracking-wider text-[#18181b]">
            Contact Admin
          </h1>
          <p className="text-xs text-[#71717a] leading-relaxed">
            Butuh bantuan teknis, kendala fitur, topup token, atau konsultasi akun?
            Hubungi admin melalui kanal resmi di bawah ini.
          </p>
        </div>

        <div className="space-y-3 pt-6">
          {/* ===== TELEGRAM — AKTIF ===== */}
          <a
            href="https://t.me/VortXrrr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-xs bg-white border border-[#f7d8c4] hover:border-[#e26d40] hover:bg-[#fef4ed] transition-colors group"
          >
            <div className="p-3 rounded-xs bg-[#fef4ed] text-[#e26d40] shrink-0">
              <Send size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#18181b]">Telegram</p>
              <p className="text-xs text-[#71717a] mt-0.5">Respon paling cepat</p>
              <p className="text-xs font-semibold text-[#e26d40] mt-1 group-hover:underline underline-offset-2">
                @VortXrrr
              </p>
            </div>
          </a>

          {/* ===== WHATSAPP — TERSEDIA ===== */}
          <a
            href="https://wa.me/6285768434100"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-xs bg-white border border-[#f7d8c4] hover:border-[#e26d40] hover:bg-[#fef4ed] transition-colors group"
          >
            <div className="p-3 rounded-xs bg-[#fef4ed] text-[#e26d40] shrink-0">
              <MessageCircle size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#18181b]">WhatsApp</p>
              <p className="text-xs text-[#71717a] mt-0.5">Admin siap membantu via WhatsApp</p>
              <p className="text-xs font-semibold text-[#e26d40] mt-1 group-hover:underline underline-offset-2">
                +62 857-6843-4100
              </p>
            </div>
          </a>
        </div>

        <p className="text-[11px] text-[#a1a1aa] pt-8 leading-relaxed">
          Mohon tidak mengirimkan data sensitif (password akun game, kode OTP, atau
          informasi kartu pembayaran) melalui percakapan apapun.
        </p>
      </main>

      <Footer />
    </div>
  );
}
