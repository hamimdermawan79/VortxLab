"use client";

import React from "react";
import SortirCategoryView from "./SortirCategoryView";

interface SortirPolosViewProps {
  userBalance: number;
  costPerId: number;
  onBalanceChange: () => void;
}

export default function SortirPolosView({
  userBalance,
  costPerId = 50,
  onBalanceChange,
}: SortirPolosViewProps) {
  return (
    <SortirCategoryView
      title="Sortir Polos"
      subtitle="Memilah akun polos & tidak polos"
      apiEndpoint="/api/sortir-polos"
      userBalance={userBalance}
      costPerId={costPerId}
      onBalanceChange={onBalanceChange}
      categoryAName="Polos"
      categoryBName="Tidak Polos"
      categoryADesc="Akun teridentifikasi sebagai akun polos"
      categoryBDesc="Akun teridentifikasi tidak polos"
      confirmTitle="Konfirmasi Sortir Polos"
      loadingLabel="Sedang Menyortir..."
      executeLabel="Sortir Polos Sekarang"
      placeholders={["12345678", "87654321", "11223344"]}
    />
  );
}