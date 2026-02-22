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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
