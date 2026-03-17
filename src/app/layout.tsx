import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "sonner";

import { CsrfBootstrap } from "@/components/auth/csrf-bootstrap";
import { SiteHeader } from "@/components/nav/site-header";
import { getCurrentUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { getLocale } from "@/lib/i18n-server";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: env.APP_NAME,
  description: "Secure parking reservation system for universities and organizations.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body
        className={`${dmSans.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <CsrfBootstrap />
        <SiteHeader user={user} locale={locale} />
        <main className="min-h-[calc(100vh-76px)]">{children}</main>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
