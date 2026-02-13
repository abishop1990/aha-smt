"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Reset on pathname change
    setIsNavigating(false);
    setProgress(0);
  }, [pathname]);

  useEffect(() => {
    if (!isNavigating) return;

    // Simulate progress: fast start, slow end
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev; // Stop at 90%, complete on actual navigation
        return prev + Math.random() * 10;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isNavigating]);

  // Listen to link clicks to start progress
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (target && target.href && !target.target) {
        const url = new URL(target.href);
        // Only show progress for internal navigation
        if (url.origin === window.location.origin && url.pathname !== pathname) {
          setIsNavigating(true);
          setProgress(10);
        }
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  if (!isNavigating || progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-1 bg-primary transition-all duration-200 ease-out"
      style={{
        width: `${progress}%`,
        opacity: progress >= 90 ? 0.5 : 1,
      }}
    />
  );
}
