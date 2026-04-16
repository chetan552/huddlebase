import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HuddleBase — Your Team, Organized",
  description: "A modern, all-in-one platform for managing sports teams, clubs, and leagues. Scheduling, communication, payments, and more.",
  keywords: ["team management", "sports", "scheduling", "roster", "HuddleBase"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Restore theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            if (localStorage.getItem('huddlebase-theme') === 'light')
              document.documentElement.setAttribute('data-theme', 'light');
          } catch {}
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
