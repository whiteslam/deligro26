import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
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

/* Time-of-day aware theme: set before paint to avoid a flash.
   Auto by local time (dark 19:00–06:00) unless the user has chosen. */
const themeBootstrap = `
(function () {
  try {
    var saved = localStorage.getItem('deligro-theme');
    var theme = saved;
    if (!theme || theme === 'auto') {
      var h = new Date().getHours();
      theme = (h >= 19 || h < 6) ? 'dark' : 'light';
    }
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
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
