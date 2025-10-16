"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_LINKS } from "@/components/MobileNav";
import { cn } from "@/lib/utils";
import { useMatchBadge } from "@/components/MatchBadgeProvider";

interface DesktopNavProps {
  active?: string;
}

export function DesktopNav({ active }: DesktopNavProps) {
  const pathname = usePathname();
  const { unreadMatches } = useMatchBadge();
  const visibleLinks = APP_LINKS.filter((link) => !link.hidden);

  return (
    <nav className="sticky top-0 z-30 hidden border-b border-accent-cyan/20 bg-background/80 backdrop-blur lg:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5">
        <Link
          href="/dashboard"
          aria-label="MMOPLAYA home"
          className="flex items-center transition hover:opacity-90"
        >
          <img
            src="/mmoplaya-logo.png"
            alt="MMOPLAYA logo"
            className="h-8 w-auto"
          />
        </Link>
        <div className="flex items-center gap-1">
          {visibleLinks.map((link) => {
            const isActive =
              active === link.label.toLowerCase() || pathname.startsWith(link.href);
            const showBadge = link.href === "/matches" && unreadMatches > 0;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-accent-cyan/20 text-accent-cyan shadow-glow"
                    : "text-gray-300 hover:bg-accent-cyan/10 hover:text-white"
                )}
              >
                <span className="relative flex items-center gap-2">
                  {link.label}
                  {showBadge && (
                    <span className="flex h-5 min-w-[22px] items-center justify-center rounded-full bg-accent-pink px-2 text-[11px] font-semibold text-white shadow-[0_0_0_3px_rgba(10,12,24,0.9)]">
                      {unreadMatches > 9 ? "9+" : unreadMatches}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
