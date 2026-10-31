import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent Starter",
  description: "A Vercel-ready AI agent starter built with Next.js.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
