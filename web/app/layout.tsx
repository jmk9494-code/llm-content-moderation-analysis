import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/ui/NavBar";
import { Footer } from "@/components/ui/Footer";
import SkipLink from "@/components/SkipLink";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { CommandPalette } from "@/components/ui/CommandPalette";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Moderation Bias - Into the Black Box',
  description: 'Tracking the political and social biases of Llama-3, GPT-4, and Claude.',
  openGraph: {
    title: 'LLM Censorship Benchmark: Live Audit',
    description: 'Tracking the political and social biases of Llama-3, GPT-4, and Claude.',
    images: [
      {
        url: 'https://llm-content-moderation-analysis.vercel.app/assets/heatmap.png',
        width: 1200,
        height: 630,
        alt: 'LLM Bias Heatmap',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LLM Censorship Benchmark: Live Audit',
    description: 'Tracking the political and social biases of Llama-3, GPT-4, and Claude.',
    images: ['https://llm-content-moderation-analysis.vercel.app/assets/heatmap.png'],
  },
};

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen bg-white text-slate-900`}
      >
        <ThemeProvider>
          <ToastProvider>
            <CommandPalette />
            <SkipLink />
            <NavBar />
            <main id="main-content" className="flex-1">
              {children}
            </main>
            <Footer />
            <Analytics />
            <SpeedInsights />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
