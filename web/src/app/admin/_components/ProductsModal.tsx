"use client";

import React, { useState, useEffect } from "react";
import { Package, X, Check, Clock, Calendar, Save, HardDriveDownload, Coins } from "lucide-react";

interface ProductsModalProps {
  products: any[];
  updateProduct: (sku: string, updates: any) => void;
  onClose: () => void;
}

const PACKAGE_KEYS: { key: string; label: string }[] = [
  { key: "6h", label: "6 Jam" },
  { key: "12h", label: "12 Jam" },
  { key: "24h", label: "24 Jam" },
  { key: "7d", label: "7 Hari" },
  { key: "30d", label: "30 Hari" },
];

export function ProductsModal({ products, updateProduct, onClose }: ProductsModalProps) {
  // Local editable state keyed by sku
  const [costPerDay, setCostPerDay] = useState<Record<string, string>>({});
  const [minDayRent, setMinDayRent] = useState<Record<string, string>>({});
  const [packages, setPackages] = useState<Record<string, Record<string, string>>>({});
  const [downloadUrl, setDownloadUrl] = useState<Record<string, string>>({});
  const [savedSku, setSavedSku] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const isDesktop = (sku: string) => sku === "desktop-extractor";

  // Initialize editable state once per product from server data
  useEffect(() => {
    setCostPerDay((prev) => {
      const next = { ...prev };
      products.forEach((p) => { if (next[p.sku] === undefined) next[p.sku] = String(p.cost_per_day ?? 0); });
      return next;
    });
    setMinDayRent((prev) => {
      const next = { ...prev };
      products.forEach((p) => { if (next[p.sku] === undefined) next[p.sku] = String(p.min_day_rent ?? 1); });
      return next;
    });
    setDownloadUrl((prev) => {
      const next = { ...prev };
      products.forEach((p) => { if (isDesktop(p.sku) && next[p.sku] === undefined) next[p.sku] = p.download_url || ""; });
      return next;
    });
    setPackages((prev) => {
      const next = { ...prev };
      products.forEach((p) => {
        if (!isDesktop(p.sku) || next[p.sku]) return;
        const pkgs = p.package_prices && typeof p.package_prices === "object" ? p.package_prices : {};
        const row = PACKAGE_KEYS.reduce<Record<string, string>>((acc, { key }) => {
          acc[key] = String((pkgs as any)?.[key] ?? 0);
          return acc;
        }, {});
        next[p.sku] = row;
      });
      return next;
    });
  }, [products]);

  const handleSave = async (sku: string) => {
    setSaving(sku);
    const updates: any = {
      cost_per_day: parseInt(costPerDay[sku] || "0", 10) || 0,
      min_day_rent: parseInt(minDayRent[sku] || "1", 10) || 1,
    };
    if (isDesktop(sku)) {
      const pkgObj = PACKAGE_KEYS.reduce<Record<string, number>>((acc, { key }) => {
        acc[key] = parseInt(packages[sku]?.[key] || "0", 10) || 0;
        return acc;
      }, {});
      updates.package_prices = pkgObj;
      updates.download_url = downloadUrl[sku] || null;
    }
    await updateProduct(sku, updates);
    setSaving(null);
    setSavedSku(sku);
    setTimeout(() => setSavedSku(null), 1500);
  };

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
                {products.length} produk lisensi terdaftar — harga bisa diedit langsung
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
          {products.length > 0 ? (
            products.map((p: any) => {
              return (
                <div
                  key={p.sku}
                  className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-4 space-y-3 hover:border-black transition-all"
                >
                  {/* Product identity */}
                  <div className="flex items-center justify-between gap-4">
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
                    <button
                      onClick={() => handleSave(p.sku)}
                      disabled={saving === p.sku}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-xs transition-all cursor-pointer ${
                        savedSku === p.sku
                          ? "bg-emerald-600 text-white"
                          : "bg-black text-white hover:bg-[#27272a]"
                      }`}
                    >
                      {saving === p.sku ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Menyimpan...
                        </>
                      ) : savedSku === p.sku ? (
                        <>
                          <Check size={11} /> Tersimpan
                        </>
                      ) : (
                        <>
                          <Save size={11} /> Simpan
                        </>
                      )}
                    </button>
                  </div>

                  {/* Editable fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2.5 bg-white border border-[#e4e4e7] rounded-xs px-3 py-2.5 shadow-2xs">
                      <Clock size={14} className="text-[#71717a] shrink-0" />
                      <span className="text-[10px] uppercase tracking-wider text-[#71717a] shrink-0">Tarif / Hari</span>
                      <input
                        type="number"
                        min="0"
                        value={costPerDay[p.sku] ?? String(p.cost_per_day ?? 0)}
                        onChange={(e) =>
                          setCostPerDay((prev) => ({ ...prev, [p.sku]: e.target.value }))
                        }
                        className="flex-1 w-full bg-transparent text-right text-xs font-bold font-mono text-[#18181b] outline-none"
                      />
                      <span className="text-[10px] text-[#71717a]">Tok</span>
                    </div>
                    <div className="flex items-center gap-2.5 bg-white border border-[#e4e4e7] rounded-xs px-3 py-2.5 shadow-2xs">
                      <Calendar size={14} className="text-[#71717a] shrink-0" />
                      <span className="text-[10px] uppercase tracking-wider text-[#71717a] shrink-0">Min. Sewa</span>
                      <input
                        type="number"
                        min="1"
                        value={minDayRent[p.sku] ?? String(p.min_day_rent ?? 1)}
                        onChange={(e) =>
                          setMinDayRent((prev) => ({ ...prev, [p.sku]: e.target.value }))
                        }
                        className="flex-1 w-full bg-transparent text-right text-xs font-bold font-mono text-[#18181b] outline-none"
                      />
                      <span className="text-[10px] text-[#71717a]">Hari</span>
                    </div>
                  </div>

                  {/* Data Extractor: package prices + download URL */}
                  {isDesktop(p.sku) && (
                    <>
                      <div className="border-t border-dashed border-[#e4e4e7] pt-3">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#71717a] font-semibold mb-2">
                          <Coins size={12} /> Harga Paket Sewa Data Extractor
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {PACKAGE_KEYS.map(({ key, label }) => (
                            <div key={key} className="bg-white border border-[#e4e4e7] rounded-xs p-2 shadow-2xs">
                              <span className="text-[9px] text-[#71717a] uppercase tracking-wider block mb-1">
                                {label}
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={packages[p.sku]?.[key] ?? 0}
                                onChange={(e) =>
                                  setPackages((prev) => ({
                                    ...prev,
                                    [p.sku]: { ...(prev[p.sku] || {}), [key]: e.target.value },
                                  }))
                                }
                                className="w-full bg-transparent text-right text-xs font-bold font-mono text-[#18181b] outline-none"
                              />
                              <span className="text-[9px] text-[#71717a] text-right block">token</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-dashed border-[#e4e4e7] pt-3">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#71717a] font-semibold mb-2">
                          <HardDriveDownload size={12} /> Link Download .exe
                        </div>
                        <input
                          type="url"
                          value={downloadUrl[p.sku] ?? (p.download_url || "")}
                          onChange={(e) =>
                            setDownloadUrl((prev) => ({ ...prev, [p.sku]: e.target.value }))
                          }
                          placeholder="https://... (kosongkan jika belum tersedia)"
                          className="w-full bg-white border border-[#e4e4e7] rounded-xs px-3 py-2 text-xs font-mono text-[#18181b] outline-none focus:border-black transition-all shadow-2xs"
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center text-[#71717a] text-xs py-8 font-mono">
              Tidak ada produk software yang terdaftar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}