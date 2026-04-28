import type { Metadata } from "next";
import { Prompt, JetBrains_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const prompt = Prompt({
  variable: "--font-prompt",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "thai"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Netra-Thip · Core Portal",
  description: "Enterprise ASOC & Vulnerability Management Platform",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark">
      <body className={`${prompt.variable} ${jetbrainsMono.variable}`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
