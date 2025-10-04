"use client";

import { motion, useAnimation } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";

interface RouteTransitionProps {
  children: ReactNode;
  className?: string;
}

export function RouteTransition({ children, className }: RouteTransitionProps) {
  const pathname = usePathname();
  const controls = useAnimation();

  useEffect(() => {
    controls.start({ opacity: [0.94, 1], transition: { duration: 0.14, ease: "easeOut" } });
  }, [pathname, controls]);

  return (
    <motion.div initial={{ opacity: 1 }} animate={controls} className={cn(className)}>
      {children}
    </motion.div>
  );
}
