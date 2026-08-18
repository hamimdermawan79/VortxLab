"use client";

import React, { useState } from "react";
import {
  Users,
  Search,
  ArrowUpDown,
  Coins,
  X,
  Shield,
  Trash2,
  Sliders,
  Calendar,
  AlertCircle
} from "lucide-react";
import { StatCard } from "./StatCard";

interface UsersModalProps {
  users: any[];
  adjustCoin: (userId: string, amount: number) => void;
  deleteUser: (userId: string) => void;
  onClose: () => void;
}

export function UsersModal({
  users,
  adjustCoin,
  deleteUser,
  onClose
}: UsersModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"username" | "vcoin_balance" | "created_at">("username");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Calculate user statistics
  const totalUsers = users.length;
  const adminCount = users.filter((u: any) => u.role === "admin").length;
  const whaleCount = users.filter((u: any) => (u.vcoin_balance || 0) > 100000).length;

  // Filter and sort users
  const filteredUsers = users.filter(
    (user) =>
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone && user.phone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aValue = a[sortBy] ?? "";
    const bValue = b[sortBy] ?? "";

    if (typeof aValue === "string") {
      const comparison = aValue.localeCompare(String(bValue));
      return sortOrder === "asc" ? comparison : -comparison;
    } else {
      const comparison = (Number(aValue) || 0) - (Number(bValue) || 0);
      return sortOrder === "asc" ? comparison : -comparison;
    }
  });

  const toggleSort = (field: "username" | "vcoin_balance" | "created_at") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border border-[#e4e4e7] rounded-xs w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e4e4e7] bg-[#fafafa] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-black text-white rounded-xs">
              <Users size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#18181b] tracking-tight">
                Manajemen Pengguna
              </h2>
              <p className="text-[11px] text-[#71717a]">
                Total {totalUsers} akun terdaftar di sistem VortX
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
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Total Akun Pengguna"
              value={totalUsers}
              icon={<Users size={16} />}
            />
            <StatCard
              label="Akun Administrator"
              value={adminCount}
              icon={<Shield size={16} />}
            />
            <StatCard
              label="Whale Users (>100k Token)"
              value={whaleCount}
              icon={<Coins size={16} />}
            />
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]"
              size={14}
            />
            <input
              type="text"
              placeholder="Cari berdasarkan username atau email..."
              className="w-full pl-9 pr-4 py-2 bg-[#fafafa] border border-[#e4e4e7] rounded-xs text-xs font-mono text-[#18181b] outline-none focus:border-black focus:bg-white transition-all shadow-2xs placeholder:text-[#a1a1aa]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Users Table */}
          <div className="bg-white border border-[#e4e4e7] rounded-xs shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="sticky top-0 bg-[#fafafa] border-b border-[#e4e4e7] z-10">
                  <tr className="text-[#71717a] uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-3 font-semibold">
                      <button
                        onClick={() => toggleSort("username")}
                        className="flex items-center gap-1 hover:text-[#18181b] transition-colors cursor-pointer"
                      >
                        <span>Username</span>
                        <ArrowUpDown size={12} />
                      </button>
                    </th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">
                      <button
                        onClick={() => toggleSort("vcoin_balance")}
                        className="flex items-center gap-1 hover:text-[#18181b] transition-colors cursor-pointer"
                      >
                        <span>Saldo Token</span>
                        <ArrowUpDown size={12} />
                      </button>
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      <button
                        onClick={() => toggleSort("created_at")}
                        className="flex items-center gap-1 hover:text-[#18181b] transition-colors cursor-pointer"
                      >
                        <span>Terdaftar</span>
                        <ArrowUpDown size={12} />
                      </button>
                    </th>
                    <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4e4e7]">
                  {sortedUsers.length > 0 ? (
                    sortedUsers.map((u: any) => (
                      <tr key={u.id} className="hover:bg-[#fafafa] transition-colors">
                        <td className="px-4 py-3 font-medium text-[#18181b]">
                          <div>
                            <p className="font-semibold">{u.username}</p>
                            {u.email && (
                              <p className="text-[10px] text-[#71717a]">{u.email}</p>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-xs text-[10px] font-semibold uppercase tracking-wider ${
                              u.role === "admin"
                                ? "bg-black text-white"
                                : "bg-[#fafafa] text-[#71717a] border border-[#e4e4e7]"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-semibold text-[#18181b]">
                          {(u.vcoin_balance || 0).toLocaleString("id-ID")}
                        </td>

                        <td className="px-4 py-3 text-[#71717a] text-[11px] whitespace-nowrap">
                          {u.created_at
                            ? new Date(u.created_at).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                const amountStr = window.prompt(
                                  `Sesuaikan Saldo Token untuk [${u.username}]\n(Masukkan angka positif untuk menambah, negatif untuk mengurangi. Contoh: 10000 atau -5000):`,
                                  "10000"
                                );
                                if (!amountStr) return;
                                const amount = parseInt(amountStr, 10);
                                if (!isNaN(amount)) {
                                  adjustCoin(u.id, amount);
                                }
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-[#fafafa] border border-[#e4e4e7] hover:border-black text-[#18181b] rounded-xs text-[11px] font-medium transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                            >
                              <Coins size={11} />
                              <span>Adjust</span>
                            </button>

                            {u.role !== "admin" && (
                              <button
                                onClick={() => deleteUser(u.id)}
                                className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-[#e4e4e7] hover:border-rose-300 text-rose-600 rounded-xs text-[11px] font-medium transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                              >
                                <Trash2 size={11} />
                                <span>Hapus</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-[#71717a] font-mono">
                        Tidak ada data pengguna yang sesuai pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}