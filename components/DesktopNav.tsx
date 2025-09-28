"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_LINKS } from "@/components/MobileNav";
import { cn } from "@/lib/utils";

interface DesktopNavProps {
  active?: string;
}

export function DesktopNav({ active }: DesktopNavProps) {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-30 hidden border-b border-accent-cyan/20 bg-background/80 backdrop-blur lg:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5">
        <Link
          href="/dashboard"
          className="text-lg font-semibold text-white transition hover:text-accent-cyan"
        >
          MMO Match
        </Link>
        <div className="flex items-center gap-1">
          {APP_LINKS.map((link) => {
            const isActive =
              active === link.label.toLowerCase() || pathname.startsWith(link.href);

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
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
