"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import VortXLogo from "@/components/VortXLogo";
import Footer from "@/components/Footer";
import {
  ArrowLeft,
  Users,
  CreditCard,
  Package,
  BarChart3,
  RefreshCcw,
  Coins,
  Shield,
  Clock,
  Sparkles,
  LayoutDashboard,
  ExternalLink
} from "lucide-react";
import { OverviewTab } from "./_components/OverviewTab";
import { UsersModal } from "./_components/UsersModal";
import { TransactionsTab } from "./_components/TransactionsTab";
import { PricingModal } from "./_components/PricingModal";
import { ProductsModal } from "./_components/ProductsModal";
import { FilesModal } from "./_components/FilesModal";

type ActiveTab = "overview" | "transactions";

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [serviceCosts, setServiceCosts] = useState<any[]>([]);
  const [txFilter, setTxFilter] = useState("topup");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [showFilesModal, setShowFilesModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) throw new Error();
        const user = await res.json();
        if (user.role !== "admin") {
          router.push("/dashboard");
          return;
        }
      } catch {
        router.push("/");
        return;
      }
      loadAll();
    })();
  }, [router]);

  const loadAll = async () => {
    setIsRefreshing(true);
    try {
      const [statsRes, usersRes, txRes, prodRes, priceRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/users"),
        fetch(`/api/admin/transactions?type=${txFilter}`),
        fetch("/api/admin/products"),
        fetch("/api/admin/service-configs"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (txRes.ok) {
        const d = await txRes.json();
        setTransactions(Array.isArray(d) ? d : d.transactions || []);
      }
      if (prodRes.ok) {
        const d = await prodRes.json();
        setProducts(d.products || []);
      }
      if (priceRes.ok) setServiceCosts(await priceRes.json());
    } catch {}
    finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/transactions?type=${txFilter}`);
        if (res.ok) {
          const d = await res.json();
          setTransactions(Array.isArray(d) ? d : d.transactions || []);
        }
      } catch {}
    })();
  }, [txFilter]);

  const adjustCoin = async (userId: string, amount: number) => {
    if (!confirm(`Konfirmasi penyesuaian: ${amount > 0 ? "+" : ""}${amount} token untuk user ini?`))
      return;
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "adjust_coin", userId, amount }),
    });
    loadAll();
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus user ini secara permanen?"))
      return;
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", userId }),
    });
    loadAll();
  };

  const approveTx = async (id: string) => {
    await fetch("/api/admin/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "completed" }),
    });
    loadAll();
  };

  const updateProduct = async (sku: string, updates: any) => {
    try {
      await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, updates }),
      });
      setProducts((prev) => prev.map((p) => (p.sku === sku ? { ...p, ...updates } : p)));
    } catch (e) {
      console.error(e);
    }
  };

  const updateCost = async (serviceType: string, cost: number) => {
    await fetch("/api/admin/service-configs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_type: serviceType, cost_per_id: cost }),
    });
    setServiceCosts((prev) =>
      prev.map((c) =>
        c.service_type === serviceType ? { ...c, cost_per_id: cost } : c
      )
    );
  };

  return (
    <div className="min-h-screen bg-white text-[#18181b] flex flex-col font-mono selection:bg-black selection:text-white">
      {/* Top Sticky Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-[#e4e4e7] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative">
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-1.5 text-[#71717a] hover:text-[#18181b] hover:bg-[#fafafa] border border-transparent hover:border-[#e4e4e7] rounded-xs transition-colors cursor-pointer"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => router.push("/dashboard")}>
              <VortXLogo size="lg" />
              <span className="bg-black text-white text-[10px] font-semibold font-mono px-2 py-0.5 rounded-xs tracking-wider uppercase">
                ADMIN
              </span>
            </div>
          </div>

          {/* Centered Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#71717a] absolute left-1/2 -translate-x-1/2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`transition-colors cursor-pointer ${
                activeTab === "overview" ? "text-black font-bold" : "hover:text-black"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`transition-colors cursor-pointer ${
                activeTab === "transactions" ? "text-black font-bold" : "hover:text-black"
              }`}
            >
              Transaksi
            </button>
            <button
              onClick={() => setShowUsersModal(true)}
              className="hover:text-black transition-colors cursor-pointer"
            >
              Pengguna ({users.length})
            </button>
            <button
              onClick={() => setShowPricingModal(true)}
              className="hover:text-black transition-colors cursor-pointer"
            >
              Harga Layanan
            </button>
            <button
              onClick={() => setShowProductsModal(true)}
              className="hover:text-black transition-colors cursor-pointer"
            >
              Produk ({products.length})
            </button>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={loadAll}
              disabled={isRefreshing}
              title="Refresh data"
              className="p-2 bg-[#fafafa] hover:bg-white border border-[#e4e4e7] hover:border-black rounded-xs text-[#71717a] hover:text-black transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            >
              <RefreshCcw
                size={13}
                className={isRefreshing ? "animate-spin text-black" : ""}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => router.push("/dashboard")}
              className="px-3.5 py-1.5 bg-black hover:bg-[#27272a] text-white rounded-xs text-xs font-semibold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <LayoutDashboard size={13} />
              <span>User Dashboard</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content View */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        {/* Page Title & Navigation Tabs for Mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e4e4e7]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-[#71717a]">Pusat Administrasi & Analisis Realtime</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#18181b]">
              Admin Control Hub
            </h1>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="flex items-center bg-[#fafafa] border border-[#e4e4e7] p-1 rounded-xs gap-1 shadow-2xs">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-xs transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-black text-white shadow-2xs"
                  : "text-[#71717a] hover:text-black"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-xs transition-all cursor-pointer ${
                activeTab === "transactions"
                  ? "bg-black text-white shadow-2xs"
                  : "text-[#71717a] hover:text-black"
              }`}
            >
              Transaksi Terbaru
            </button>
          </div>
        </div>

        {/* Dynamic Tab Body */}
        {activeTab === "overview" && (
          <OverviewTab
            stats={stats}
            setActiveTab={(tab) => setActiveTab(tab as ActiveTab)}
            onManageUsers={() => setShowUsersModal(true)}
            onManagePricing={() => setShowPricingModal(true)}
            onManageProducts={() => setShowProductsModal(true)}
            onManageFiles={() => setShowFilesModal(true)}
          />
        )}

        {activeTab === "transactions" && (
          <TransactionsTab
            transactions={transactions}
            txFilter={txFilter}
            setTxFilter={setTxFilter}
            approveTx={approveTx}
          />
        )}
      </main>

      {/* Modals */}
      {showUsersModal && (
        <UsersModal
          users={users}
          adjustCoin={adjustCoin}
          deleteUser={deleteUser}
          onClose={() => setShowUsersModal(false)}
        />
      )}

      {showPricingModal && (
        <PricingModal
          serviceCosts={serviceCosts}
          updateCost={updateCost}
          onClose={() => setShowPricingModal(false)}
        />
      )}

      {showProductsModal && (
        <ProductsModal
          products={products}
          updateProduct={updateProduct}
          onClose={() => setShowProductsModal(false)}
        />
      )}

      {showFilesModal && (
        <FilesModal
          isOpen={showFilesModal}
          onClose={() => {
            setShowFilesModal(false);
            loadAll();
          }}
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}