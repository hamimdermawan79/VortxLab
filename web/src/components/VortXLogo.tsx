import React from "react";

interface VortXLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "dark" | "light";
  showSubtext?: boolean;
}

export default function VortXLogo({
  className = "",
  size = "md",
  variant = "dark",
  showSubtext = false
}: VortXLogoProps) {
  const heightClass = {
    sm: "h-6",
    md: "h-7",
    lg: "h-8",
    xl: "h-9"
  }[size];

  const logoSrc = variant === "light" ? "/logo_light.png" : "/logo.png";

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <img
        src={logoSrc}
        alt="VortX"
        className={`${heightClass} w-auto object-contain drop-shadow-2xs`}
      />
    </div>
  );
}
