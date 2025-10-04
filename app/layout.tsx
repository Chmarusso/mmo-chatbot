import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { getOrCreateProfile } from "@/lib/profile";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "MMO Match",
  description: "Find your next MMO fireteam with real-time matching and chat.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let theme = "system";

  try {
    const cookieStore = await cookies();
    if (cookieStore.get("session")) {
      const profile = await getOrCreateProfile();
      theme = profile.theme || "system";
      console.log("Layout: User theme from DB:", theme);
    }
  } catch (error) {
    console.log("Layout: No user session, using system theme");
  }

  console.log("Layout: Passing theme to Providers:", theme);

  return (
    <html lang="en">
      <body className="bg-background font-sans">
        <Providers theme={theme}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
