"use client";

import React from "react";
import { Coins, X, CheckCircle2, ShieldCheck, FolderArchive, Phone, UserCheck } from "lucide-react";

interface PricingModalProps {
  serviceCosts: any[];
  updateCost: (serviceType: string, cost: number) => void;
  onClose: () => void;
}

const SERVICE_LABELS: Record<string, { label: string; desc: string; icon: any }> = {
  'sortir-banned': {
    label: 'Sortir Banned (Web UI)',
    desc: 'Biaya komputasi pemilahan akun via Web Dashboard per ID',
    icon: ShieldCheck
  },
  'sortir-banned-api': {
    label: 'Sortir Banned (Calling REST API)',
    desc: 'Biaya komputasi pemilahan akun via API Key / Reseller per ID',
    icon: ShieldCheck
  },
  'data-extractor': {
    label: 'Data Extractor',
    desc: 'Biaya ekstraksi database akun per akun/file .conf',
    icon: FolderArchive
  },
  'intip-nomor': {
    label: 'Intip Nomor',
    desc: 'Biaya cek nomor HP & email terikat per ID',
    icon: Phone
  },
  'cek-info-akun': {
    label: 'Cek Info Akun',
    desc: 'Biaya cek detail akun (Chip, VIP, Kartu) per akun',
    icon: UserCheck
  }
};

export function PricingModal({
  serviceCosts,
  updateCost,
  onClose
}: PricingModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border border-[#e4e4e7] rounded-xs w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e4e4e7] bg-[#fafafa] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-black text-white rounded-xs">
              <Coins size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#18181b] tracking-tight">
                Konfigurasi Harga Layanan
              </h2>
              <p className="text-[11px] text-[#71717a]">
                Biaya token dipotong otomatis saat user mengeksekusi layanan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#71717a] hover:text-[#18181b] hover:bg-white border border-transparent hover:border-[#e4e4e7] rounded-xs transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xs text-[11px] text-emerald-800">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-700 shrink-0" />
              <span>Perubahan langsung tersimpan otomatis ke database</span>
            </div>
          </div>

          <div className="space-y-3">
            {serviceCosts.length > 0 ? (
              serviceCosts.map((config: any) => {
                const meta = SERVICE_LABELS[config.service_type] || {
                  label: config.service_type,
                  desc: "Konfigurasi biaya layanan",
                  icon: Coins
                };
                const Icon = meta.icon;

                return (
                  <div
                    key={config.service_type}
                    className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-4 flex items-center justify-between gap-4 transition-all hover:border-black"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white border border-[#e4e4e7] rounded-xs text-black shrink-0 mt-0.5 shadow-2xs">
                        <Icon size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#18181b]">
                          {meta.label}
                        </p>
                        <p className="text-[11px] text-[#71717a] mt-0.5">
                          {meta.desc}
                        </p>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-[#a1a1aa] block mt-1">
                          SKU: {config.service_type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative">
                        <input
                          type="number"
                          value={config.cost_per_id}
                          onChange={(e) =>
                            updateCost(
                              config.service_type,
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                          className="w-20 bg-white border border-[#e4e4e7] rounded-xs px-3 py-1.5 text-xs font-mono font-bold text-[#18181b] outline-none focus:border-black transition-all text-center shadow-2xs"
                          min="0"
                        />
                      </div>
                      <span className="text-xs text-[#71717a] font-mono">Token</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-[#71717a] text-xs py-8 font-mono">
                Belum ada konfigurasi biaya layanan aktif.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}