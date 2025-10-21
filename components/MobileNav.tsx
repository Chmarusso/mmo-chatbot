"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Joystick, UserCircle, Shield, Gamepad2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMatchBadge } from "@/components/MatchBadgeProvider";

type AppLink = {
  href: string;
  label: string;
  icon: typeof Users;
  hidden?: boolean;
  requiresInvite?: boolean;
};

export const APP_LINKS: AppLink[] = [
  { href: "/dashboard", label: "Discover", icon: Joystick },
  { href: "/matches", label: "Matches", icon: Users, requiresInvite: true },
  { href: "/games", label: "Games", icon: Gamepad2 },
  { href: "/companion", label: "Companion", icon: Sparkles, requiresInvite: true },
  { href: "/guilds", label: "Guilds", icon: Shield, hidden: true },
  { href: "/profile", label: "Profile", icon: UserCircle },
];

interface MobileNavProps {
  active?: string;
}

export function MobileNav({ active }: MobileNavProps) {
  const pathname = usePathname();
  const { unreadMatches } = useMatchBadge();

  const visibleLinks = APP_LINKS.filter((link) => !link.hidden);
  const columnClass =
    {
      3: "grid-cols-3",
      4: "grid-cols-4",
      5: "grid-cols-5",
      6: "grid-cols-6",
    }[visibleLinks.length] ?? "grid-cols-6";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 mx-auto w-full max-w-3xl rounded-t-[0.4em] border border-accent-cyan/20 bg-surface/90 backdrop-blur lg:hidden">
      <ul className={cn("grid gap-1 p-2", columnClass)}>
        {visibleLinks.map((link) => {
          const Icon = link.icon;
          const isActive =
            active === link.label.toLowerCase() || pathname.startsWith(link.href);
          const showBadge = link.href === "/matches" && unreadMatches > 0;

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "flex flex-col items-center rounded-[0.4em] px-2 py-2 text-xs transition",
                  isActive
                    ? "bg-accent-cyan/10 text-accent-cyan shadow-glow"
                    : "text-gray-400 hover:text-white"
                )}
              >
                <div className="relative mb-1">
                  <Icon size={20} />
                  {showBadge && (
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-pink px-2 text-[11px] font-semibold text-white shadow-[0_0_0_3px_rgba(10,12,24,0.9)]">
                      {unreadMatches > 9 ? "9+" : unreadMatches}
                    </span>
                  )}
                </div>
                <span className={cn("relative", showBadge && "mt-1")}>{link.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
