"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, Loader2, RefreshCw } from "lucide-react";

interface PackageItem {
  id: "6h" | "12h" | "24h" | "7d" | "30d";
  label: string;
  cost: number;
  offer?: string;
}

const PACKAGES: PackageItem[] = [
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
};

function durationLeft(expiresAt: string) {
  const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days ? `${days} hari ${hours} jam` : `${hours} jam ${minutes} menit`;
}

export default function NewCheckerView({ onBalanceChange }: { onBalanceChange: () => void }) {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [packageId, setPackageId] = useState<(typeof PACKAGES)[number]["id"]>("24h");
  const [selectedLicenseId, setSelectedLicenseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState("");
  const [newSecret, setNewSecret] = useState<{ app_id: string; app_secret: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/app-license", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat subscription");
      setLicenses(data.licenses || []);
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
    setNewSecret(null);
    try {
      const res = await fetch("/api/app-license", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "generate" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal generate VRTXID.");
      setNewSecret({ app_id: data.license.app_id, app_secret: data.license.app_secret });
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
      const res = await fetch("/api/app-license", {
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

  const copyCredentials = async () => {
    if (!newSecret) return;
    await navigator.clipboard.writeText(`${newSecret.app_id}.${newSecret.app_secret}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      {error && <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xs">{error}</div>}

      <section className="border border-[#e4e4e7] rounded-xs p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider">Download Tools</p>
            <p className="text-[11px] text-[#71717a] mt-1">Download software Data Checker versi terbaru. Aktivasi tetap diverifikasi saat aplikasi dibuka.</p>
          </div>
          <a href={licenses.find((license) => license.activated && !license.revoked_at && new Date(license.expires_at) > new Date()) ? `/api/app-license/download?license_id=${licenses.find((license) => license.activated && !license.revoked_at && new Date(license.expires_at) > new Date())?.id}` : "#"} className="px-3 py-2 bg-black text-white text-xs rounded-xs flex items-center gap-1.5"><Download size={13} /> Download .exe</a>
        </div>
      </section>

      <section className="border border-[#e4e4e7] rounded-xs p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider">Generate VRTXID</p>
          <p className="text-[11px] text-[#71717a] mt-1">Buat ID terlebih dahulu. Biaya generate: 100 token. Setelah itu pilih paket aktivasi.</p>
        </div>
        <button onClick={generate} disabled={purchasing} className="w-full py-2.5 border border-black text-black text-xs rounded-xs disabled:opacity-50">{purchasing ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Generate VRTXID · 100 token"}</button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider">Aktivasi VRTXID</p>
          <p className="text-[11px] text-[#71717a] mt-1">Pilih VRTXID yang belum aktif, lalu pilih durasi.</p>
        </div>
        <select value={selectedLicenseId} onChange={(event) => setSelectedLicenseId(event.target.value)} className="w-full border border-[#e4e4e7] rounded-xs px-3 py-2 text-xs bg-white">
          <option value="">Pilih VRTXID</option>
          {licenses.filter((license) => !license.activated && !license.revoked_at).map((license) => <option key={license.id} value={license.id}>{license.app_id} · Belum aktivasi</option>)}
        </select>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {PACKAGES.map((pkg) => (
            <button key={pkg.id} onClick={() => setPackageId(pkg.id)} className={`relative text-left p-3 rounded-xs border ${packageId === pkg.id ? "bg-black text-white border-black" : "bg-[#fafafa] border-[#e4e4e7]"}`}>
              {pkg.offer && <span className={`absolute -top-2 right-2 px-1.5 py-0.5 text-[9px] rounded-xs ${packageId === pkg.id ? "bg-white text-black" : "bg-black text-white"}`}>{pkg.offer}</span>}
              <p className="text-xs font-semibold">{pkg.label}</p>
              <p className="text-sm font-mono mt-2">{pkg.cost.toLocaleString("id-ID")}</p>
              <p className="text-[10px] opacity-70">token</p>
            </button>
          ))}
        </div>
        <button onClick={purchase} disabled={purchasing || !selectedLicenseId} className="w-full py-2.5 bg-black text-white text-xs rounded-xs disabled:opacity-50">{purchasing ? <Loader2 size={14} className="animate-spin mx-auto" /> : `Aktifkan VRTXID · ${PACKAGES.find((pkg) => pkg.id === packageId)?.cost.toLocaleString("id-ID")} token`}</button>
      </section>

      {newSecret && (
        <section className="bg-emerald-50 border border-emerald-200 rounded-xs p-4 space-y-3">
          <p className="text-xs font-semibold text-emerald-800">Kode aktivasi dibuat. Simpan kode ini; tidak ditampilkan ulang.</p>
          <code className="block text-xs break-all bg-white border border-emerald-200 p-3 rounded-xs">{newSecret.app_id}.{newSecret.app_secret}</code>
          <button onClick={copyCredentials} className="px-3 py-1.5 bg-black text-white text-xs rounded-xs flex items-center gap-1.5">{copied ? <Check size={13} /> : <Copy size={13} />} Salin kode aktivasi</button>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider">Active VRTXID</p><button onClick={load} className="text-xs"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /></button></div>
        {!loading && licenses.length === 0 && <p className="text-xs text-[#71717a]">Belum ada VRTXID.</p>}
        {licenses.map((license) => {
          const active = license.activated && new Date(license.expires_at) > new Date() && !license.revoked_at;
          return <div key={license.id} className="border border-[#e4e4e7] rounded-xs p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div><p className="font-mono text-sm font-semibold">{license.app_id}</p><p className={`text-[11px] mt-1 font-medium ${active ? "text-emerald-700" : license.revoked_at ? "text-red-600" : "text-amber-700"}`}>{active ? "ACTIVE" : license.revoked_at ? "REVOKED" : "BELUM AKTIVASI"} · {active ? durationLeft(license.expires_at) : "-"}</p></div>
              <p className="text-[11px] text-[#71717a]">{active ? `Berakhir ${new Date(license.expires_at).toLocaleString("id-ID")}` : "Siap diaktivasi"}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-2"><span className="text-[#71717a] block">HWID / Device</span><span className="font-mono">{license.hwid || (license.bound ? "Bound (tersembunyi)" : "Belum bind")}</span></div>
              <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-2"><span className="text-[#71717a] block">Aktif duration</span><span>{active ? durationLeft(license.expires_at) : "Belum aktivasi"}</span></div>
              <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-2"><span className="text-[#71717a] block">Reset device</span><span>{license.reset_count}/{license.reset_limit} · 7 hari</span></div>
            </div>
            <div className="flex gap-2"><button onClick={() => reset(license)} disabled={!active || license.reset_count >= license.reset_limit} className="px-3 py-1.5 text-xs border border-[#e4e4e7] rounded-xs disabled:opacity-40">Reset device</button>{active && license.download_url && <a href={`/api/app-license/download?license_id=${license.id}`} className="px-3 py-1.5 text-xs bg-black text-white rounded-xs flex items-center gap-1.5"><Download size={13} /> Download</a>}</div>
          </div>;
        })}
      </section>
    </div>
  );
}
