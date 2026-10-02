"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";

interface PackageItem {
  id: "6h" | "12h" | "24h" | "7d" | "30d";
  label: string;
  cost: number;
  offer?: string;
}

const DEFAULT_PACKAGES: PackageItem[] = [
  { id: "6h", label: "6 Jam", cost: 10000 },
  { id: "12h", label: "12 Jam", cost: 20000 },
  { id: "24h", label: "24 Jam", cost: 38000, offer: "Hemat 5%" },
  { id: "7d", label: "7 Hari", cost: 250000, offer: "Hemat 10%" },
  { id: "30d", label: "30 Hari", cost: 900000, offer: "Hemat 25% · Best value" },
];

type License = {
  id: string;
  app_id: string;
  product_name: string;
  expires_at: string;
  bound: boolean;
  hwid?: string | null;
  reset_count: number;
  reset_limit: number;
  reset_window_days: number;
  download_url: string | null;
  revoked_at: string | null;
  activated: boolean;
  has_desktop_access: boolean;
};

function durationLeft(expiresAt: string) {
  const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days ? `${days} hari ${hours} jam` : `${hours} jam ${minutes} menit`;
}

export default function DesktopExtractorLicenseView({ onBalanceChange }: { onBalanceChange: () => void }) {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>(DEFAULT_PACKAGES);
  const [packageId, setPackageId] = useState<(typeof DEFAULT_PACKAGES)[number]["id"]>("24h");
  const [selectedLicenseId, setSelectedLicenseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState("");

  const [downloadUrl, setDownloadUrl] = useState<string>("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/desktop-license", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat subscription");
      setLicenses(data.licenses || []);
      const cfg = data.product_config;
      if (cfg) {
        if (cfg.download_url) setDownloadUrl(cfg.download_url);
        if (cfg.package_prices && typeof cfg.package_prices === "object") {
          setPackages((prev) =>
            prev.map((pkg) => ({
              ...pkg,
              cost: Number((cfg.package_prices as Record<string, number>)[pkg.id]) > 0
                ? Number((cfg.package_prices as Record<string, number>)[pkg.id])
                : pkg.cost,
            }))
          );
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    setPurchasing(true);
    setError("");
    try {
      const res = await fetch("/api/app-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", product_sku: "desktop-extractor" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal generate VRTXID.");
      setSelectedLicenseId(data.license.id);
      await load();
      onBalanceChange();
    } catch (e: any) { setError(e.message); } finally { setPurchasing(false); }
  };

  const purchase = async () => {
    if (!selectedLicenseId) return setError("Generate atau pilih VRTXID terlebih dahulu.");
    setPurchasing(true);
    setError("");
    try {
      const res = await fetch("/api/desktop-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate", license_id: selectedLicenseId, package_id: packageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal aktivasi VRTXID.");
      await load();
      onBalanceChange();
    } catch (e: any) { setError(e.message); } finally { setPurchasing(false); }
  };

  const reset = async (license: License) => {
    const hwid = window.prompt("Masukkan HWID perangkat baru:");
    if (!hwid) return;
    setError("");
    const res = await fetch("/api/app-license/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ license_id: license.id, hwid }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Reset gagal");
    await load();
  };


  // VRTXID yang bisa dipakai: yang activated/data-extractor access
  const usable = licenses.filter((l) => !l.revoked_at);

  return (
    <div className="space-y-6">
      {error && <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xs">{error}</div>}

      {/* ===== 1. DOWNLOAD OFFLINE DATA EXTRACTOR ===== */}
      <section className="border border-[#e4e4e7] rounded-xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0b0b0f] to-[#16161c]">
        <div className="text-white">
          <p className="text-sm font-semibold tracking-wide">Download Offline Data Extractor (.conf/.xml)</p>
        </div>
        {downloadUrl ? (
          <a href={downloadUrl} target="_blank" rel="noreferrer" className="shrink-0 px-5 py-2.5 bg-white text-black text-xs font-semibold rounded-xs flex items-center gap-1.5 hover:bg-orange-500 hover:text-white transition-colors">
            <Download size={14} /> Download
          </a>
        ) : (
          <span className="shrink-0 px-5 py-2.5 text-[11px] font-medium text-white/70 border border-white/20 rounded-xs">Link belum tersedia</span>
        )}
      </section>

      {/* ===== 2. GENERATE VRTXID ===== */}
      <section className="rounded-xs p-6 space-y-4 border-2 border-orange-500 bg-orange-50 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-orange-600 rounded-xs text-white shadow-2xs">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <div>
            <p className="text-base font-bold text-[#18181b] leading-tight">Generate VRTXID</p>
            <p className="text-[11px] text-[#52525b] mt-0.5">Buat ID untuk Data Extractor desktop · biaya <span className="font-mono font-semibold">100 token</span>. VRTXID yang sama juga bisa dipakai di Data Checker Tools.</p>
          </div>
        </div>
        <button onClick={generate} disabled={purchasing} className="w-full py-3 bg-orange-600 text-white text-sm font-bold rounded-xs hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
          {purchasing ? <Loader2 size={16} className="animate-spin" /> : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.6 3.4A2 2 0 1 1 17 6l-9.8 9.8-3.4 1 1-3.4Z"/><path d="M13 5l6 6"/></svg> Generate VRTXID · 100 token</>}
        </button>
        <div className="border-t border-orange-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#18181b]">Aktivasi VRTXID</p>
          <p className="text-[11px] text-[#71717a] mt-1">Pilih VRTXID belum aktif yang punya akses Data Extractor, lalu pilih durasi.</p>
        </div>
        <select value={selectedLicenseId} onChange={(event) => setSelectedLicenseId(event.target.value)} className="w-full border border-[#e4e4e7] rounded-xs px-3 py-2 text-xs bg-white">
          <option value="">Pilih VRTXID</option>
          {usable.filter((license) => !license.activated && (license.has_desktop_access || license.hwid || true)).map((license) => <option key={license.id} value={license.id}>{license.app_id} · Belum aktivasi</option>)}
        </select>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {packages.map((pkg) => (
            <button key={pkg.id} onClick={() => setPackageId(pkg.id)} className={`relative text-left p-3 rounded-xs border ${packageId === pkg.id ? "bg-black text-white border-black" : "bg-white border-[#e4e4e7]"}`}>
              {pkg.offer && <span className={`absolute -top-2 right-2 px-1.5 py-0.5 text-[9px] rounded-xs ${packageId === pkg.id ? "bg-white text-black" : "bg-black text-white"}`}>{pkg.offer}</span>}
              <p className="text-xs font-semibold">{pkg.label}</p>
              <p className="text-sm font-mono mt-2">{pkg.cost.toLocaleString("id-ID")}</p>
              <p className="text-[10px] opacity-70">token</p>
            </button>
          ))}
        </div>
        <button onClick={purchase} disabled={purchasing || !selectedLicenseId} className="w-full py-2.5 bg-black text-white text-xs rounded-xs disabled:opacity-50">{purchasing ? <Loader2 size={14} className="animate-spin mx-auto" /> : `Aktifkan VRTXID · ${packages.find((pkg) => pkg.id === packageId)?.cost.toLocaleString("id-ID")} token`}</button>
      </section>


      <section className="space-y-3">
        <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider">VRTXID Saya</p><button onClick={load} className="text-xs"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /></button></div>
        {!loading && licenses.length === 0 && <p className="text-xs text-[#71717a]">Belum ada VRTXID.</p>}
        {usable.map((license) => {
          const active = license.activated && new Date(license.expires_at) > new Date() && !license.revoked_at;
          const hasDesktop = license.has_desktop_access;
          return <div key={license.id} className="border border-[#e4e4e7] rounded-xs p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div><p className="font-mono text-sm font-semibold">{license.app_id}</p><p className={`text-[11px] mt-1 font-medium ${active ? "text-emerald-700" : license.revoked_at ? "text-red-600" : "text-amber-700"}`}>{active ? "ACTIVE" : license.revoked_at ? "REVOKED" : "BELUM AKTIVASI"} · {active ? durationLeft(license.expires_at) : "-"}</p></div>
              <p className="text-[11px] text-[#71717a]">{active ? `Berakhir ${new Date(license.expires_at).toLocaleString("id-ID")}` : "Siap diaktivasi"}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-2"><span className="text-[#71717a] block">HWID / Device</span><span className="font-mono">{license.hwid || (license.bound ? "Bound (tersembunyi)" : "Belum bind")}</span></div>
              <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-2"><span className="text-[#71717a] block">Akses Data Extractor</span><span className={hasDesktop ? "text-emerald-700 font-medium" : "text-[#71717a]"}>{hasDesktop ? "Ya" : "Belum"}</span></div>
              <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-2"><span className="text-[#71717a] block">Reset device</span><span>{license.reset_count}/{license.reset_limit} · 7 hari</span></div>
            </div>
            <div className="flex gap-2"><button onClick={() => reset(license)} disabled={!active || license.reset_count >= license.reset_limit} className="px-3 py-1.5 text-xs border border-[#e4e4e7] rounded-xs disabled:opacity-40">Reset device</button></div>
          </div>;
        })}
      </section>
    </div>
  );
}
