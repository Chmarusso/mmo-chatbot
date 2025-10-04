"use client";

import Link from "next/link";
import React, { ReactNode, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MatchBadgeProvider } from "@/components/MatchBadgeProvider";
import { DesktopNav } from "@/components/DesktopNav";
import { MobileNav } from "@/components/MobileNav";

function ThemeProvider({ children, theme: serverTheme }: { children: ReactNode; theme?: string }) {
  const [theme, setTheme] = React.useState(serverTheme || "system");

  // Listen for theme changes from localStorage
  useEffect(() => {
    const handleThemeChange = (e: CustomEvent) => {
      setTheme(e.detail);
    };

    window.addEventListener('themeChange', handleThemeChange as EventListener);

    // Check localStorage on mount
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      setTheme(storedTheme);
    }

    return () => {
      window.removeEventListener('themeChange', handleThemeChange as EventListener);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const effectiveTheme = theme || "system";

    console.log("ThemeProvider applying theme:", effectiveTheme);

    if (effectiveTheme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const applySystemTheme = () => {
        root.classList.remove("light", "dark");
        root.classList.add(mediaQuery.matches ? "dark" : "light");
        console.log("System theme applied:", mediaQuery.matches ? "dark" : "light");
      };

      applySystemTheme();
      mediaQuery.addEventListener("change", applySystemTheme);

      return () => mediaQuery.removeEventListener("change", applySystemTheme);
    } else {
      root.classList.remove("light", "dark");
      root.classList.add(effectiveTheme);
      console.log("Theme class applied:", effectiveTheme);
    }
  }, [theme]);

  return <>{children}</>;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
});

export function Providers({ children, theme }: { children: ReactNode; theme?: string }) {
  return (
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <MatchBadgeProvider>
          <div className="min-h-screen flex flex-col">
            <DesktopNav />
            <div className="flex-1 flex flex-col">{children}</div>
            <footer className="mt-4 flex items-center justify-center gap-4 px-6 pb-[calc(6rem+env(safe-area-inset-bottom))] text-xs text-gray-500 sm:pb-8">
              <Link href="/terms-of-use" className="transition hover:text-accent-cyan">
                Terms of Use
              </Link>
              <span className="text-gray-600">•</span>
              <Link href="/privacy-policy" className="transition hover:text-accent-cyan">
                Privacy Policy
              </Link>
            </footer>
            <MobileNav />
          </div>
          <Toaster
            position="bottom-center"
            toastOptions={{
              duration: 5000,
              style: {
                background: "#13172a",
                color: "#ffffff",
                borderRadius: "14px",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                boxShadow: "0 10px 35px rgba(15, 23, 42, 0.45)",
                padding: "12px 18px",
                maxWidth: "320px",
                width: "100%",
              },
            }}
            containerStyle={{
              bottom: "calc(90px + env(safe-area-inset-bottom))",
              padding: "0 16px",
            }}
          />
        </MatchBadgeProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
