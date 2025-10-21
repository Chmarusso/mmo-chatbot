import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "MMOPLAYA",
  description: "Find your next MMO fireteam with real-time matching and chat.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background font-sans">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
