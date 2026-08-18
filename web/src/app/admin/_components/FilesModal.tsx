"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FolderArchive,
  HardDrive,
  Trash2,
  Download,
  RefreshCw,
  Search,
  AlertTriangle,
  FileCheck,
  CheckCircle2
} from "lucide-react";

interface FilesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FilesModal({ isOpen, onClose }: FilesModalProps) {
  const [data, setData] = useState<{
    totalFiles: number;
    totalSizeBytes: number;
    totalSizeFormatted: string;
    files: any[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);

  const loadFiles = async () => {
    setLoading(true);
    setActionMsg(null);
    try {
      const res = await fetch("/api/admin/files");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDeleteSingle = async (relPath: string) => {
    if (!confirm(`Hapus file "${relPath}" secara permanen dari storage VPS?`)) return;
    setDeletingPath(relPath);
    try {
      const res = await fetch("/api/admin/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relPath }),
      });
      const resJson = await res.json();
      if (res.ok) {
        setActionMsg("File berhasil dihapus dari storage VPS.");
        loadFiles();
      } else {
        alert(resJson.message || "Gagal menghapus file.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setDeletingPath(null);
    }
  };

  const handleDeleteAll = async () => {
    if (
      !confirm(
        "PERINGATAN: Anda akan menghapus SELURUH file .zip data extractor di VPS untuk mengosongkan storage. Lanjutkan?"
      )
    )
      return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteAll: true }),
      });
      const resJson = await res.json();
      if (res.ok) {
        setActionMsg(resJson.message);
        loadFiles();
      } else {
        alert(resJson.message || "Gagal menghapus.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  const filteredFiles = (data?.files || []).filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.subfolder.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono animate-in fade-in duration-100">
      <div className="bg-white border border-[#e4e4e7] rounded-xs max-w-4xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e4e4e7]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#fafafa] border border-[#e4e4e7] rounded-xs text-black">
              <HardDrive size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#18181b]">
                Storage &amp; File Monitoring VPS
              </h3>
              <p className="text-[11px] text-[#71717a]">
                Monitoring berkas upload Data Extractor tanpa perlu akses SSH
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#71717a] hover:text-black p-1 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Message */}
        {actionMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xs flex items-center gap-2">
            <CheckCircle2 size={14} />
            <span>{actionMsg}</span>
          </div>
        )}

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-[#fafafa] border border-[#e4e4e7] rounded-xs">
            <div className="text-[10px] uppercase tracking-wider text-[#71717a] font-medium">
              Total Berkas Tersimpan
            </div>
            <div className="text-lg font-bold text-[#18181b] mt-0.5">
              {data?.totalFiles ?? 0} File
            </div>
          </div>
          <div className="p-3.5 bg-[#fafafa] border border-[#e4e4e7] rounded-xs">
            <div className="text-[10px] uppercase tracking-wider text-[#71717a] font-medium">
              Total Ukuran Storage
            </div>
            <div className="text-lg font-bold text-[#e26d40] mt-0.5">
              {data?.totalSizeFormatted ?? "0 Bytes"}
            </div>
          </div>
          <div className="p-3.5 bg-[#fafafa] border border-[#e4e4e7] rounded-xs flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#71717a] font-medium">
                Pembersihan Otomatis
              </div>
              <button
                onClick={handleDeleteAll}
                disabled={loading || (data?.totalFiles ?? 0) === 0}
                className="mt-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xs text-[10px] font-semibold uppercase tracking-wider transition-all disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={11} />
                <span>Bersihkan Semua</span>
              </button>
            </div>
            <button
              onClick={loadFiles}
              disabled={loading}
              className="p-2 bg-white border border-[#e4e4e7] hover:border-black rounded-xs text-black transition-colors cursor-pointer"
              title="Refresh Daftar File"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama file atau folder upload..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#fafafa] border border-[#e4e4e7] rounded-xs focus:outline-none focus:border-black transition-colors"
          />
        </div>

        {/* Files Table */}
        <div className="flex-1 overflow-y-auto border border-[#e4e4e7] rounded-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#fafafa] border-b border-[#e4e4e7] text-[10px] uppercase tracking-wider text-[#71717a]">
                <th className="py-2.5 px-3 font-semibold">Nama Berkas</th>
                <th className="py-2.5 px-3 font-semibold">Direktori</th>
                <th className="py-2.5 px-3 font-semibold">Ukuran</th>
                <th className="py-2.5 px-3 font-semibold">Waktu Upload</th>
                <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e4e7]">
              {loading && !data ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#71717a]">
                    <RefreshCw size={18} className="animate-spin mx-auto mb-2" />
                    Memuat daftar file storage VPS...
                  </td>
                </tr>
              ) : filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#71717a]">
                    <FolderArchive size={24} className="mx-auto mb-2 opacity-50" />
                    {search ? "Tidak ada file yang cocok dengan pencarian." : "Belum ada file di storage uploads VPS."}
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-[#fafafa]/80 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-[#18181b] flex items-center gap-2 max-w-xs truncate">
                      <FolderArchive size={14} className="text-[#e26d40] shrink-0" />
                      <span className="truncate" title={file.name}>
                        {file.name}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#71717a] font-mono text-[11px]">
                      {file.subfolder}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#18181b]">
                      {file.sizeFormatted}
                    </td>
                    <td className="py-2.5 px-3 text-[#71717a] text-[11px]">
                      {new Date(file.createdAt).toLocaleString("id-ID")}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`/api/admin/files/download?file=${encodeURIComponent(file.relPath)}`}
                          download={file.name}
                          className="px-2.5 py-1 bg-black text-white hover:bg-[#27272a] rounded-xs text-[11px] font-medium transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                          title="Download Berkas ke Komputer"
                        >
                          <Download size={11} />
                          <span>Unduh</span>
                        </a>
                        <button
                          onClick={() => handleDeleteSingle(file.relPath)}
                          disabled={deletingPath === file.relPath}
                          className="p-1.5 bg-white hover:bg-red-50 border border-[#e4e4e7] hover:border-red-300 text-red-600 rounded-xs transition-colors cursor-pointer"
                          title="Hapus dari VPS"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#e4e4e7] text-[11px] text-[#71717a]">
          <span>Path: <code className="text-black bg-[#fafafa] px-1 py-0.5 rounded-xs">/public/uploads/data/</code></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-black text-white text-xs rounded-xs hover:bg-[#27272a] transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
