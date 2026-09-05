"use client";

import React from "react";
import SortirCategoryView from "./SortirCategoryView";

interface SortirFamilyViewProps {
  userBalance: number;
  costPerId: number;
  onBalanceChange: () => void;
}

export default function SortirFamilyView({
  userBalance,
  costPerId = 25,
  onBalanceChange,
}: SortirFamilyViewProps) {
  return (
    <SortirCategoryView
      title="Sortir Family"
      subtitle="Memilah akun member & non-member"
      apiEndpoint="/api/sortir-family"
      userBalance={userBalance}
      costPerId={costPerId}
      onBalanceChange={onBalanceChange}
      categoryAName="Member"
      categoryBName="Bukan Member"
      categoryADesc="Akun teridentifikasi sebagai member family"
      categoryBDesc="Akun bukan member family"
      confirmTitle="Konfirmasi Sortir Family"
      loadingLabel="Sedang Menyortir..."
      executeLabel="Sortir Family Sekarang"
      placeholders={["12345678", "87654321", "11223344"]}
    />
  );
}