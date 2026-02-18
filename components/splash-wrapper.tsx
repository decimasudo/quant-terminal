"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { TerminalSplash } from "@/components/terminal-splash";

interface SplashWrapperProps {
  children: React.ReactNode;
}

export function SplashWrapper({ children }: SplashWrapperProps) {
  const [showSplash, setShowSplash] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const hasSeenSplash = localStorage.getItem('hasSeenSplash');
    if (hasSeenSplash) {
      setShowSplash(false);
    }
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
    localStorage.setItem('hasSeenSplash', 'true');
  };

  if (showSplash && pathname !== '/terminal') {
    return <TerminalSplash onComplete={handleSplashComplete} />;
  }

  return <>{children}</>;
}