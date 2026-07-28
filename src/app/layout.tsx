import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { InlineScript } from "@/components/shared/inline-script";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-jb",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Deligro — Craving to doorstep",
  description:
    "Freshly made, delivered warm — usually in under 30 minutes. Deligro food delivery.",
  applicationName: "Deligro",
  appleWebApp: { capable: true, title: "Deligro", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1215" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

/* Light by default; set before paint to avoid a flash. Only an explicit saved
   choice ('light' or 'dark') overrides it — anything else falls back to light. */
const themeBootstrap = `
(function () {
  try {
    var saved = localStorage.getItem('deligro-theme');
    var theme = (saved === 'dark' || saved === 'light') ? saved : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <InlineScript html={themeBootstrap} />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
