import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const brandFont = Space_Grotesk({
  variable: "--font-brand",
  subsets: ["latin"],
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Unpaid Invoice Autopilot",
  description: "Set-and-forget invoice reminders for freelancers and small agencies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${brandFont.variable} ${monoFont.variable} antialiased`}>{children}</body>
    </html>
  );
}
