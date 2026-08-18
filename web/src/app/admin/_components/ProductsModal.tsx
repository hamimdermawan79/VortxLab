"use client";

import React from "react";
import { Package, X, Check, Clock, Calendar } from "lucide-react";

interface ProductsModalProps {
  products: any[];
  onClose: () => void;
}

export function ProductsModal({ products, onClose }: ProductsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border border-[#e4e4e7] rounded-xs w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e4e4e7] bg-[#fafafa] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-black text-white rounded-xs">
              <Package size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#18181b] tracking-tight">
                Katalog Produk Software & Rental
              </h2>
              <p className="text-[11px] text-[#71717a]">
                {products.length} produk lisensi terdaftar dalam sistem
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
          <div className="space-y-3">
            {products.length > 0 ? (
              products.map((p: any) => (
                <div
                  key={p.sku}
                  className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-black transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-[#18181b]">
                        {p.display_name || p.name}
                      </p>
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded-xs text-[9px] font-semibold uppercase tracking-wider ${
                          p.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                        }`}
                      >
                        {p.is_active ? "Aktif" : "Non-aktif"}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[#71717a] mt-0.5 block">
                      SKU: {p.sku}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs shrink-0">
                    <div className="p-2 bg-white border border-[#e4e4e7] rounded-xs text-right shadow-2xs">
                      <p className="text-[9px] text-[#71717a] uppercase tracking-wider">
                        Tarif / Hari
                      </p>
                      <p className="font-bold font-mono text-[#18181b]">
                        {p.cost_per_day?.toLocaleString("id-ID")} Token
                      </p>
                    </div>

                    <div className="p-2 bg-white border border-[#e4e4e7] rounded-xs text-right shadow-2xs">
                      <p className="text-[9px] text-[#71717a] uppercase tracking-wider">
                        Min. Sewa
                      </p>
                      <p className="font-bold font-mono text-[#18181b]">
                        {p.min_day_rent} Hari
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-[#71717a] text-xs py-8 font-mono">
                Tidak ada produk software yang terdaftar.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}