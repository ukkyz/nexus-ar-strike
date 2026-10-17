import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexusAR Strike · AR Team FPS",
  description:
    "Android AR first-person shooter with Wi-Fi hotspot team play, Gaussian splat scene enhancement and a progressive auto-tracking minimap.",
  applicationName: "NexusAR Strike",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "NexusAR Strike",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#04070d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#04070d] text-slate-100 antialiased">{children}</body>
    </html>
  );
}
