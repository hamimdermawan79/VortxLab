"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import VortXLogo from "@/components/VortXLogo";
import { MessageCircle, X, Shield, FileText, CheckCircle2 } from "lucide-react";

export default function Footer() {
  const router = useRouter();
  const [modalType, setModalType] = useState<"privacy" | "terms" | null>(null);

  const navigateToTab = (tab: "inference" | "models" | "playground" | "higgs", tool?: string) => {
    if (typeof window !== "undefined" && window.location.pathname === "/dashboard") {
      window.dispatchEvent(new CustomEvent("vortx:nav", { detail: { tab, tool } }));
      const url = tool ? `/dashboard?tab=${tab}&tool=${tool}` : `/dashboard?tab=${tab}`;
      window.history.pushState({}, "", url);
    } else {
      const url = tool ? `/dashboard?tab=${tab}&tool=${tool}` : `/dashboard?tab=${tab}`;
      router.push(url);
    }
  };

  return (
    <>
      <footer className="border-t border-[#f7d8c4] bg-[#fff9f5] pt-12 pb-8 mt-12 text-xs font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Column 1: Brand & Tagline */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
                <VortXLogo size="lg" />
              </div>
              <p className="text-xs text-[#71717a] leading-relaxed">
                All in One Website
              </p>
              <p className="text-xs font-bold text-[#e26d40] tracking-wide pt-1">
                999+ process per day
              </p>
            </div>

            {/* Column 2: Products */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#18181b]">Produk &amp; Layanan</h4>
              <ul className="space-y-1.5 text-xs text-[#71717a]">
                <li>
                  <button onClick={() => navigateToTab("inference")} className="hover:text-[#e26d40] transition-colors">
                    Serverless Inference
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateToTab("models")} className="hover:text-[#e26d40] transition-colors">
                    AI Model Catalog
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateToTab("playground")} className="hover:text-[#e26d40] transition-colors">
                    AI Playground
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateToTab("higgs")} className="hover:text-[#e26d40] transition-colors">
                    Higgs Automation Tools
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Navigation & Resources */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#18181b]">Navigasi</h4>
              <ul className="space-y-1.5 text-xs text-[#71717a]">
                <li>
                  <button onClick={() => router.push("/docs")} className="hover:text-[#e26d40] transition-colors font-semibold text-[#e26d40]">
                    &lt;/&gt; API Docs
                  </button>
                </li>
                <li>
                  <button onClick={() => router.push("/dashboard/topup")} className="hover:text-[#e26d40] transition-colors">
                    Add &amp; Topup Token
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateToTab("inference")} className="hover:text-[#e26d40] transition-colors">
                    Dashboard
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact & Support */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#18181b]">Bantuan</h4>
              <p className="text-xs text-[#71717a]">Butuh bantuan integrasi atau topup token?</p>
              <div className="flex flex-col gap-2 pt-1">
                <a
                  href="https://wa.me/6285768434100"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xs bg-white border border-[#f7d8c4] text-xs font-semibold text-[#e26d40] hover:border-[#e26d40] transition-colors"
                >
                  <MessageCircle size={13} />
                  WhatsApp Support
                </a>
                <a
                  href="https://t.me/VortXrrr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xs bg-white border border-[#f7d8c4] text-xs font-semibold text-[#e26d40] hover:border-[#e26d40] transition-colors"
                >
                  <MessageCircle size={13} />
                  Telegram @VortXrrr
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Copyright Bar (Security Removed, Proper ToS & Privacy Policy Modal Triggers) */}
          <div className="pt-6 border-t border-[#f7d8c4] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#71717a]">
            <p>&copy; {new Date().getFullYear()} VortX Labs. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <button
                onClick={() => setModalType("privacy")}
                className="hover:text-[#e26d40] transition-colors underline-offset-2 hover:underline cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => setModalType("terms")}
                className="hover:text-[#e26d40] transition-colors underline-offset-2 hover:underline cursor-pointer"
              >
                Terms of Service
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* ===== MODAL PRIVACY POLICY & TERMS OF SERVICE ===== */}
      {modalType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setModalType(null)}
        >
          <div
            className="bg-white border border-[#f7d8c4] rounded-xs p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl space-y-4 relative font-mono text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#f7d8c4] sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                {modalType === "privacy" ? (
                  <Shield size={16} className="text-[#e26d40]" />
                ) : (
                  <FileText size={16} className="text-[#e26d40]" />
                )}
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#18181b]">
                  {modalType === "privacy" ? "Kebijakan Privasi (Privacy Policy)" : "Syarat & Ketentuan Layanan (Terms of Service)"}
                </h3>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="text-[#71717a] hover:text-[#e26d40] p-1 rounded-xs transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Privacy Policy Content */}
            {modalType === "privacy" && (
              <div className="space-y-4 text-[#71717a] leading-relaxed pt-1">
                <p className="text-black font-semibold">
                  Terakhir Diperbarui: 17 Agustus 2026
                </p>
                <p>
                  VortX Labs (&quot;kami&quot;, &quot;platform&quot;) berkomitmen untuk melindungi dan menghormati privasi data setiap pengguna (&quot;Anda&quot;). Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, memproses, dan mengamankan informasi saat Anda menggunakan layanan kami.
                </p>

                <div className="space-y-2 bg-[#fff9f5] p-3.5 rounded-xs border border-[#f7d8c4]">
                  <h4 className="font-semibold text-[#18181b] uppercase text-[11px]">1. Informasi yang Kami Kumpulkan</h4>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li><strong>Informasi Akun:</strong> Username, email terdaftar, riwayat login, dan saldo token pengguna.</li>
                    <li><strong>Aktivitas API &amp; Komputasi:</strong> Log pemanggilan API Key, jumlah token yang digunakan, status invoice QRIS, dan ID aktivitas pekerjaan (Sortir Banned / Inference).</li>
                    <li><strong>Data Operasional:</strong> Data batch ID yang diunggah untuk pemrosesan sortir hanya disimpan sementara selama siklus pemrosesan dan pembuatan riwayat pengguna.</li>
                  </ul>
                </div>

                <div className="space-y-2 bg-[#fff9f5] p-3.5 rounded-xs border border-[#f7d8c4]">
                  <h4 className="font-semibold text-[#18181b] uppercase text-[11px]">2. Penggunaan Data</h4>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li>Menyediakan, mengoperasikan, dan memelihara seluruh modul AI Inference dan Tools Otomatisasi.</li>
                    <li>Memproses transaksi topup token dan validasi pembayaran QRIS secara real-time.</li>
                    <li>Menjalankan sistem keamanan, rate limiting, dan proteksi dari penyalahgunaan API.</li>
                    <li>Mengirimkan data hasil komputasi ke endpoint Webhook yang ditentukan oleh pengguna.</li>
                  </ul>
                </div>

                <div className="space-y-2 bg-[#fff9f5] p-3.5 rounded-xs border border-[#f7d8c4]">
                  <h4 className="font-semibold text-[#18181b] uppercase text-[11px]">3. Keamanan &amp; Perlindungan Data</h4>
                  <p className="text-[11px]">
                    Kami menerapkan enkripsi end-to-end (HTTPS/TLS) untuk seluruh komunikasi API, hashing satu arah untuk kredensial autentikasi, dan tidak pernah membagikan atau menjual data pengguna kepada pihak ketiga yang tidak berwenang.
                  </p>
                </div>

                <div className="space-y-2 bg-[#fff9f5] p-3.5 rounded-xs border border-[#f7d8c4]">
                  <h4 className="font-semibold text-[#18181b] uppercase text-[11px]">4. Kontak Layanan Privasi</h4>
                  <p className="text-[11px]">
                    Jika Anda memiliki pertanyaan mengenai privasi atau permintaan penghapusan akun, silakan hubungi tim support kami via Telegram @VortXrrr atau WhatsApp resmi.
                  </p>
                </div>
              </div>
            )}

            {/* Terms of Service Content */}
            {modalType === "terms" && (
              <div className="space-y-4 text-[#71717a] leading-relaxed pt-1">
                <p className="text-black font-semibold">
                  Terakhir Diperbarui: 17 Agustus 2026
                </p>
                <p>
                  Dengan mendaftar, mengakses, atau menggunakan platform VortX Labs, Anda menyetujui untuk terikat dengan Syarat dan Ketentuan Layanan berikut ini.
                </p>

                <div className="space-y-2 bg-[#fff9f5] p-3.5 rounded-xs border border-[#f7d8c4]">
                  <h4 className="font-semibold text-[#18181b] uppercase text-[11px]">1. Ketentuan Akun &amp; API Key</h4>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li>Pengguna bertanggung jawab penuh atas kerahasiaan API Token dan kredensial akun miliknya.</li>
                    <li>Segala aktivitas komputasi atau pemotongan saldo token yang terjadi melalui API Key yang sah dianggap dilakukan oleh pemilik akun.</li>
                  </ul>
                </div>

                <div className="space-y-2 bg-[#fff9f5] p-3.5 rounded-xs border border-[#f7d8c4]">
                  <h4 className="font-semibold text-[#18181b] uppercase text-[11px]">2. Saldo Token &amp; Pembayaran QRIS</h4>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li>Kurs konversi standar adalah 1 IDR = 1 Token (ditambah bonus kuota sesuai paket nominal).</li>
                    <li>Saldo token digunakan sebagai mata uang konsumsi komputasi dan tools di platform VortX.</li>
                    <li>Topup yang telah berhasil dibayar bersifat final dan non-refundable, kecuali terjadi kegagalan sistem internal yang terbukti secara teknis pada sistem kami.</li>
                  </ul>
                </div>

                <div className="space-y-2 bg-[#fff9f5] p-3.5 rounded-xs border border-[#f7d8c4]">
                  <h4 className="font-semibold text-[#18181b] uppercase text-[11px]">3. Aturan Penggunaan &amp; Rate Limiting</h4>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li>Fitur Sortir Banned dibatasi maksimal 20 ID per single request dan 100 ID per menit per user untuk menjaga ketersediaan engine bagi seluruh client.</li>
                    <li>Dilarang keras melakukan serangan DDoS, eksploitasi celah keamanan, atau manipulasi saldo token. Pelanggaran berat akan mengakibatkan penutupan akun permanen tanpa pengembalian dana.</li>
                  </ul>
                </div>

                <div className="space-y-2 bg-[#fff9f5] p-3.5 rounded-xs border border-[#f7d8c4]">
                  <h4 className="font-semibold text-[#18181b] uppercase text-[11px]">4. Batasan Tanggung Jawab</h4>
                  <p className="text-[11px]">
                    Layanan disediakan sebagaimana adanya (&quot;as is&quot;). VortX Labs senantiasa berupaya menjaga uptime dan performa engine, namun tidak bertanggung jawab atas gangguan yang disebabkan oleh pemeliharaan jaringan pusat pihak ketiga.
                  </p>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-[#f7d8c4] flex justify-end">
              <button
                onClick={() => setModalType(null)}
                className="px-4 py-2 bg-[#e26d40] hover:bg-[#ce592c] text-white text-xs font-semibold rounded-xs transition-all uppercase tracking-wider shadow-2xs"
              >
                Tutup Dokumen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
