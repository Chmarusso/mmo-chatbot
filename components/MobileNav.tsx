"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Joystick, UserCircle, Settings, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export const APP_LINKS = [
  { href: "/dashboard", label: "Discover", icon: Joystick },
  { href: "/matches", label: "Matches", icon: Users },
  { href: "/guilds", label: "Guilds", icon: Shield },
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface MobileNavProps {
  active?: string;
}

export function MobileNav({ active }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 mx-auto w-full max-w-3xl rounded-t-3xl border border-accent-cyan/20 bg-surface/90 backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5 gap-1 p-2">
        {APP_LINKS.map((link) => {
          const Icon = link.icon;
          const isActive =
            active === link.label.toLowerCase() || pathname.startsWith(link.href);

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "flex flex-col items-center rounded-2xl px-2 py-2 text-xs transition",
                  isActive
                    ? "bg-accent-cyan/10 text-accent-cyan shadow-glow"
                    : "text-gray-400 hover:text-white"
                )}
              >
                <Icon size={20} className="mb-1" />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
